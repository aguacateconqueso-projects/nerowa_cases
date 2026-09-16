/*
  El SQL de las migraciones.

  Esta ES la fuente, no una copia. Al principio el SQL vivia en un `.sql` de al
  lado y esto era su duplicado para el empaquetado; se descarto en cuanto se
  escribio, porque dos copias del mismo SQL es exactamente la clase de cosa que
  se desincroniza y nadie se entera hasta que una migracion hace algo distinto
  de lo que dice el archivo que alguien reviso.

  Va en un `.ts` y no se lee del disco porque en Vercel las funciones se
  empaquetan y un `readFileSync` de un `.sql` suelto no encuentra nada.

  REGLAS PARA ANADIR UNA MIGRACION

  - Nunca se edita una que ya corrio: se anade otra. Las que ya estan aplicadas
    no vuelven a ejecutarse, asi que cambiarlas no cambia ninguna base existente
    y deja el codigo mintiendo sobre lo que hay.
  - Los comentarios van con comillas simples, no invertidas: una comilla
    invertida cerraria el texto.
*/

export const SQL_001_INICIAL = String.raw`
-- Esquema inicial del panel de Nerowa.
--
-- Reglas que rigen todo el archivo:
--
-- 1. EL DINERO VA EN 'bigint' DE CENTIMOS. Nunca 'float', nunca 'money'. Es la
--    misma regla que en el codigo: 0,1 + 0,2 no da 0,3 en coma flotante, y un
--    panel que suma lineas de pedido termina descuadrado por centimos que nadie
--    sabe de donde salieron. 'numeric' seria exacto pero obliga a convertir en
--    los dos sentidos; con enteros, lo que entra es lo que sale.
--
-- 2. LAS FECHAS VAN EN 'timestamptz', siempre en UTC. Se formatean al mostrar,
--    con la zona de Vilnius, nunca al guardar.
--
-- 3. LOS ESTADOS SON 'text' CON 'check', no 'enum' de Postgres. Anadir un valor
--    a un enum exige una migracion que bloquea la tabla; con un 'check' es
--    cambiar la restriccion. Los estados de este panel van a cambiar.
--
-- 4. LO QUE YA PASO NO SE BORRA. No hay 'on delete cascade' hacia los pedidos:
--    una tienda se desactiva, no se borra, porque sus pedidos son historia y la
--    historia no se tira.

create table if not exists usuarios (
  id          text primary key,
  nombre      text not null,
  correo      text not null unique,
  rol         text not null check (rol in ('operacion', 'dueno')),
  telegram_chat_id text,
  creado_en   timestamptz not null default now()
);

create table if not exists colores (
  id      text primary key,
  nombre  text not null,
  hex     text not null,
  activo  boolean not null default true
);

create table if not exists lotes (
  id               text primary key,
  referencia       text not null,
  llegada_en       timestamptz not null,
  unidades         integer not null check (unidades > 0),
  -- Los cuatro conceptos de traer el lote van por separado y no en un saco,
  -- porque el IVA de importacion se recupera si la empresa esta registrada y
  -- los otros tres no. Ver docs/economia-nerowa.md §2.2.
  factura_fabrica  bigint not null default 0,
  flete            bigint not null default 0,
  aranceles        bigint not null default 0,
  iva_importacion  bigint not null default 0,
  despacho         bigint not null default 0,
  iva_recuperable  boolean not null default false,
  notas            text
);

create table if not exists tiendas (
  id                   text primary key,
  nombre               text not null,
  razon_social         text,
  numero_iva           text,
  -- Un numero sin comprobar no cuenta como valido: se le cobra el IVA, que es
  -- el lado seguro. Cobrarlo de mas se devuelve; no cobrarlo lo paga la empresa.
  iva_validado         boolean not null default false,
  direccion            jsonb not null,
  contacto_nombre      text,
  contacto_correo      text,
  contacto_telefono    text,
  precio_personalizado bigint,
  plazo_pago_dias      integer not null default 30 check (plazo_pago_dias between 0 and 365),
  notas                text,
  activa               boolean not null default true,
  creada_en            timestamptz not null default now()
);

create table if not exists pedidos (
  id                       text primary key,
  numero                   integer not null unique,
  origen                   text not null check (origen in ('web', 'manual', 'mayorista')),
  estado                   text not null check (
    estado in ('pagado', 'enviado', 'entregado', 'archivado', 'cancelado', 'incidencia')
  ),
  cliente_nombre           text not null,
  cliente_correo           text not null,
  direccion                jsonb not null,
  -- Las lineas van en jsonb y no en tabla aparte a proposito: se escriben una
  -- vez con el pedido, se leen siempre enteras y nunca se consultan sueltas.
  -- Una tabla hija aqui serian dos consultas para no ganar nada.
  lineas                   jsonb not null,
  envio_cobrado            bigint not null default 0,
  tipo_iva                 integer not null,
  stripe_total_cobrado     bigint,
  stripe_comision          bigint,
  stripe_payment_intent_id text,
  envio_coste              bigint,
  seguimiento              text,
  pagado_en                timestamptz not null,
  enviado_en               timestamptz,
  entregado_en             timestamptz,
  archivado_en             timestamptz,
  tienda_id                text references tiendas (id),
  nota_interna             text
);

-- La pantalla de inicio pide "lo pendiente, lo mas viejo primero" en cada carga.
create index if not exists pedidos_estado_pagado_en on pedidos (estado, pagado_en);

create table if not exists pedidos_mayoristas (
  id                  text primary key,
  numero              integer not null unique,
  tienda_id           text not null references tiendas (id),
  -- Tres pistas y no un estado lineal: en mayorista el cobro y el envio casi
  -- nunca pasan a la vez. Ver src/lib/panel/dominio/mayorista.ts.
  estado              text not null check (estado in ('por_confirmar', 'confirmado', 'cancelado')),
  cobro               text not null check (cobro in ('sin_facturar', 'facturado', 'pagado')),
  envio               text not null check (envio in ('sin_enviar', 'enviado', 'entregado')),
  lineas              jsonb not null,
  envio_cobrado       bigint not null default 0,
  envio_coste         bigint,
  regimen_iva         text not null check (
    regimen_iva in ('nacional', 'intracomunitario', 'sin_numero_valido', 'exportacion')
  ),
  tipo_iva            integer not null,
  creado_en           timestamptz not null,
  confirmado_en       timestamptz,
  facturado_en        timestamptz,
  pagado_en           timestamptz,
  enviado_en          timestamptz,
  entregado_en        timestamptz,
  referencia_factura  text,
  seguimiento         text,
  notas               text
);

create index if not exists pedidos_mayoristas_tienda on pedidos_mayoristas (tienda_id, creado_en desc);
-- Lo que deben se calcula sobre los facturados y sin cobrar.
create index if not exists pedidos_mayoristas_cobro on pedidos_mayoristas (cobro, facturado_en);

create table if not exists apuntes (
  id         text primary key,
  entidad    text not null,
  entidad_id text not null,
  accion     text not null,
  usuario_id text not null references usuarios (id),
  detalle    text not null,
  creado_en  timestamptz not null default now()
);

create index if not exists apuntes_entidad on apuntes (entidad, entidad_id, creado_en desc);
`;
