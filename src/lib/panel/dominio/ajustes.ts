/*
  Los numeros del panel que deciden CUANDO avisar.

  Estan aqui y no repartidos por el codigo porque la especificacion lo exige:
  "Los plazos son ajustables desde Ajustes, no estan escritos en el codigo. Si
  24 h resulta agobiante o corto, se cambia sin tocar nada." Ver
  `docs/panel-nerowa.md` §4.3.

  Cada ajuste lleva sus limites. No por desconfianza: un "0" escrito sin querer
  en "horas para escalar" mandaria a Adrian un aviso por cada pedido nada mas
  entrar, y un "999" haria que el escalado no saliera nunca. Lo que no cabe en
  los limites no se guarda, y se dice por que.
*/

import { ESCALADO_HORAS } from "./estados";

export interface AjustesPanel {
  /** Con estas o menos cajas disponibles, el color sale como "quedan pocas". */
  umbralExistenciasBajas: number;
  /** Horas sin enviar hasta el segundo aviso a Alfredo. */
  horasRecordatorio: number;
  /** Horas sin enviar hasta que se entera tambien Adrian. */
  horasEscalada: number;
  /** Dias en camino sin marcar entregado hasta el recordatorio. */
  diasSinEntregar: number;
  /** Horas que puede esperar un pedido de tienda sin confirmar. */
  horasMayoristaSinConfirmar: number;
  /** Hora de Vilnius a la que sale el resumen diario (0 a 23). */
  horaResumen: number;
}

export type ClaveAjuste = keyof AjustesPanel;

export const AJUSTES_POR_DEFECTO: AjustesPanel = {
  umbralExistenciasBajas: 3,
  horasRecordatorio: ESCALADO_HORAS.recordatorio,
  horasEscalada: ESCALADO_HORAS.escalada,
  diasSinEntregar: 7,
  horasMayoristaSinConfirmar: 24,
  horaResumen: 9,
};

export interface DescripcionAjuste {
  etiqueta: string;
  ayuda: string;
  unidad: string;
  min: number;
  max: number;
}

/** Lo que sale en la pantalla de Ajustes, en el orden en que sale. */
export const DESCRIPCION_AJUSTES: Record<ClaveAjuste, DescripcionAjuste> = {
  horasRecordatorio: {
    etiqueta: "Recordatorio de pedido sin enviar",
    ayuda: "Segundo aviso a Alfredo, con el pedido nombrado.",
    unidad: "horas",
    min: 1,
    max: 168,
  },
  horasEscalada: {
    etiqueta: "Avisar tambien a Adrian",
    ayuda: "Si el pedido sigue sin enviar, el aviso les llega a los dos.",
    unidad: "horas",
    min: 2,
    max: 336,
  },
  diasSinEntregar: {
    etiqueta: "En camino sin marcar entregado",
    ayuda: "Para revisar el seguimiento o marcarlo entregado.",
    unidad: "dias",
    min: 1,
    max: 60,
  },
  horasMayoristaSinConfirmar: {
    etiqueta: "Pedido de tienda sin confirmar",
    ayuda: "La tienda esta esperando respuesta.",
    unidad: "horas",
    min: 1,
    max: 336,
  },
  umbralExistenciasBajas: {
    etiqueta: "Quedan pocas",
    ayuda: "Con estas cajas disponibles o menos, el color avisa.",
    unidad: "cajas",
    min: 0,
    max: 100,
  },
  horaResumen: {
    etiqueta: "Resumen diario",
    ayuda: "Hora de Vilnius. Si no hay nada pendiente, no se manda nada.",
    unidad: "h",
    min: 0,
    max: 23,
  },
};

export const CLAVES_AJUSTE = Object.keys(DESCRIPCION_AJUSTES) as ClaveAjuste[];

/** Valida un valor. Devuelve el numero si vale, o el motivo si no. */
export function validarAjuste(
  clave: ClaveAjuste,
  valor: unknown,
): { ok: true; valor: number } | { ok: false; motivo: string } {
  const d = DESCRIPCION_AJUSTES[clave];
  const n = typeof valor === "string" ? Number(valor.trim()) : Number(valor);
  if (typeof valor === "string" && valor.trim() === "") {
    return { ok: false, motivo: `${d.etiqueta}: esta vacio.` };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, motivo: `${d.etiqueta}: tiene que ser un numero entero.` };
  }
  if (n < d.min || n > d.max) {
    return {
      ok: false,
      motivo: `${d.etiqueta}: va de ${d.min} a ${d.max} ${d.unidad}.`,
    };
  }
  return { ok: true, valor: n };
}

/**
 * Los ajustes guardados, completados con los de por defecto.
 *
 * Lo que venga roto de la base —un valor fuera de limites, una clave que ya no
 * existe— se ignora y se usa el de por defecto. Un ajuste corrupto no puede
 * dejar el panel sin avisos.
 */
export function completarAjustes(guardados: Readonly<Record<string, unknown>>): AjustesPanel {
  const resultado = { ...AJUSTES_POR_DEFECTO };
  for (const clave of CLAVES_AJUSTE) {
    if (!(clave in guardados)) continue;
    const v = validarAjuste(clave, guardados[clave]);
    if (v.ok) resultado[clave] = v.valor;
  }
  /*
    Escalar antes que recordar no tiene sentido: el segundo aviso iria detras
    del tercero. Si alguien lo deja asi, se corrige al leer.
  */
  if (resultado.horasEscalada <= resultado.horasRecordatorio) {
    resultado.horasEscalada = resultado.horasRecordatorio + 1;
  }
  return resultado;
}
