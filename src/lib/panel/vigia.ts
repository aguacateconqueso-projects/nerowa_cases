import "server-only";

/*
  El vigia: mira como esta el negocio y manda los avisos que tocan, una sola
  vez cada uno.

  CUANDO MIRA

  1. Una vez al dia, por el cron de Vercel (`vercel.json` →
     `/api/panel/vigia`). Es el que garantiza el resumen diario y el escalado
     aunque nadie abra el panel en tres dias.
  2. Cada vez que alguien abre la pantalla de pedidos, despues de ensenarla
     (con `after`, sin retrasarla), y como mucho una vez cada cinco minutos
     por instancia.
  3. A mano, desde Admin → Avisos → "Revisar ahora".

  Por que no cada hora con el cron: el plan gratuito de Vercel solo deja crons
  diarios, y un cron mas frecuente hace FALLAR el despliegue entero. Con el
  punto 2, en la practica se revisa cada vez que alguien trabaja. Si algun dia
  se pasa a un plan de pago, basta con cambiar el horario en `vercel.json`.

  POR QUE NO SE REPITEN

  Cada alerta trae una `clave` que dice que se aviso ("pedido X, escalado").
  Antes de mandar, se RECLAMA la clave en la base: solo la primera revision
  que la consigue manda el mensaje. Dos revisiones a la vez en dos instancias
  no mandan dos veces.

  Y si Telegram falla de verdad —no contesta, error 500—, la clave se suelta
  para que la siguiente revision lo reintente. Un aviso urgente que se pierde
  en silencio es justo lo que este archivo existe para evitar.
*/

import { after } from "next/server";

import { alertasPara, resumenDiario } from "./dominio/alertas";
import { fechaEnVilnius, horaEnVilnius } from "./dominio/tiempo";
import type { Id, Rol, Usuario } from "./dominio/tipos";
import type { Aviso } from "./puertos/avisos";
import { servicios } from "./servicios";
import { leerSituacion } from "./situacion";

export interface Enviado {
  clave: string;
  titulo: string;
  para: string;
  canales: string[];
  /** Si fallo y se dejo para la siguiente revision. */
  reintentar?: boolean;
}

export interface ResultadoRevision {
  ahora: string;
  /** Cuantas alertas hay en total, enviadas antes o ahora. */
  alertas: number;
  enviados: Enviado[];
  resumen: "enviado" | "nada-pendiente" | "ya-salio" | "todavia-no-es-la-hora";
  canal: string;
}

/** Lo que se reclama en la base: una clave y el titulo con que se apunta. */
interface Parte {
  clave: string;
  titulo: string;
}

/**
 * Manda un aviso a unas personas por las partes que no salieron todavia.
 *
 * Normalmente es una parte y un mensaje. Varias partes en un mensaje es el
 * caso de las existencias: cada color lleva su clave —para no repetirse— pero
 * salen juntos, para que el telefono no suene una vez por color. `armar`
 * recibe solo las partes que de verdad faltaban por mandar.
 *
 * Devuelve `undefined` si ya habian salido todas.
 */
async function mandar(
  partes: readonly Parte[],
  armar: (nuevas: readonly Parte[]) => Aviso,
  destinatarios: readonly Usuario[],
  ahora: number,
): Promise<Enviado | undefined> {
  const { almacen, avisos } = servicios();
  if (destinatarios.length === 0 || partes.length === 0) return undefined;

  const para = destinatarios.map((u) => u.nombre).join(", ");
  const nuevas: Parte[] = [];
  for (const p of partes) {
    const reclamado = await almacen.reclamarAviso({
      clave: p.clave,
      titulo: p.titulo,
      para,
      canales: [],
      enviadoEn: new Date(ahora).toISOString(),
    });
    if (reclamado) nuevas.push(p);
  }
  if (nuevas.length === 0) return undefined;

  const aviso = armar(nuevas);
  const clave = nuevas.map((p) => p.clave).join(" + ");

  const canales = new Set<string>();
  let fallo: string | undefined;
  for (const u of destinatarios) {
    const r = await avisos.avisar(u, aviso);
    r.canales.forEach((c) => canales.add(c));
    if (r.fallo) fallo = r.fallo;
  }

  /*
    Si se intento por un canal de verdad y no salio por NINGUNO, se suelta la
    clave para reintentarlo. Si salio para uno de los dos, se da por enviado:
    reintentar le mandaria el mismo mensaje dos veces al que si lo recibio.
  */
  const salioPorAlgo = [...canales].some((c) => c !== "consola");
  if (fallo && !salioPorAlgo) {
    for (const p of nuevas) await almacen.soltarAviso(p.clave);
    return { clave, titulo: aviso.titulo, para, canales: [...canales], reintentar: true };
  }

  for (const p of nuevas) await almacen.completarAviso(p.clave, [...canales]);
  return { clave, titulo: aviso.titulo, para, canales: [...canales] };
}

/** Un aviso suelto: una parte, un mensaje. */
function mandarUno(clave: string, aviso: Aviso, destinatarios: readonly Usuario[], ahora: number) {
  return mandar([{ clave, titulo: aviso.titulo }], () => aviso, destinatarios, ahora);
}

/* Las que se juntan en un solo mensaje. Ver `mandar`. */
const DEL_ESTANTE = new Set(["existencias_agotadas", "existencias_bajas"]);

function quienes(usuarios: readonly Usuario[], roles: readonly Rol[], menos?: Id): Usuario[] {
  return usuarios.filter((u) => roles.includes(u.rol) && u.id !== menos);
}

export async function revisarAvisos(ahora = Date.now()): Promise<ResultadoRevision> {
  const { almacen, avisos } = servicios();
  const [situacion, usuarios] = await Promise.all([
    leerSituacion(ahora),
    almacen.listarUsuarios(),
  ]);

  const enviados: Enviado[] = [];
  for (const alerta of situacion.alertas) {
    if (DEL_ESTANTE.has(alerta.tipo)) continue;
    const r = await mandarUno(
      alerta.clave,
      {
        urgencia: alerta.gravedad,
        titulo: alerta.titulo,
        cuerpo: alerta.cuerpo,
        enlace: alerta.enlace,
      },
      quienes(usuarios, alerta.para),
      ahora,
    );
    if (r) enviados.push(r);
  }

  /*
    Las de "agotado" y "quedan pocas", juntas. El primer dia, con varios
    colores sin cajas, serian siete mensajes seguidos; asi es uno.
  */
  const delEstante = situacion.alertas.filter((a) => DEL_ESTANTE.has(a.tipo));
  if (delEstante.length > 0) {
    const r = await mandar(
      delEstante.map((a) => ({ clave: a.clave, titulo: a.titulo })),
      (nuevas) => ({
        urgencia: "normal",
        titulo:
          nuevas.length === 1 ? nuevas[0]!.titulo : `Existencias: ${nuevas.length} colores para revisar`,
        cuerpo:
          nuevas.length === 1
            ? (delEstante.find((a) => a.clave === nuevas[0]!.clave)?.cuerpo ?? "")
            : nuevas.map((p) => `• ${p.titulo}`).join("\n"),
        enlace: "/panel/existencias",
      }),
      quienes(usuarios, ["operacion", "dueno"]),
      ahora,
    );
    if (r) enviados.push(r);
  }

  /* --- El resumen diario, a la hora que eligio Alfredo --- */

  let resumen: ResultadoRevision["resumen"] = "todavia-no-es-la-hora";
  if (horaEnVilnius(ahora) >= situacion.ajustes.horaResumen) {
    const clave = `resumen:${fechaEnVilnius(ahora)}`;
    const operacion = quienes(usuarios, ["operacion"]);
    const texto = resumenDiario(
      situacion.pedidos,
      alertasPara(situacion.alertas, "operacion"),
      ahora,
    );

    if (!texto) {
      /*
        Nada pendiente: NO se manda nada, pero se deja constancia de que hoy ya
        se miro, para no volver a mirar en cada revision del resto del dia.
      */
      const nuevo = await almacen.reclamarAviso({
        clave,
        titulo: "Resumen del dia: nada pendiente, no se mando",
        para: operacion.map((u) => u.nombre).join(", "),
        canales: [],
        enviadoEn: new Date(ahora).toISOString(),
      });
      resumen = nuevo ? "nada-pendiente" : "ya-salio";
    } else {
      const r = await mandarUno(
        clave,
        { urgencia: "normal", titulo: texto.titulo, cuerpo: texto.cuerpo, enlace: "/panel" },
        operacion,
        ahora,
      );
      if (r) enviados.push(r);
      resumen = r && !r.reintentar ? "enviado" : "ya-salio";
    }
  }

  return {
    ahora: new Date(ahora).toISOString(),
    alertas: situacion.alertas.length,
    enviados,
    resumen,
    canal: avisos.nombre,
  };
}

/* --------------------------------------------------------------------------
   Revisar sin estorbar
   -------------------------------------------------------------------------- */

let ultimaRevision = 0;
const CADA_MS = 5 * 60_000;

/**
 * Revisa los avisos DESPUES de responder, como mucho cada cinco minutos.
 *
 * Se llama desde la pantalla de pedidos. `after` hace que la revision corra
 * cuando la pantalla ya salio, asi que abrir el panel no tarda ni un
 * milisegundo mas por esto. Y un fallo aqui solo se apunta: no puede romper
 * una pantalla que ya se ensено.
 */
export function revisarEnSegundoPlano(): void {
  const ahora = Date.now();
  if (ahora - ultimaRevision < CADA_MS) return;
  ultimaRevision = ahora;
  after(async () => {
    try {
      const r = await revisarAvisos();
      if (r.enviados.length > 0) {
        console.info(`[vigia] ${r.enviados.length} aviso(s): ${r.enviados.map((e) => e.clave).join(", ")}`);
      }
    } catch (error) {
      console.error("[vigia] la revision fallo:", error);
    }
  });
}

/* --------------------------------------------------------------------------
   Avisos por algo que acaba de pasar
   -------------------------------------------------------------------------- */

/**
 * Avisa de algo que acaba de pasar: una venta nueva, un pedido enviado.
 *
 * `menos` es quien lo hizo: si Alfredo registra una venta, no hace falta
 * avisarle a el de lo que acaba de hacer. Va con `after`, para que el boton
 * conteste en cuanto la accion termina y no cuando Telegram contesta.
 */
export function avisarEvento(e: {
  clave: string;
  para: readonly Rol[];
  menos?: Id;
  aviso: Aviso;
}): void {
  after(async () => {
    try {
      const usuarios = await servicios().almacen.listarUsuarios();
      await mandarUno(e.clave, e.aviso, quienes(usuarios, e.para, e.menos), Date.now());
    } catch (error) {
      console.error(`[vigia] no se pudo avisar ${e.clave}:`, error);
    }
  });
}

/** Un aviso de prueba a una sola persona, sin dejar constancia. */
export async function avisoDePrueba(u: Usuario) {
  return servicios().avisos.avisar(u, {
    urgencia: "urgente",
    titulo: "Aviso de prueba del panel",
    cuerpo: `Si lees esto, ${u.nombre}, los avisos te llegan al telefono.`,
    enlace: "/panel",
  });
}
