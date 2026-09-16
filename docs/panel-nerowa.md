# Panel de Nerowa — diseño

> Documento de diseño de la fase 7, escrito en la sesión 10 (2026-09-15) antes de
> tocar una sola línea de código. Sustituye y amplía la sección "Panel del dueño"
> de `docs/estructura-web.md`, que se queda como la especificación original de
> seis pantallas.
>
> **Nada de esto está construido todavía.** Es lo que se va a construir y por qué.

---

## 1. El contexto manda, y cambió

Lo que ya estaba escrito y sigue siendo cierto:

- Alfredo **no tiene computadora**. Lleva el negocio entero desde el teléfono.
- Tiene **poco tiempo** y **ningún perfil técnico**. Se perdió en el panel de
  escritorio de Stripe.
- No tiene a nadie que lo haga por él.

Lo que se supo en esta sesión y cambia decisiones concretas:

| Dato | Qué obliga |
|---|---|
| **Alfredo usa iPhone** | Las notificaciones web en iPhone solo existen si él instala la app en la pantalla de inicio, y Apple puede apagarlas sin avisar. No se puede depender de ellas para lo urgente. Ver §4 |
| **Envía con la agencia de correos nacional de Lituania** | La operación es lituana: euros, IVA lituano, envíos desde Lituania a la UE. Y el seguimiento de envíos se integra distinto que con un courier privado. Ver §6.4 y §12.5 |
| **Adrián monitorea, Alfredo opera** | Son dos trabajos distintos, no dos copias del mismo panel. Ver §5 |
| **Los estuches se fabrican en China y se importan a Vilnius** | El costo de un estuche no es el precio de fábrica: el lote actual salió a 24 € en fábrica y a **34 € puesto en Vilnius**. El panel calcula el costo **por lote de importación**, no con un número fijo. Ver `docs/economia-nerowa.md` |
| **Alfredo está despachando solo y a veces no le da el tiempo** | Este es **el problema real que el panel tiene que resolver**. No es "llevar control": es que ningún pedido se quede parado sin que alguien se entere. Ver §4.3 |

**La prueba de aceptación no se toca:** si Alfredo no puede pegar un número de
seguimiento y marcar un pedido como enviado en **menos de quince segundos**, de
pie, con una mano, sin preguntarle nada a nadie, el panel está mal diseñado.

---

## 2. Sobre "copiemos el panel de Shopify"

**De Shopify hay que copiar QUÉ mide, no CÓMO lo muestra.**

El panel de Shopify está pensado para una pantalla grande, un negocio con cientos
de pedidos y alguien que se sienta a administrarlo. Tiene barra lateral, filtros,
vistas guardadas, columnas configurables. Puesto en el iPhone de Alfredo mientras
empaqueta, eso es exactamente el panel de Stripe en el que ya se perdió una vez.

Lo que sí vale la pena tomar prestado:

- Los **estados de un pedido** y que estén siempre a la vista.
- Que la pantalla de inicio sea **la lista de pendientes**, no un resumen bonito.
- El **detalle del pedido como la pantalla donde se trabaja**, con la acción
  principal arriba y grande.
- Medir **ventas, unidades, ticket medio y de dónde compran**.

Lo que no:

- Menús laterales y navegación en árbol.
- Pantallas que muestran diez números y ninguna acción.
- Filtros que hay que configurar antes de ver algo útil.

**El principio que manda, y que se aplica a cada pantalla del panel:** la
pantalla te dice qué hacer ahora. Una sola acción principal, del tamaño de un
pulgar. Todo lo demás, más abajo y más pequeño.

---

## 3. Cómo se entrega: aplicación instalable (PWA), no tienda de apps

**Decisión: se construye como PWA instalable ahora.** Alfredo la agrega a la
pantalla de inicio del iPhone y se abre a pantalla completa, con su ícono, sin
barra de navegador. A la vista y al uso, es una app.

**Por qué no App Store y Play desde el principio:**

| | PWA | Nativa en tiendas |
|---|---|---|
| Cuándo la tiene Alfredo | El día que esté lista | Cuando Apple la apruebe, y la primera revisión es impredecible |
| Costo anual | 0 | ~99 USD Apple + 25 USD Google, una vez |
| Corregir un error | Se sube y ya está | Se sube y se espera aprobación |
| Notificaciones | Ver §4 — con matices en iPhone | Mejores, sin matices |

Apple además rechaza con frecuencia aplicaciones que son solo un envoltorio de un
sitio web, así que llegar a la App Store no es únicamente esperar: es trabajo.

**El camino de salida está abierto y no cuesta rehacer nada.** Si las
notificaciones de iPhone dan problemas en la práctica, la misma aplicación se
envuelve con Capacitor y va a las dos tiendas conservando todo el código. La
decisión de hacerlo se toma con datos reales de uso, no ahora por si acaso.

**Dónde vive.** En el mismo repositorio, bajo `/panel`, con `robots: noindex` y
detrás de sesión. No es un segundo proyecto: comparte tipografía, color y
componentes con la tienda, y comparte la base de datos de pedidos, que es el
punto entero.

---

## 4. Notificaciones — la parte que de verdad importa

### 4.1 El problema con el iPhone, dicho sin adornos

Desde iOS 16.4 el iPhone sí acepta notificaciones de una aplicación web, **pero
solo si está instalada en la pantalla de inicio**. Si Alfredo la abre desde
Safari como una página cualquiera, no llega nada. Y si algún día borra el ícono,
las notificaciones se apagan **sin avisarle a nadie** — ni a él ni a nosotros.

Un panel cuyo único aviso de "vendiste algo" puede desaparecer en silencio no
sirve para el trabajo que tiene que hacer.

### 4.2 La solución: tres canales, uno de ellos a prueba de todo

| Canal | Para qué | Por qué |
|---|---|---|
| **Telegram** (canal principal de lo urgente) | Venta nueva, solicitud de devolución, pedido mayorista | Es una app nativa que ya vibra en el teléfono. Gratis, sin tiendas de apps, funciona igual en iPhone y Android, y **el aviso llega aunque el panel no esté instalado**. Se crea un bot de Nerowa y un grupo con ustedes dos |
| **Notificación web** (extra) | Lo mismo | Cuando funciona, lleva directo a la pantalla del pedido de un toque. Cuando no, no se pierde nada porque Telegram ya avisó |
| **Correo** (red de seguridad) | Resumen diario y avisos que se escalaron | Queda registro y se puede reenviar |

**El panel comprueba solo si las notificaciones web siguen vivas.** Si detecta que
la suscripción de Alfredo se cayó, muestra un aviso en la pantalla de inicio del
panel y le manda un mensaje por Telegram. Nada de fallos silenciosos.

> Si Telegram no les convence, el mismo hueco lo llena WhatsApp Business API,
> pero eso sí cuesta dinero por conversación y exige aprobar plantillas de
> mensaje con Meta. Telegram es gratis y se monta en una tarde.

### 4.3 Escalado: el pedido que nadie despachó

Esto es lo que resuelve el problema que planteaste — que Alfredo a veces no tiene
tiempo. No basta con avisar una vez.

| Cuándo | Qué pasa |
|---|---|
| Entra una venta | Aviso inmediato **a Alfredo** |
| Pasan 24 h sin enviarse | Segundo aviso a Alfredo, con el pedido nombrado |
| Pasan 48 h sin enviarse | Aviso **a Alfredo y a Adrián** |
| Todos los días a una hora fija | Resumen: "Tienes 3 pedidos sin enviar, el más viejo de hace 4 días" |

La hora del resumen la elige Alfredo. Si no hay nada pendiente, **no se manda
nada** — un resumen que llega todos los días diciendo "todo bien" se deja de leer
en una semana.

**Los plazos son ajustables desde Ajustes, no están escritos en el código.** Si 24 h
resulta agobiante o corto, se cambia sin tocar nada.

---

## 5. Dos personas, dos trabajos: roles

| | Alfredo — **operación** | Adrián — **dueño** |
|---|---|---|
| Pedidos, envíos, seguimiento | Sí | Sí |
| Marcar enviado / entregado | Sí | Sí |
| Aprobar una devolución y recibir el paquete | Sí | Sí |
| **Emitir el reembolso** | No | **Solo Adrián** |
| Números, márgenes, estadísticas | Resumen simple | Todo |
| Existencias, colores | Sí | Sí |
| Clientes mayoristas y precios | Ver y crear pedidos | Ver, crear y **fijar precios** |
| Ajustes del sistema | Los suyos | Todos |

**Por qué el reembolso lo confirma solo Adrián.** Es la única operación del panel
que saca dinero y no tiene vuelta atrás. Alfredo hace todo lo demás de la
devolución — la aprueba, recibe el paquete, revisa el estuche, deja una nota con
foto — y cuando marca "recibido y revisado", a Adrián le llega la solicitud con
todo hecho. A Adrián le queda un botón. No le quita autonomía a Alfredo en su
trabajo; pone dos pares de ojos sobre el dinero que sale.

**Todo cambio de estado queda registrado con quién y cuándo.** No es
desconfianza: es que dentro de tres meses, cuando un pedido aparezca raro, la
respuesta a "¿quién lo marcó enviado y a qué hora?" tiene que existir. Cuesta
casi nada construirlo ahora y es imposible reconstruirlo después.

---

## 6. Pestaña 1 — Ventas de la web

### 6.1 Qué se ve al abrir

La pantalla de inicio del panel **es esta pestaña**, siempre. Alfredo abre el
ícono y ve lo que le falta despachar. Nada de una portada de bienvenida.

```
┌─────────────────────────────┐
│  3 pedidos por enviar       │  ← si es 0, dice "Todo despachado" y se ve bien
├─────────────────────────────┤
│  ● NUEVO   #1043            │  tarjeta grande, se toca entera
│  Marta Kaz. · Vilnius       │
│  1 × Azul marino · 89 €     │
│  Hace 2 horas               │
├─────────────────────────────┤
│  ● NUEVO   #1042    ⚠ 3 días│  ← el atraso se ve, no se esconde
│  ...                        │
├─────────────────────────────┤
│  En camino (4)          ▸   │  ← plegado, no estorba
│  Entregados este mes (11) ▸ │
└─────────────────────────────┘
```

**Lo pendiente ocupa la pantalla. Lo hecho se pliega.** Un pedido entregado ya no
es trabajo, así que no compite por la atención.

### 6.2 Los estados de un pedido

```
Pagado ──▶ Enviado ──▶ Entregado ──▶ Archivado
   │           │            │
   │           │            └──▶ Devolución (§7)
   │           └──▶ Incidencia (perdido, dañado, dirección mala)
   └──▶ Cancelado (antes de enviar, con reembolso)
```

Decisiones dentro de esto:

- **No existe un estado "preparando".** Añade un toque que no le dice nada a
  nadie: el cliente no lo ve distinto y Alfredo ya sabe qué está preparando.
  Entre "pagado" y "enviado" no hay nada que registrar.
- **"Archivado" es automático:** 7 días después de entregado, el pedido se va
  solo de la vista. Un paso menos. Se puede desarchivar desde el buscador.
- **Cada cambio de estado confirma que ocurrió**, con un cambio visible en la
  tarjeta y una vibración corta. Nada se guarda en silencio.
- Un estado solo se puede saltar hacia adelante. Para volver atrás hay que tocar
  "corregir estado", que pide confirmación y deja registro. Es el botón que evita
  un desastre por un toque accidental.

### 6.3 La pantalla del pedido — la más importante de todo el panel

Es donde Alfredo pasa el tiempo. Orden de arriba a abajo, y el orden es el
diseño:

1. **El color y la cantidad, grandes.** Una muestra del color de verdad, no el
   nombre solo. Es lo primero que necesita para agarrar la caja correcta.
2. **La dirección, con un botón de copiar todo.** Un toque, al portapapeles,
   pegar en la etiqueta. Sin seleccionar texto con el dedo.
3. **Un campo para el número de seguimiento y un botón que dice ENVIAR.** Ese
   botón, y solamente ese botón: pone el pedido en enviado, manda el correo al
   cliente con el seguimiento, y avisa a Adrián. Un campo, un botón, quince
   segundos.
4. Datos del cliente, historial del pedido, notas internas. Abajo, más pequeño.

**Detalle que ahorra los quince segundos:** al tocar el campo del seguimiento, si
el portapapeles ya trae algo con forma de código de seguimiento, el panel lo
ofrece pegado. Alfredo lo copia de la app de correos y aquí solo confirma.

### 6.4 Marcar "entregado" — con Lietuvos paštas

**La meta es que Alfredo no lo marque.** El correo lituano publica seguimiento
por número, y los envíos internacionales llevan códigos con el formato estándar
de la Unión Postal Universal (los que terminan en `LT`). Eso permite consultar el
estado sin que nadie toque nada.

**El camino que propongo, en dos pasos:**

1. **Ahora:** botón manual grande, más un recordatorio a los 7 días si el pedido
   sigue en "enviado" sin que nadie lo marque. Funciona desde el día uno y no
   depende de nadie más.
2. **Después:** consulta automática del seguimiento una vez al día. Hay que
   decidir entre pedirle acceso directo al correo lituano (si dan API a clientes
   de empresa) o usar un agregador de seguimiento que ya cubra Lietuvos paštas.
   **Antes de comprometer esto hay que comprobar cobertura y precio reales** — no
   lo doy por hecho.

Cuando el seguimiento diga "entregado", el pedido se marca solo y le llega el
aviso al cliente. Alfredo se entera, no trabaja.

### 6.5 Los números — pestaña aparte, no aquí

Pediste gráficos de ganancias y estadísticas en esta misma pestaña. **Recomiendo
sacarlos de aquí**, y es la única cosa de tu lista que te propongo mover de sitio.

El motivo: esta pestaña es la cola de trabajo. Si arriba hay un gráfico bonito,
lo primero que ve Alfredo al abrir el panel corriendo ya no es lo que le falta
despachar. La pantalla deja de decirle qué hacer.

**Propuesta:** los números viven en su propia sección, a un toque desde el
encabezado de esta pestaña ("Ver números ▸"). Alfredo la abre cuando quiere;
Adrián la abre todos los días. Nadie tropieza con ella mientras empaqueta.

Qué muestra:

| Gráfico | Qué dice | Advertencia |
|---|---|---|
| Ventas por mes | Dinero entrado, barras | — |
| **Ganancia por mes** | Ingreso neto **menos** costo del lote, envío real y comisión real de Stripe. Hoy: **≈142 € por venta web**, 66–86 € por venta a tienda | Depende de que se carguen los costos en la pestaña 3, §9.3. Números en `docs/economia-nerowa.md` |
| **Recuperación del lote** | Cuánto falta para pagar el lote de importación, y cuántos estuches quedan | Es la cifra que decide cuándo pedir el lote siguiente. Con el lote actual, se paga con 24 ventas web |
| Unidades por color | Cuál se vende y cuál se queda | Es lo que decide qué mandar a producir |
| Países | Lista ordenada, no mapa | Con pocos pedidos un mapa del mundo con tres puntos es decoración. El mapa llega cuando haya volumen |
| Ticket medio y unidades por pedido | Si la gente compra de a una o de a varias | Decidió el botón "Add to cart" en su día; conviene comprobar que era cierto |

**Y una honestidad que va escrita en la propia pantalla:** con menos de unas
treinta ventas al mes, cualquier tendencia es ruido. Los primeros meses el panel
muestra **números crudos y comparación con el mes anterior**, y no dibuja líneas
de tendencia ni porcentajes de crecimiento, porque con cinco pedidos un
porcentaje miente. Las tendencias aparecen cuando hay de qué.

---

## 7. Devoluciones — respondiendo directo a tu pregunta

Preguntaste si la opción va en los correos al cliente y a quién le llega el
aviso. Sí a lo primero, y a los dos a lo segundo. El flujo completo:

### 7.1 Cómo la pide el cliente

En el correo de confirmación de envío va una línea discreta: **"¿Algún problema
con tu pedido?"**, con un enlace. Ese enlace lleva un código firmado que
identifica el pedido: **el cliente no se crea una cuenta ni recuerda una
contraseña**. Toca, y ya está dentro de su pedido.

Ahí elige entre dos caminos, y la diferencia importa mucho más de lo que parece:

| El cliente dice | Es |
|---|---|
| "Cambié de opinión / no era lo que esperaba" | **Desistimiento.** Derecho del comprador en la Unión Europea, con plazo de 14 días desde que recibe |
| "Llegó roto / llegó el color equivocado / no llegó" | **Producto defectuoso o error nuestro.** Es otra cosa, con otras reglas y otros plazos |

Se separan porque **quién paga el envío de vuelta cambia según cuál sea**, y
porque mezclarlos en un solo formulario garantiza discutir con el cliente
después. En el segundo caso el formulario pide **una foto**, que es lo que
resuelve la conversación en un mensaje en lugar de en seis.

> **Esto hay que confirmarlo con su asesor fiscal y legal en Lituania antes de
> publicar los términos.** El derecho de desistimiento de 14 días es normativa
> europea y aplica a la venta a distancia a consumidores, pero los detalles de
> quién paga el retorno dependen de **qué se le informó al cliente antes de
> comprar**. Si no se le avisa de forma clara que el retorno lo paga él, lo paga
> el vendedor. Es una línea en los términos y en el correo, y cuesta dinero
> olvidarla.

### 7.2 Quién se entera

**Los dos, desde el primer momento.** Alfredo porque la procesa, Adrián porque es
dinero saliendo. El aviso a dos personas no cuesta nada; que Alfredo esté de viaje
el día que entra una devolución y nadie conteste en cinco días, sí cuesta.

### 7.3 Los estados

```
Solicitada ──▶ Aprobada ──▶ En camino de vuelta ──▶ Recibida y revisada ──▶ Reembolsada ──▶ Archivada
     │              (Alfredo)         (cliente)            (Alfredo)          (Adrián)
     └──▶ Rechazada (con motivo escrito, obligatorio)
```

- **Aprobada:** Alfredo revisa y aprueba. Al cliente le llega la instrucción de
  devolución con la dirección y lo que tiene que hacer.
- **Recibida y revisada:** Alfredo abre el paquete, mira el estuche y deja una
  nota. Si está en buen estado, el reembolso pasa a Adrián en un toque.
- **Reembolsada:** Adrián confirma. El panel manda la orden a Stripe, que devuelve
  el dinero por donde entró, y el cliente recibe el correo. **El reembolso lo
  ejecuta Stripe, no el panel** — el panel nunca es el libro de cuentas.
- Se puede reembolsar **parcialmente** (por ejemplo, el producto sí y el envío
  no), porque ese caso va a aparecer.
- **Rechazada exige un motivo escrito.** Sin motivo, el botón no hace nada. Es lo
  que evita la discusión de dentro de dos meses.

Cada estado avisa al cliente por correo, sin que nadie escriba nada.

### 7.4 El panel de progreso que ve el cliente

Ese mismo enlace firmado le sirve al cliente para mirar en qué va su pedido o su
devolución, sin escribirle a nadie. **Es la función que más mensajes directos les
va a ahorrar**, y sale casi gratis porque los estados ya están todos.

---

## 8. Pestaña 2 — Tiendas mayoristas

### 8.1 Dentro del panel

Una lista de tiendas. Cada tienda tiene una ficha:

- **Datos de facturación:** razón social, dirección fiscal, número de IVA
  intracomunitario, país, persona de contacto, teléfono, correo.
- **Condiciones propias:** precio por unidad o descuento, pedido mínimo, forma de
  pago, plazo de pago.
- **Su historia:** cada pedido, cuántos estuches, de qué colores, cuánto se
  facturó, qué se cobró y qué está pendiente de cobro.
- **Notas ancladas:** lo que se habló con esa tienda, pegado a la tienda.

Y arriba, lo que de verdad se mira: **cuánto debe y desde cuándo.** Una tienda que
debe 800 € desde hace 50 días tiene que ser imposible de no ver.

Un pedido mayorista recorre: `Por confirmar → Confirmado → Facturado → Pagado →
Enviado → Entregado`. El cobro y el envío son cosas distintas y se siguen por
separado, porque en mayorista casi nunca pasan a la vez.

### 8.2 El portal para tiendas — sí, y así

Un enlace propio por tienda, que se manda por correo, **sin contraseña**: el
enlace lleva el código firmado, igual que el del cliente. La tienda entra y ve:

- Los colores con sus fotos, y cuáles hay disponibles de verdad.
- **Sus** precios, con sus tramos por volumen: hoy **120 € de 1 a 5, 110 € de 6 a 15, 100 € de 16 en adelante**, envío siempre aparte. Si alguna tienda tiene condiciones propias, ve las suyas y no las de otra.
- Especificaciones, medidas, materiales, qué trae la caja.
- Condiciones: pedido mínimo, plazos de entrega, forma de pago, devoluciones.
- Un formulario de pedido: cantidades por color, y enviar.

**Sin pago en línea, y es a propósito.** Las tiendas no compran con tarjeta:
piden, reciben una factura y pagan por transferencia a 30 días. Montar un segundo
checkout con Stripe sería bastante más trabajo para construir un flujo que
probablemente no usarían. Si alguna tienda quiere pagar con tarjeta, se le manda
un enlace de pago de Stripe suelto, sin construir nada.

El pedido cae en la pestaña 2 como "Por confirmar" y les llega aviso a los dos.

### 8.3 El IVA intracomunitario, que no es un detalle

Vendiendo desde Lituania a una tienda de otro país de la Unión Europea con número
de IVA válido, normalmente **la factura va sin IVA** y lo declara el comprador. A
una tienda del propio país, o a una sin número válido, se le cobra IVA.

Esto no es un matiz contable: **cambia el total de la factura**. La ficha de la
tienda debe guardar el número de IVA y si está validado, y el pedido debe dejar
constancia de cuál de los dos casos se aplicó.

Con los precios de hoy no es poca cosa: un pedido de 16 estuches son 1.600 €, y
el IVA lituano sobre eso son **336 € de diferencia** entre facturar a una tienda
de Vilnius y a una de Berlín con número válido. El desglose está en
`docs/economia-nerowa.md`, §4.3.

**Lo digo para que lo confirmen con su contador antes de emitir la primera
factura, no para que me crean a mí.** Es el tipo de cosa que se arregla barato
antes y cara después.

---

## 9. Pestaña 3 — Administración

Tal como la describiste — tareas, comunicación interna, facturas y comprobantes —
con una recomendación de forma y un añadido que la vuelve la pieza más valiosa
del panel.

### 9.1 Nada de chat

Elegiste notas ancladas y creo que es lo correcto. El motivo, escrito para que no
se reabra dentro de tres meses: **un chat interno entre dos personas que ya tienen
WhatsApp termina vacío**, y lo poco que se escriba ahí queda lejos del pedido del
que se estaba hablando.

Entonces: **cada nota va pegada a algo.** A un pedido, a una tienda, a una
devolución, a una tarea, a un documento. Cuando Alfredo abre el pedido #1043,
tiene ahí lo que se dijo del #1043. Sin buscar.

Y en esta pestaña, un único hilo: **"Lo último"**, que junta todas las notas de
todo el panel en orden, con el enlace a la cosa de la que hablan. Es un chat que
se organiza solo.

### 9.2 Tareas

Simples y con dueño: qué hay que hacer, quién, para cuándo. Tres estados:
pendiente, hecha, archivada. Una tarea con fecha vencida avisa.

Y tareas que se crean solas, que son las que se olvidan de verdad: "quedan 3
estuches azul marino", "la tienda X debe 800 € desde hace 45 días", "el pedido
#1039 lleva 12 días enviado y sin entregar".

### 9.3 Documentos y gastos — el añadido que recomiendo

Dijiste "que Alfredo pueda subir facturas de todo, comprobantes de envío". De
acuerdo, con una vuelta de tuerca:

**Que al subir un documento se pidan tres datos: cuánto, de qué fecha y de qué
tipo.** Tres campos, quince segundos, y con eso el documento deja de ser una foto
perdida en una carpeta y se convierte en un número que el panel puede sumar.

| Tipo | Ejemplo | Para qué sirve el dato |
|---|---|---|
| Importación | Factura de fábrica, flete, aduana y despacho de **cada lote** | De aquí sale el costo real por unidad — 34 € en el lote actual, no los 24 € de fábrica |
| Envío | Comprobante del correo lituano | Es el costo de ese envío, pegado a ese pedido |
| Materiales | Cajas, cinta, etiquetas | Costo del mes |
| Comisiones | Lo que se queda Stripe | Sale solo, no hay que cargarlo |
| Otros | Web, publicidad | Costo del mes |

**Y aquí se cierra el círculo con la pestaña 1:** de esos números sale la
**ganancia de verdad** del gráfico de §6.5. Sin esto, el gráfico solo puede decir
cuánto entró, no cuánto quedó — y esas dos cifras no se parecen en nada cuando el
envío internacional cuesta lo que cuesta.

Elegiste ganancia real, así que esto no es opcional: **el gráfico de ganancia
vale exactamente lo que valga la disciplina de subir los comprobantes.** El panel
ayuda todo lo que puede — cuando Alfredo marca un pedido como enviado, le
pregunta ahí mismo cuánto costó el envío, con el último importe ya sugerido. Un
toque si es el de siempre.

A fin de mes, un botón exporta todo a una hoja de cálculo con sus documentos
adjuntos. Eso es lo que se le manda al contador.

---

## 10. Lo que NO se va a construir, y por qué

| No se hace | Motivo |
|---|---|
| Cuentas de cliente en la tienda | El enlace firmado del correo resuelve lo mismo sin que nadie recuerde una contraseña |
| Chat interno suelto | §9.1 |
| Aplicación en App Store y Play | §3. Se reconsidera con datos, no ahora |
| Mapa mundial de ventas | §6.5. Es decoración hasta que haya volumen |
| Pago con tarjeta para tiendas | §8.2 |
| ~~Contraseñas~~ | **Revertido el 2026-09-16.** El enlace de un solo uso sigue siendo mejor para Alfredo, pero necesita un proveedor de correo que no existe: sin él había que enseñar el enlace en pantalla, y la pantalla decía "te acaba de llegar un enlace" cuando no salía ningún correo. Adrián se quedó esperándolo y el panel no se pudo abrir. Por ahora, **una clave compartida**; se revisa cuando haya correo. Ver `src/lib/panel/clave.ts` |
| Varios idiomas en el panel | Es para ustedes dos. En español |

---

## 11. Arquitectura propuesta

### 11.1 Las piezas

| Pieza | Propuesta | Por qué |
|---|---|---|
| Aplicación | **Next.js**, en el mismo repositorio, bajo `/panel` | Ya está montado. Comparte diseño y base de datos con la tienda, que es el punto |
| Base de datos | **Postgres gestionado con almacenamiento de archivos y autenticación incluidos** (Supabase o equivalente), en región europea | Cierra de un golpe las tres necesidades: datos, los documentos de §9.3 y el acceso. Es Postgres estándar, así que si algún día hay que mudarse, se muda |
| Consultas | Drizzle, con migraciones versionadas | El esquema cambia en el repositorio y no a mano en un panel, que es como se pierde la cuenta de qué hay en producción |
| Pagos | **Stripe**, ya decidido | Stripe es la verdad sobre el dinero. El panel la refleja, nunca la sustituye |
| Correo | Un servicio transaccional con envío desde Europa | Los correos al cliente y los enlaces de acceso |
| Aviso urgente | Bot propio de Telegram | §4.2. Gratis |
| Notificación web | VAPID, servido por nosotros | Sin terceros ni costo |
| Gráficos | Dibujados a mano en SVG | Una librería de gráficos pesa más que el resto del panel junto, para cuatro gráficos sencillos en un teléfono. Y así se ven como Nerowa, no como una plantilla |

### 11.2 Dónde viven los datos

Todo en la Unión Europea: base de datos en Fráncfort, funciones de Vercel en
Fráncfort, correo saliente desde Europa. El panel guarda nombres, direcciones y
correos de clientes europeos, así que el RGPD aplica de lleno; mantenerlo todo
en la Unión evita el capítulo entero de las transferencias internacionales.

### 11.3 Reglas que no se negocian

1. **Stripe manda sobre el dinero.** El panel escucha lo que Stripe le cuenta y
   ejecuta reembolsos contra Stripe. Nunca calcula por su cuenta cuánto se cobró.
2. **Los avisos de Stripe se procesan sin duplicar.** Stripe reintenta cuando
   duda, y un pedido no puede aparecer dos veces por eso.
3. **Todo cambio de estado se registra:** qué, quién, cuándo, desde dónde.
4. **Las acciones aguantan mala señal.** Si Alfredo marca "enviado" en un sótano
   sin cobertura, la acción se queda en cola y se manda cuando vuelva la señal.
   El botón dice qué pasó; no se queda girando ni miente diciendo que ya está.
5. **El acceso caduca.** Los enlaces firmados de clientes y tiendas tienen fecha
   de vencimiento y se pueden anular uno a uno.

---

## 12. Fases de entrega

Cada fase se mira en su propio preview de Vercel, con su propio pull request,
como todo lo demás en este proyecto.

| # | Qué sale | Qué se puede hacer al terminarla |
|---|---|---|
| **7.0** ✅ | Armazón de tres pestañas, entrar con enlace sin contraseña, instalable en el iPhone, capa de puertos y adaptadores, y la pantalla de pedidos funcionando con datos de ejemplo | **Hecha.** Se abre el preview, se entra, se despacha un pedido de punta a punta. Falta la base de datos real y el bot de Telegram, que necesitan cuentas |
| **7.1** | Pestaña 1 con **pedidos cargados a mano** | **Sirve desde ya para lo que venden hoy por mensaje directo.** Registrar la venta, pegar el seguimiento, marcar enviado |
| **7.1b** ✅ | **Base de datos de verdad** (Postgres en Supabase) | **Hecha.** Lo que se guarda se queda. Adelantada porque el almacén en memoria hacía imposible probar el panel en Vercel |
| **7.2** | Enganche con Stripe y correos automáticos | Las ventas de la web entran solas y el cliente recibe sus avisos |
| **7.3** | Escalado de avisos y resumen diario | Ningún pedido se queda parado sin que alguien se entere |
| **7.4** | Devoluciones completas, con el enlace en los correos | El cliente pide su devolución solo y el circuito se cierra |
| **7.5** | Números y gráficos, con costos | Ganancia real por mes, colores que se venden, países |
| **7.6a** ✅ | Pestaña 2 por dentro: fichas de tienda, pedidos, cobro y envío por separado | **Hecha.** Se da de alta una tienda con sus datos y condiciones, se le registran pedidos, y se ve lo que debe y desde cuándo |
| **7.6b** | El portal con enlace propio para que las tiendas pidan solas | Pendiente. Necesita los datos fiscales de la empresa |
| **7.7** | Pestaña 3 completa: tareas, notas, documentos | Cierre administrativo del mes en un botón |
| **7.8** | Existencias y reservas (pantallas D y E de la especificación original) | Avisar a quien espera un color cuando llega el lote |

**Por qué 7.1 antes que Stripe.** Es la decisión que tomaste y vale la pena dejar
escrito el motivo: el panel empieza a ser útil **antes** de que la tienda venda un
solo estuche, porque Alfredo ya está vendiendo por mensaje directo y hoy no lleva
control de eso en ninguna parte. Y cuando llegue Stripe, esos pedidos entran por
el mismo sitio sin rehacer nada.

---

## 13. Lo que cuesta al mes

| Pieza | Al empezar | Cuando haya volumen |
|---|---|---|
| Vercel | 0 € | ~20 € |
| Base de datos y archivos | 0 € | ~25 € |
| Correo transaccional | 0 € hasta unos miles de correos | ~20 € |
| Telegram | 0 € | 0 € |
| Notificaciones web | 0 € | 0 € |
| Seguimiento automático de envíos | 0 € (manual) | por confirmar, §6.4 |
| Stripe | Comisión por venta | Comisión por venta |
| **Total fijo** | **0 €** | **~65 €** |

Los primeros meses el panel no cuesta nada, y eso no es un truco: es que estos
servicios tienen niveles gratuitos con los que un negocio de este tamaño va
sobrado. Sin costo fijo de tiendas de aplicaciones, que era el otro camino.

---

## 14. Lo que hace falta de ustedes

Bloquea trabajo. Nada de esto lo puedo inventar.

| Qué | Para qué fase | Quién |
|---|---|---|
| Los 14 colores: nombre comercial y valor exacto | 7.1 — **ya bloqueaba la 2 y la 3** | Alfredo |
| ~~Precio de venta y costo de producción~~ | ~~7.1 y 7.5~~ | **Ya está** — 180 € sin IVA, 34 € puesto en Vilnius |
| **Desglose de los 1.000 €** de traer el lote: flete, arancel, IVA de importación, despacho | 7.5 | Alfredo — puede bajar el costo real de 34 € a ~28 € |
| **A nombre de quién se importó el lote actual** | 7.6 | Alfredo + asesor |
| Cuenta de Telegram de los dos, para el grupo | 7.0 | Los dos |
| Correos con los que entran al panel | 7.0 | Los dos |
| Cuenta de Stripe, en modo de prueba primero | 7.2 | Alfredo |
| Datos fiscales de la empresa en Lituania | 7.6 | Alfredo — **los define esta semana o la próxima** |
| Política de devoluciones revisada con su asesor: plazo, quién paga el retorno, en qué estado se acepta el estuche | 7.4 | Los dos + asesor |
| ~~Precios mayoristas~~ | ~~7.6~~ | **Ya están** — 120 / 110 / 100 € por tramo. Falta decidir si hay pedido mínimo |
| Confirmar si el correo lituano da acceso técnico al seguimiento para clientes de empresa | 7.3 en adelante | Alfredo |

Y lo que sigue pendiente de antes, sin cambios: el `.glb` del estuche, la textura
real del fondo, las medidas, las fotos, los músicos, las seis preguntas
frecuentes y los precios de envío por zona.

---

## 15. Preguntas que quedan abiertas

No bloquean empezar, pero hay que contestarlas antes de la fase que las toca:

1. **¿A qué hora quiere Alfredo el resumen diario?** Y si lo quiere de lunes a
   viernes o todos los días.
2. **¿Los pedidos mayoristas descuentan de las mismas existencias que la web?**
   Si se reservan estuches para una tienda, ¿siguen apareciendo disponibles?
3. **¿Se venden colores de edición limitada o todos son permanentes?** Cambia
   cómo funcionan existencias y reservas.
4. **¿Desde qué dirección exacta de Vilnius despacha Alfredo?** Ya sabemos que es
   Vilnius; falta la dirección concreta, porque es la de retorno de las
   devoluciones y aparece en un correo que ve el cliente.
5. **Precio final igual en toda la UE, o precio neto igual?** Explicado en
   `docs/economia-nerowa.md`, §3.3. Recomiendo el primero. No bloquea hasta la
   fase 5, pero conviene decidirlo antes de imprimir el precio en la tienda.
6. **¿Pedido mínimo para tiendas?** Los tramos están, el mínimo no.
7. **¿Facturan a los clientes particulares o basta el recibo de Stripe?** En
   varios países de la Unión hay que emitir factura si el cliente la pide.
8. **¿Cuántos estuches quedan del lote de 100, y de qué colores?** Es el punto de
   partida de las existencias y de la cuenta de recuperación del lote.

---

## 16. Riesgos que veo, dichos ahora

| Riesgo | Qué tan grave | Qué hacemos |
|---|---|---|
| Las notificaciones web del iPhone fallan o desaparecen | **Alto**, es el corazón del panel | Telegram como canal principal desde el día uno, y comprobación automática de que la suscripción sigue viva (§4.2) |
| Los costos no se cargan y el gráfico de ganancia queda vacío | **Alto** | El panel los pide en el momento del envío, con el importe de la última vez ya sugerido (§9.3) |
| El seguimiento del correo lituano no se puede consultar automáticamente | Medio | Manual con recordatorio. Ya funciona sin esto (§6.4) |
| La política de devoluciones se publica mal y sale caro | Medio | Revisarla con su asesor antes de la fase 7.4 (§7.1) |
| El costo real del estuche no es 34 € sino más, porque el lote 2 llegue más caro | Medio | El panel calcula por lote, no con un número fijo (§9.3). Un lote caro no ensucia el histórico |
| El panel crece hasta parecerse a Stripe y Alfredo se pierde otra vez | **Alto, y es el que más me preocupa** | La prueba de los quince segundos se vuelve a pasar en cada fase. Si una pantalla nueva la rompe, la pantalla nueva está mal |

---

**Los números del negocio — costos, precios, márgenes y recuperación del lote —
viven en `docs/economia-nerowa.md`.** Este documento dice cómo se muestran; aquél,
de dónde salen.

---

## 17. Lo que está construido (sesión 10)

La fase 7.0 está en el código. Lo que existe y funciona:

| Pieza | Dónde |
|---|---|
| Dinero en céntimos enteros, IVA, márgenes, coste por lote | `src/lib/panel/dominio/` |
| La máquina de estados de un pedido, en un solo sitio | `dominio/estados.ts` |
| **Los puertos**: almacén, correo, avisos, archivos | `puertos/` |
| Los adaptadores de hoy: memoria y consola | `adaptadores/` |
| **El único archivo que decide qué proveedor se usa** | `servicios.ts` |
| Entrar con enlace de un solo uso, sesión de 3 meses | `sesion.ts` |
| Las pantallas | `src/app/panel/` |
| 17 comprobaciones de la aritmética | `npm run pruebas` |

### Cómo se cambia de base de datos, que era el requisito de Adrián

Tres pasos, y no hay un cuarto:

1. Se escribe `adaptadores/almacen-postgres.ts` implementando la interfaz `Almacen`.
2. Se añade su caso al `switch` de `servicios.ts`.
3. Se pone `PANEL_ALMACEN=postgres` en Vercel.

Ninguna pantalla, ningún formulario y ninguna acción importa un proveedor:
todos piden `servicios()` y reciben interfaces. **Si algún día hiciera falta
tocar una pantalla para cambiar de proveedor, el puerto estaría mal diseñado y
lo que habría que arreglar es el puerto.** Lo mismo vale para el correo, los
avisos y el almacenamiento de archivos.

### Tres fallos que aparecieron mirando, no leyendo

Los tres pasaban el typecheck, el lint y el build:

1. **El botón "Marcar enviado" quedaba fuera de pantalla.** Medido: caía en
   y=641 de un iPhone de 664 px de alto. Había que bajar para verlo, que es
   exactamente lo que la prueba de los quince segundos no puede permitir. Se
   ancló el botón abajo y se compactó el bloque de dirección.
2. **La muestra del color negro desaparecía.** `#111` sobre la tarjeta
   `#17171a` no se distinguía: no se veía de qué color era el pedido. Anillo más
   grueso y más claro.
3. **La confirmación de "marcado enviado" no se veía nunca.** La acción ocurría,
   pero al revalidar el formulario dejaba de dibujarse y se llevaba el mensaje
   consigo — el "guardar en silencio" que la especificación prohíbe. Ahora la
   confirmación viaja en la URL y sobrevive al cambio de estado.

### Lo que hace falta para la fase 7.1

- Cuenta de base de datos (Postgres con almacenamiento de archivos).
- Los 14 colores reales, que ya bloqueaban las fases 2 y 3.
- Cuentas de Telegram de los dos, para el grupo de avisos.

---

*Escrito en la sesión 10. La fase 7.0 está construida y verificada en el
navegador; el resto del documento sigue siendo diseño a la espera de aprobación.*
