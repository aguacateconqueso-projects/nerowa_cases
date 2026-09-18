/*
  Que las sondas de red digan la verdad, contra sockets de verdad.

  Nada de esto esta simulado: se levantan servidores reales —uno que acepta, uno
  que acepta y corta, y un puerto cerrado— porque lo que se esta comprobando es
  justo la diferencia entre esos casos. Una sonda simulada distingue lo que le
  digan que distinga, que es exactamente el fallo que llevo a escribirla.
*/

import assert from "node:assert/strict";
import net from "node:net";

import {
  describirSonda,
  pistasDeRed,
  resolverNombre,
  tocarPuerto,
  type SondaRed,
} from "../../sonda-red";

let hechas = 0;
async function comprueba(que: string, fn: () => Promise<void> | void) {
  await fn();
  hechas += 1;
  console.log(`  ok  ${que}`);
}

/** Un servidor que acepta y no dice nada. Devuelve el puerto y como cerrarlo. */
function levantar(alConectar?: (s: net.Socket) => void) {
  return new Promise<{ puerto: number; cerrar: () => Promise<void> }>((listo) => {
    const servidor = net.createServer((s) => alConectar?.(s));
    servidor.listen(0, "127.0.0.1", () => {
      const dir = servidor.address() as net.AddressInfo;
      listo({
        puerto: dir.port,
        cerrar: () => new Promise<void>((r) => servidor.close(() => r())),
      });
    });
  });
}

/** Un puerto que nadie escucha: se abre uno y se cierra para saber cual. */
async function puertoCerrado() {
  const { puerto, cerrar } = await levantar();
  await cerrar();
  return puerto;
}

async function principal() {
  console.log("\nSondas de red");

  await comprueba("un nombre que existe resuelve, y dice de que familia", async () => {
    const r = await resolverNombre("localhost", 2000);
    assert.equal(r.estado, "resuelve");
    if (r.estado !== "resuelve") return;
    assert.ok(r.familias.length > 0, "resolvio sin decir ninguna familia");
    assert.ok(r.familias.every((f) => f === 4 || f === 6));
  });

  await comprueba("un nombre inventado NO resuelve, y no se confunde con tardar", async () => {
    const r = await resolverNombre("esto-no-existe-de-verdad.nerowa-invalido", 4000);
    assert.equal(r.estado, "no_resuelve");
    if (r.estado !== "no_resuelve") return;
    assert.ok(r.codigo.length > 0, "no recogio el codigo del fallo");
  });

  await comprueba("un puerto que escucha se ve como que acepta", async () => {
    const { puerto, cerrar } = await levantar();
    try {
      const r = await tocarPuerto("127.0.0.1", puerto, 2000);
      assert.equal(r.estado, "acepta");
    } finally {
      await cerrar();
    }
  });

  await comprueba("un puerto cerrado se ve como rechazo, NO como silencio", async () => {
    const r = await tocarPuerto("127.0.0.1", await puertoCerrado(), 2000);
    assert.equal(r.estado, "rechaza");
    if (r.estado !== "rechaza") return;
    assert.equal(r.codigo, "ECONNREFUSED");
  });

  await comprueba("tocar el puerto no deja el socket abierto", async () => {
    /*
      Un socket vivo mantiene viva la funcion en Vercel igual que un reloj sin
      limpiar, y aqui se abre uno en cada carga de la pantalla de estado.
    */
    const cuenta = () =>
      process.getActiveResourcesInfo().filter((r) => r === "TCPSOCKETWRAP").length;
    const { puerto, cerrar } = await levantar();
    try {
      const antes = cuenta();
      await tocarPuerto("127.0.0.1", puerto, 2000);
      assert.equal(cuenta(), antes, "quedo un socket abierto tras sondear");
    } finally {
      await cerrar();
    }
  });

  console.log("\nQue pista sale de cada resultado");

  const sonda = (parcial: Partial<SondaRed>): SondaRed => ({
    anfitrion: "aws-1-eu-west-1.pooler.supabase.com",
    puerto: 6543,
    dns: { estado: "resuelve", familias: [4], ms: 5 },
    ...parcial,
  });

  await comprueba("si el nombre no existe, lo dice y no habla del puerto", () => {
    const [pista, ...resto] = pistasDeRed(
      sonda({ dns: { estado: "no_resuelve", codigo: "ENOTFOUND", ms: 5 } }),
    );
    assert.equal(resto.length, 0, "dio mas de una pista para una sola causa");
    assert.match(pista.titulo, /no existe/i);
    assert.equal(pista.nivel, "error");
    assert.match(pista.queHacer, /Transaction pooler/);
  });

  await comprueba("solo IPv6 se nombra como la conexion directa", () => {
    const [pista] = pistasDeRed(
      sonda({ dns: { estado: "resuelve", familias: [6], ms: 5 } }),
    );
    assert.match(pista.titulo, /IPv6/);
    assert.equal(pista.nivel, "error");
  });

  await comprueba("silencio en el puerto apunta al proyecto pausado", () => {
    const [pista] = pistasDeRed(sonda({ tcp: { estado: "no_contesta", ms: 2500 } }));
    assert.match(pista.queHacer, /pausado/i);
    assert.match(pista.queHacer, /supabase\.com/);
    assert.equal(pista.nivel, "error");
  });

  await comprueba("un corte nada mas abrir no se confunde con puerto cerrado", () => {
    const [cortado] = pistasDeRed(
      sonda({ tcp: { estado: "rechaza", codigo: "ECONNRESET", ms: 12 } }),
    );
    const [cerrado] = pistasDeRed(
      sonda({ tcp: { estado: "rechaza", codigo: "ECONNREFUSED", ms: 12 } }),
    );
    assert.notEqual(cortado.titulo, cerrado.titulo);
    assert.match(cortado.queHacer, /pausado|arrancar/i);
    assert.match(cerrado.queHacer, /6543/);
  });

  await comprueba("si se llega bien, NO se inventa ninguna pista", () => {
    assert.deepEqual(pistasDeRed(sonda({ tcp: { estado: "acepta", ms: 40 } })), []);
  });

  await comprueba("la frase de resumen no ensena nada que no sea publico", () => {
    const frase = describirSonda(sonda({ tcp: { estado: "acepta", ms: 40 } }));
    assert.match(frase, /IPv4/);
    assert.match(frase, /acepta/);
  });

  console.log(`\n${hechas} comprobaciones de las sondas, todas en verde.\n`);
}

principal().catch((error) => {
  console.error("\n❌ Las comprobaciones de las sondas fallaron:\n", error);
  process.exit(1);
});
