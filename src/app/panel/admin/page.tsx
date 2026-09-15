import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";

import { ProximaFase } from "../_piezas/proxima-fase";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function PantallaAdmin() {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  return (
    <ProximaFase
      titulo="Administracion"
      fase="7.7"
      descripcion="Tareas con dueno y fecha, notas pegadas a cada pedido o tienda (sin chat suelto), y subir facturas y comprobantes con foto. De los importes que se carguen aqui sale la ganancia real del grafico, que si no solo podria decir cuanto entro."
      bloqueadoPor={[
        "Cuenta de almacenamiento de archivos para las facturas",
        "Desglose de los 1.000 EUR del lote: flete, arancel, IVA de importacion y despacho",
      ]}
    />
  );
}
