import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";
import { servicios } from "@/lib/panel/servicios";

import { ProximaFase } from "../_piezas/proxima-fase";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function PantallaAdmin() {
  if (!(await usuarioActual())) redirect("/panel/entrar");
  const canal = servicios().avisos.describir();

  return (
    <div className="pb-4">
      <h1 className="t-heading pt-4 pb-5 text-2xl">Administracion</h1>

      <ul className="grid gap-2">
        <li>
          <Acceso
            href="/panel/existencias"
            titulo="Existencias"
            detalle="Cuantas cajas hay de cada color, contar el estante, entradas y mermas."
          />
        </li>
        <li>
          <Acceso
            href="/panel/ajustes"
            titulo="Ajustes y avisos"
            detalle={
              canal.listo
                ? "Plazos de los avisos, Telegram y lo que ya se aviso."
                : "⚠ Los avisos todavia no llegan al telefono. Conectar Telegram y plazos."
            }
          />
        </li>
      </ul>

      <div className="mt-6">
        <ProximaFase
          titulo="Tareas, notas y documentos"
          fase="7.7"
          descripcion="Tareas con dueno y fecha, notas pegadas a cada pedido o tienda (sin chat suelto), y subir facturas y comprobantes con foto. De los importes que se carguen aqui sale la ganancia real del grafico, que si no solo podria decir cuanto entro."
          bloqueadoPor={[
            "Cuenta de almacenamiento de archivos para las facturas",
            "Desglose de los 1.000 EUR del lote: flete, arancel, IVA de importacion y despacho",
          ]}
        />
      </div>
    </div>
  );
}

function Acceso({ href, titulo, detalle }: { href: string; titulo: string; detalle: string }) {
  return (
    <Link href={href} className="panel-tarjeta flex items-center gap-3">
      <span className="flex-1">
        <span className="t-heading block text-lg">{titulo}</span>
        <span className="block text-[0.875rem]" style={{ color: "var(--panel-tenue)" }}>
          {detalle}
        </span>
      </span>
      <span aria-hidden="true" style={{ color: "var(--panel-tenue)" }}>
        ▸
      </span>
    </Link>
  );
}
