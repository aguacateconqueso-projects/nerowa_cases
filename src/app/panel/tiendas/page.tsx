import { redirect } from "next/navigation";

import { usuarioActual } from "@/lib/panel/sesion";

import { ProximaFase } from "../_piezas/proxima-fase";

export const metadata = { title: "Tiendas" };
export const dynamic = "force-dynamic";

export default async function PantallaTiendas() {
  if (!(await usuarioActual())) redirect("/panel/entrar");

  return (
    <ProximaFase
      titulo="Tiendas"
      fase="7.6"
      descripcion="Ficha de cada tienda con sus datos de facturacion y sus condiciones, control de lo que debe y desde cuando, y el portal con enlace propio para que pidan ellas solas: catalogo, sus precios por tramo y el formulario de pedido, sin pago en linea."
      bloqueadoPor={[
        "Datos fiscales de la empresa en Lituania — los define Alfredo",
        "Decidir si hay pedido minimo por tienda",
        "Confirmar con el asesor el IVA intracomunitario: cambia el total de cada factura",
      ]}
    />
  );
}
