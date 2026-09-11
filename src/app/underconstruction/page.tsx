import type { Metadata } from "next";

import { UnderConstruction } from "@/components/under-construction";

/*
  Misma pagina que la raiz, con su propia direccion para poder compartirla
  suelta. Cuando la tienda ocupe `/`, esta ruta se borra.
*/
export const metadata: Metadata = {
  title: "Under construction — Nerowa Cases",
};

export default function UnderConstructionPage() {
  return <UnderConstruction />;
}
