/*
  El numero de seguimiento y lo que le llega al cliente.

  Lo que importa: que una errata tipica de copiar a mano (espacios,
  minusculas) no llegue al cliente, que lo que seguro esta mal no se guarde, y
  que el correo no se rompa con un nombre raro.
*/

import assert from "node:assert/strict";

import { crearCorreoResend } from "../../adaptadores/correo-resend";
import { euros, IVA_LITUANIA } from "../dinero";
import {
  correoDeSeguimiento,
  enlaceWhatsApp,
  esCodigoPostalInternacional,
  limpiarSeguimiento,
  mensajeDeSeguimiento,
  validarSeguimiento,
} from "../seguimiento";
import type { Color, Pedido } from "../tipos";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

const colores = new Map<string, Color>([["black", { id: "black", nombre: "Black", hex: "#000", activo: true }]]);
const pedido: Pedido = {
  id: "p",
  numero: 1044,
  origen: "manual",
  estado: "enviado",
  clienteNombre: "Anna <Schmidt> & Co",
  clienteCorreo: "anna@ejemplo.de",
  direccion: { nombre: "Anna", linea1: "C", ciudad: "Berlin", codigoPostal: "", pais: "DE", telefono: "+49 151 2345 6789" },
  lineas: [{ colorId: "black", cantidad: 2, precioUnitario: euros(180) }],
  envioCobrado: 0,
  tipoIva: IVA_LITUANIA,
  pagadoEn: "2026-11-19T10:00:00.000Z",
  seguimiento: "RA123456789LT",
};

async function principal() {
  console.log("\nEl numero de seguimiento");

  await comprueba("lo copiado del papel se limpia: espacios, guiones, minusculas", () => {
    assert.equal(limpiarSeguimiento(" ra 1234-5678 9lt "), "RA123456789LT");
  });

  await comprueba("reconoce el formato postal internacional, sin exigirlo", () => {
    assert.equal(esCodigoPostalInternacional("RA123456789LT"), true);
    assert.equal(esCodigoPostalInternacional("1Z999AA10123456784"), false);
    assert.equal(validarSeguimiento("1Z999AA10123456784"), undefined);
  });

  await comprueba("lo que seguro esta mal no se guarda", () => {
    assert.match(validarSeguimiento("")!, /Falta/);
    assert.match(validarSeguimiento("RA12")!, /corto/);
    assert.match(validarSeguimiento("RA1234567/LT")!, /letras y numeros/);
  });

  console.log("\nLo que le llega al cliente");

  await comprueba("el correo lleva el numero, el pedido y lo que va dentro", () => {
    const c = correoDeSeguimiento(pedido, colores);
    assert.match(c.asunto, /#1044/);
    assert.match(c.texto, /Tracking number: RA123456789LT/);
    assert.match(c.texto, /2 × Black/);
    assert.match(c.texto, /^Hi Anna,/);
  });

  await comprueba("un nombre con < y & no rompe el HTML del correo", () => {
    const c = correoDeSeguimiento({ ...pedido, clienteNombre: "<b>Anna" }, colores);
    assert.doesNotMatch(c.html, /<b>Anna/);
    assert.match(c.html, /&lt;b&gt;Anna/);
  });

  await comprueba("el mensaje corto para WhatsApp lleva el numero", () => {
    assert.match(mensajeDeSeguimiento(pedido, colores), /Tracking number: RA123456789LT/);
  });

  await comprueba("el enlace de WhatsApp usa el numero internacional, sin + ni espacios", () => {
    const url = enlaceWhatsApp("+49 151 2345 6789", "hola")!;
    assert.match(url, /^https:\/\/wa\.me\/4915123456789\?text=hola$/);
    assert.match(enlaceWhatsApp("0049 151 2345 6789", "x")!, /wa\.me\/4915123456789/);
    assert.equal(enlaceWhatsApp(undefined, "x"), undefined);
    assert.equal(enlaceWhatsApp("123", "x"), undefined);
  });

  console.log("\nCorreo por Resend");

  await comprueba("manda de, para, asunto, texto, HTML y a quien responder", async () => {
    let cuerpo: Record<string, unknown> = {};
    let cabeceras: Record<string, string> = {};
    const f = (async (_url: string, init?: RequestInit) => {
      cuerpo = JSON.parse(String(init?.body));
      cabeceras = init?.headers as Record<string, string>;
      return new Response('{"id":"x"}', { status: 200 });
    }) as unknown as typeof fetch;
    const correo = crearCorreoResend({ clave: "re_x", desde: "Nerowa <info@nerowacases.com>", fetch: f });
    const r = await correo.enviar({ para: "a@b.de", asunto: "S", texto: "T", html: "<p>T</p>", responderA: "info@nerowacases.com" });
    assert.deepEqual(r, { ok: true });
    assert.equal(cabeceras.authorization, "Bearer re_x");
    assert.deepEqual(cuerpo, {
      from: "Nerowa <info@nerowacases.com>",
      to: ["a@b.de"],
      subject: "S",
      text: "T",
      html: "<p>T</p>",
      reply_to: "info@nerowacases.com",
    });
  });

  await comprueba("si Resend se niega, no lanza y dice por que", async () => {
    const f = (async () => new Response('{"message":"domain not verified"}', { status: 403 })) as unknown as typeof fetch;
    const original = console.error;
    console.error = () => {};
    const r = await crearCorreoResend({ clave: "k", desde: "d", fetch: f }).enviar({ para: "a@b", asunto: "s", texto: "t" });
    console.error = original;
    assert.equal(r.ok, false);
    assert.match((r as { motivo: string }).motivo, /403.*domain not verified/);
  });

  console.log(`\n${hechas} comprobaciones del seguimiento, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones del seguimiento fallaron:\n", error);
  process.exit(1);
});
