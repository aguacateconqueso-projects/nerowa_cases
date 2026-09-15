/*
  La maquina de estados de un pedido, en un solo sitio.

  Que este aqui y no repartido por las pantallas es lo que evita el desastre por
  un toque accidental: una transicion que no este en esta tabla no ocurre, la
  pida quien la pida y desde donde la pida.

  Ver `docs/panel-nerowa.md` §6.2.
*/

import type { EstadoPedido, Rol } from "./tipos";

export interface Transicion {
  desde: EstadoPedido;
  hacia: EstadoPedido;
  /** Lo que dice el boton. En espanol: lo lee Alfredo, no el cliente. */
  etiqueta: string;
  /** Si hace falta escribir algo para que la transicion valga. */
  requiere?: "seguimiento" | "motivo";
  /** Quien puede hacerla. Vacio: cualquiera de los dos. */
  soloRol?: Rol;
  /** Si retrocede. Estas piden confirmacion y se anotan aparte. */
  correctiva?: boolean;
}

export const TRANSICIONES: readonly Transicion[] = [
  { desde: "pagado", hacia: "enviado", etiqueta: "Marcar enviado", requiere: "seguimiento" },
  { desde: "pagado", hacia: "cancelado", etiqueta: "Cancelar pedido", requiere: "motivo", soloRol: "dueno" },
  { desde: "enviado", hacia: "entregado", etiqueta: "Marcar entregado" },
  { desde: "enviado", hacia: "incidencia", etiqueta: "Reportar incidencia", requiere: "motivo" },
  { desde: "incidencia", hacia: "enviado", etiqueta: "Incidencia resuelta" },
  { desde: "incidencia", hacia: "entregado", etiqueta: "Marcar entregado" },
  { desde: "entregado", hacia: "archivado", etiqueta: "Archivar" },

  /* Las de vuelta atras. Piden confirmacion y dejan constancia de quien fue. */
  { desde: "enviado", hacia: "pagado", etiqueta: "Corregir: no estaba enviado", correctiva: true },
  { desde: "entregado", hacia: "enviado", etiqueta: "Corregir: no estaba entregado", correctiva: true },
  { desde: "archivado", hacia: "entregado", etiqueta: "Desarchivar", correctiva: true },
] as const;

export function transicionesDesde(
  estado: EstadoPedido,
  rol: Rol,
): Transicion[] {
  return TRANSICIONES.filter(
    (t) => t.desde === estado && (!t.soloRol || t.soloRol === rol),
  );
}

export function puedeTransitar(
  desde: EstadoPedido,
  hacia: EstadoPedido,
  rol: Rol,
): Transicion | undefined {
  return transicionesDesde(desde, rol).find((t) => t.hacia === hacia);
}

/** Los estados que son trabajo pendiente: lo que ocupa la pantalla de inicio. */
export const ESTADOS_PENDIENTES: readonly EstadoPedido[] = [
  "pagado",
  "incidencia",
] as const;

/** Los que ya no son trabajo y se pliegan. */
export const ESTADOS_EN_CURSO: readonly EstadoPedido[] = ["enviado"] as const;

export function esPendiente(estado: EstadoPedido): boolean {
  return ESTADOS_PENDIENTES.includes(estado);
}

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pagado: "Por enviar",
  enviado: "En camino",
  entregado: "Entregado",
  archivado: "Archivado",
  cancelado: "Cancelado",
  incidencia: "Incidencia",
};

/*
  Cuando un pedido entregado se archiva solo. Un paso menos para Alfredo.
  Es un valor por defecto, no una constante de fisica: acaba en Ajustes.
*/
export const DIAS_PARA_ARCHIVAR = 7;

/*
  Los plazos del escalado de avisos, en horas. Ver `docs/panel-nerowa.md` §4.3.
  Ajustables desde Ajustes: si 24 h resulta agobiante o corto, se cambia sin
  tocar codigo.
*/
export const ESCALADO_HORAS = {
  /** Segundo aviso, solo a quien despacha. */
  recordatorio: 24,
  /** Tercer aviso, y aqui se entera tambien el dueno. */
  escalada: 48,
} as const;
