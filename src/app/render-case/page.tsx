import { notFound } from "next/navigation";

import { RenderCase } from "./render-case";

/*
  El estudio de fotos del case. NO es una pagina de la tienda: existe solo para
  que `scripts/miniaturas-case.mjs` saque las fotos de producto de cada color
  (cerrado y abierto) desde el `.glb`, con fondo transparente.

  En produccion no existe: devuelve 404.

    /render-case?color=red&view=closed
*/
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ color?: string; view?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { color = "black", view = "closed" } = await searchParams;
  return <RenderCase colorId={color} open={view === "open"} />;
}
