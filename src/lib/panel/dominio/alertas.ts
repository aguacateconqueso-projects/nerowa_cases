/*
  Que hay que avisar, a quien, y con que urgencia.

  Es EL problema que el panel existe para resolver, dicho en
  `docs/panel-nerowa.md` §1: "ningun pedido se queda parado sin que alguien se
  entere". Alfredo despacha solo y a veces no le da el tiempo; el panel no
  puede quedarse callado esperando a que lo abra.

  COMO ESTA HECHO, Y POR QUE ASI

  Esto es una funcion pura: recibe el estado del negocio y la hora, y devuelve
  la lista de alertas que corresponden AHORA. No manda nada, no guarda nada y
  no sabe de Telegram. Asi:

  - La franja de avisos del panel y el mensaje de Telegram salen del mismo
    calculo. No pueden discrepar: lo que vibra en el telefono es lo que se ve
    al abrir.
  - Se prueba con fechas inventadas, sin esperar 48 horas de verdad.

  Quien la usa para mandar mensajes es `src/lib/panel/vigia.ts`, y lo que
  evita que el mismo aviso salga dos veces es la `clave` de cada alerta: dice
  QUE se aviso ("pedido 1041, escalado"), no cuando. Una alerta con una clave
  ya enviada no se vuelve a mandar, aunque siga en la lista.
*/

import type { AjustesPanel } from "./ajustes";
import { type ExistenciasColor } from "./existencias";
import { deudaDe, totalesDe } from "./mayorista";
import { describirEspera, horasDesde } from "./tiempo";
import type { Color, Pedido, PedidoMayorista, Rol, Tienda } from "./tipos";
import { formatearEuros } from "./dinero";

export type TipoAlerta =
  | "pedido_escalado"
  | "pedido_recordatorio"
  | "pedido_incidencia"
  | "pedido_sin_entregar"
  | "pedido_sin_recibo"
  | "existencias_faltan"
  | "existencias_agotadas"
  | "existencias_bajas"
  | "existencias_sin_conteo"
  | "mayorista_sin_confirmar"
  | "factura_vencida";

/**
 * "urgente": hace sonar el telefono. "normal": llega en silencio y se lee al
 * abrir. Es la misma distincion del puerto de avisos, escrita aqui otra vez
 * porque el dominio no importa puertos.
 */
export type GravedadAlerta = "urgente" | "normal";

export interface Alerta {
  /** Que se aviso, estable entre revisiones. Ver arriba. */
  clave: string;
  tipo: TipoAlerta;
  gravedad: GravedadAlerta;
  /** A que roles les llega. */
  para: readonly Rol[];
  titulo: string;
  cuerpo: string;
  /** Ruta del panel que abre la alerta. */
  enlace: string;
  /** Para ordenar: lo mas grave arriba. */
  peso: number;
}

const OPERACION: readonly Rol[] = ["operacion"];

/** Cuanto se espera antes de recordar que falta la foto del recibo. */
export const HORAS_PARA_PEDIR_RECIBO = 6;
const LOS_DOS: readonly Rol[] = ["operacion", "dueno"];

const PESO: Record<TipoAlerta, number> = {
  existencias_faltan: 100,
  pedido_escalado: 90,
  mayorista_sin_confirmar: 80,
  pedido_incidencia: 75,
  existencias_agotadas: 70,
  pedido_recordatorio: 60,
  factura_vencida: 50,
  pedido_sin_entregar: 40,
  pedido_sin_recibo: 35,
  existencias_bajas: 30,
  existencias_sin_conteo: 20,
};

export interface EntradaAlertas {
  pedidos: readonly Pedido[];
  mayoristas: readonly PedidoMayorista[];
  tiendas: readonly Tienda[];
  colores: readonly Color[];
  existencias: readonly ExistenciasColor[];
  /** Si alguien conto el estante alguna vez. Sin conteo no hay "agotado". */
  conConteo: boolean;
  /** Los pedidos (de la web o de tienda) que ya tienen foto del recibo. */
  conRecibo: ReadonlySet<string>;
  ajustes: AjustesPanel;
  ahora: number;
}

/** "2 × Black, Gold". Lo que hay que ir a buscar, en una linea. */
function queLleva(lineas: Pedido["lineas"], colores: ReadonlyMap<string, Color>): string {
  const unidades = lineas.reduce((n, l) => n + l.cantidad, 0);
  const nombres = lineas.map((l) => colores.get(l.colorId)?.nombre ?? l.colorId);
  return `${unidades} × ${nombres.join(", ")}`;
}

function enDias(horas: number): string {
  /* "Hace 3 dias" -> "3 dias". Mismo texto que la tarjeta, sin el "hace". */
  return describirEspera(horas).replace(/^Hace /, "");
}

export function calcularAlertas(e: EntradaAlertas): Alerta[] {
  const alertas: Alerta[] = [];
  const colores = new Map(e.colores.map((c) => [c.id, c]));
  const a = e.ajustes;

  const anadir = (al: Omit<Alerta, "peso">) => alertas.push({ ...al, peso: PESO[al.tipo] });

  /* --- Pedidos de la web y a mano ------------------------------------- */

  for (const p of e.pedidos) {
    const enlace = `/panel/pedido/${p.id}`;
    const quien = `${p.clienteNombre}, ${p.direccion.ciudad} (${p.direccion.pais})`;

    if (p.estado === "pagado") {
      const horas = horasDesde(p.pagadoEn, e.ahora);
      /*
        Solo uno de los dos: si ya toca escalar, el recordatorio sobra. Y si la
        revision llega tarde —el panel nadie lo abrio en tres dias— sale
        directamente el escalado, que es lo que corresponde a esa hora.
      */
      if (horas >= a.horasEscalada) {
        anadir({
          clave: `pedido:${p.id}:escalada`,
          tipo: "pedido_escalado",
          gravedad: "urgente",
          para: LOS_DOS,
          titulo: `#${p.numero} lleva ${enDias(horas)} sin enviar`,
          cuerpo: `${queLleva(p.lineas, colores)} para ${quien}.`,
          enlace,
        });
      } else if (horas >= a.horasRecordatorio) {
        anadir({
          clave: `pedido:${p.id}:recordatorio`,
          tipo: "pedido_recordatorio",
          gravedad: "urgente",
          para: OPERACION,
          titulo: `#${p.numero} sigue sin enviar`,
          cuerpo: `${queLleva(p.lineas, colores)} para ${quien}. Entro ${describirEspera(horas).toLowerCase()}.`,
          enlace,
        });
      }
    }

    if (p.estado === "incidencia") {
      anadir({
        clave: `pedido:${p.id}:incidencia`,
        tipo: "pedido_incidencia",
        gravedad: "urgente",
        para: LOS_DOS,
        titulo: `#${p.numero} tiene una incidencia abierta`,
        cuerpo: `${queLleva(p.lineas, colores)} para ${quien}. Hay que resolverla con el cliente o con el correo.`,
        enlace,
      });
    }

    if (p.estado === "enviado" && p.enviadoEn) {
      const horas = horasDesde(p.enviadoEn, e.ahora);
      if (horas >= a.diasSinEntregar * 24) {
        anadir({
          clave: `pedido:${p.id}:sin-entregar`,
          tipo: "pedido_sin_entregar",
          gravedad: "normal",
          para: OPERACION,
          titulo: `#${p.numero} lleva ${enDias(horas)} en camino`,
          cuerpo:
            `Si ya llego, marcalo entregado. Si no, revisa el seguimiento` +
            (p.seguimiento ? ` ${p.seguimiento}.` : "."),
          enlace,
        });
      }
    }
  }

  /*
    --- Enviados sin foto del recibo ---

    Alfredo tiene que subir el recibo de cada envio. Se le recuerda pasadas
    unas horas —no al instante: puede que lo suba en cuanto llegue a casa—, y
    una sola vez por pedido. Los archivados ya no, que son historia.
  */
  const sinRecibo = (id: string, enviadoEn: string | undefined) =>
    !e.conRecibo.has(id) && enviadoEn !== undefined && horasDesde(enviadoEn, e.ahora) >= HORAS_PARA_PEDIR_RECIBO;

  for (const p of e.pedidos) {
    if ((p.estado === "enviado" || p.estado === "entregado") && sinRecibo(p.id, p.enviadoEn)) {
      anadir({
        clave: `pedido:${p.id}:sin-recibo`,
        tipo: "pedido_sin_recibo",
        gravedad: "normal",
        para: OPERACION,
        titulo: `#${p.numero}: falta la foto del recibo`,
        cuerpo: `Enviado a ${p.clienteNombre}. Sube la foto del recibo del correo desde el pedido.`,
        enlace: `/panel/pedido/${p.id}`,
      });
    }
  }
  for (const p of e.mayoristas) {
    if (p.estado !== "cancelado" && p.envio !== "sin_enviar" && sinRecibo(p.id, p.enviadoEn)) {
      anadir({
        clave: `mayorista:${p.id}:sin-recibo`,
        tipo: "pedido_sin_recibo",
        gravedad: "normal",
        para: OPERACION,
        titulo: `Tienda #${p.numero}: falta la foto del recibo`,
        cuerpo: "Sube la foto del recibo del correo desde el pedido de la tienda.",
        enlace: `/panel/tiendas/pedido/${p.id}`,
      });
    }
  }

  /* --- Existencias ------------------------------------------------------ */

  if (!e.conConteo) {
    /*
      Sin conteo todos los colores salen a cero. Eso no es "agotado", es "no se
      sabe", y se dice una vez y bien, en vez de catorce avisos falsos.
    */
    anadir({
      clave: "existencias:sin-conteo",
      tipo: "existencias_sin_conteo",
      gravedad: "normal",
      para: LOS_DOS,
      titulo: "Falta contar los estuches",
      cuerpo:
        "El panel no sabe cuantas cajas hay de cada color. Cuentalas una vez y desde ahi lleva la cuenta solo.",
      enlace: "/panel/existencias/contar",
    });
  } else {
    for (const ex of e.existencias) {
      if (!ex.color.activo) continue;
      /*
        La clave lleva la ultima reposicion: el aviso de "quedan pocas" sale
        una vez por cada vez que el color baja, y vuelve a salir si se repone y
        vuelve a bajar. Sin eso, o se repite en cada revision, o sale una sola
        vez en la vida.
      */
      const tanda = ex.ultimaReposicionId ?? "inicial";
      const nombre = ex.color.nombre;

      if (ex.faltan > 0) {
        anadir({
          clave: `existencias:${ex.color.id}:faltan:${tanda}:${ex.faltan}`,
          tipo: "existencias_faltan",
          gravedad: "urgente",
          para: LOS_DOS,
          titulo: `Faltan ${ex.faltan} ${nombre} para servir lo vendido`,
          cuerpo: `Hay ${ex.enEstante} en el estante y ${ex.comprometidas} vendidos sin enviar.`,
          enlace: "/panel/existencias",
        });
      } else if (ex.nivel === "agotado") {
        anadir({
          clave: `existencias:${ex.color.id}:agotado:${tanda}`,
          tipo: "existencias_agotadas",
          /*
            Silencioso a proposito. Agotado sin nada vendido no es una
            emergencia: no hay ningun cliente esperando. Lo urgente es haber
            vendido lo que no esta, y eso es el caso de arriba. El primer dia,
            con varios colores sin una sola caja, esto evita que el telefono
            suene siete veces seguidas por algo que ya se sabia.
          */
          gravedad: "normal",
          para: LOS_DOS,
          titulo: `${nombre}: agotado`,
          cuerpo:
            ex.comprometidas > 0
              ? `Las ${ex.comprometidas} que quedan ya estan vendidas.`
              : "No queda ninguna caja para vender.",
          enlace: "/panel/existencias",
        });
      } else if (ex.nivel === "bajo") {
        anadir({
          clave: `existencias:${ex.color.id}:bajo:${tanda}`,
          tipo: "existencias_bajas",
          gravedad: "normal",
          para: LOS_DOS,
          titulo: `${nombre}: ${ex.disponibles === 1 ? "queda 1" : `quedan ${ex.disponibles}`}`,
          cuerpo: "Es momento de pensar en reponer este color.",
          enlace: "/panel/existencias",
        });
      }
    }
  }

  /* --- Tiendas ---------------------------------------------------------- */

  const tiendas = new Map(e.tiendas.map((t) => [t.id, t]));

  for (const p of e.mayoristas) {
    if (p.estado !== "por_confirmar") continue;
    const horas = horasDesde(p.creadoEn, e.ahora);
    if (horas < a.horasMayoristaSinConfirmar) continue;
    const tienda = tiendas.get(p.tiendaId);
    const unidades = p.lineas.reduce((n, l) => n + l.cantidad, 0);
    anadir({
      clave: `mayorista:${p.id}:sin-confirmar`,
      tipo: "mayorista_sin_confirmar",
      gravedad: "urgente",
      para: LOS_DOS,
      titulo: `${tienda?.nombre ?? "Una tienda"} espera respuesta`,
      cuerpo: `Pedido #${p.numero}, ${unidades} estuches, sin confirmar desde hace ${enDias(horas)}.`,
      enlace: `/panel/tiendas/pedido/${p.id}`,
    });
  }

  for (const tienda of e.tiendas) {
    const suyos = e.mayoristas.filter((p) => p.tiendaId === tienda.id);
    const deuda = deudaDe(suyos, tienda, e.ahora);
    if (!deuda.vencida) continue;

    /* La factura mas vieja sin cobrar da nombre a la clave: si se cobra esa y
       la siguiente tambien vence, es un aviso nuevo. */
    const masVieja = suyos
      .filter((p) => p.estado === "confirmado" && p.cobro === "facturado" && p.facturadoEn)
      .sort((x, y) => x.facturadoEn!.localeCompare(y.facturadoEn!))[0];

    anadir({
      clave: `tienda:${tienda.id}:vencida:${masVieja?.id ?? "?"}`,
      tipo: "factura_vencida",
      gravedad: "normal",
      para: LOS_DOS,
      titulo: `${tienda.nombre} debe ${formatearEuros(deuda.importe, { decimales: false })}`,
      cuerpo:
        `La factura mas vieja tiene ${deuda.diasDelMasViejo} dias y el plazo era de ${tienda.plazoPagoDias}.` +
        (masVieja ? ` Pedido #${masVieja.numero}, ${formatearEuros(totalesDe(masVieja).total)}.` : ""),
      enlace: `/panel/tiendas/${tienda.id}`,
    });
  }

  return alertas.sort((x, y) => y.peso - x.peso);
}

/** Las que le tocan a una persona segun su trabajo. */
export function alertasPara(alertas: readonly Alerta[], rol: Rol): Alerta[] {
  return alertas.filter((al) => al.para.includes(rol));
}

/* --------------------------------------------------------------------------
   El resumen diario
   -------------------------------------------------------------------------- */

export interface Resumen {
  titulo: string;
  cuerpo: string;
}

/**
 * "Tienes 3 pedidos sin enviar, el mas viejo de hace 4 dias."
 *
 * Si no hay nada pendiente devuelve `undefined` y NO se manda nada: un resumen
 * que llega todos los dias diciendo "todo bien" se deja de leer en una semana,
 * y entonces tampoco se lee el dia que importa. Ver `docs/panel-nerowa.md` §4.3.
 */
export function resumenDiario(
  pedidos: readonly Pedido[],
  alertas: readonly Alerta[],
  ahora: number,
): Resumen | undefined {
  const porEnviar = pedidos.filter((p) => p.estado === "pagado" || p.estado === "incidencia");
  const lineas: string[] = [];

  if (porEnviar.length > 0) {
    const masViejo = Math.max(...porEnviar.map((p) => horasDesde(p.pagadoEn, ahora)));
    lineas.push(
      porEnviar.length === 1
        ? `Tienes 1 pedido sin enviar, de ${describirEspera(masViejo).toLowerCase()}.`
        : `Tienes ${porEnviar.length} pedidos sin enviar, el mas viejo de ${describirEspera(masViejo).toLowerCase()}.`,
    );
  }

  const cuenta = (tipos: TipoAlerta[]) => alertas.filter((al) => tipos.includes(al.tipo)).length;

  const tiendas = cuenta(["mayorista_sin_confirmar"]);
  if (tiendas > 0) {
    lineas.push(tiendas === 1 ? "1 tienda espera respuesta." : `${tiendas} tiendas esperan respuesta.`);
  }
  const agotados = cuenta(["existencias_agotadas", "existencias_faltan"]);
  if (agotados > 0) {
    lineas.push(agotados === 1 ? "1 color agotado." : `${agotados} colores agotados.`);
  }
  const bajos = cuenta(["existencias_bajas"]);
  if (bajos > 0) {
    lineas.push(bajos === 1 ? "1 color con pocas cajas." : `${bajos} colores con pocas cajas.`);
  }
  const deudas = cuenta(["factura_vencida"]);
  if (deudas > 0) {
    lineas.push(deudas === 1 ? "1 tienda con la factura vencida." : `${deudas} tiendas con facturas vencidas.`);
  }

  if (lineas.length === 0) return undefined;
  return { titulo: "Lo pendiente de hoy", cuerpo: lineas.join("\n") };
}
