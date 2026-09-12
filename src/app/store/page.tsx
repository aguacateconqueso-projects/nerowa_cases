import type { Metadata } from "next";

import { StorePage } from "@/components/store/store-page";

/*
  La tienda vive en `/store` y no en la raiz a proposito.

  `nerowacases.com` sirve la pagina de espera y nada mas: es lo que ve quien
  llega de Instagram, y no puede toparse con la tienda a medio hacer. Montando
  la tienda en su propia ruta, el preview de Vercel de esta rama muestra las dos
  cosas a la vez: `/` sigue siendo la pagina de espera y `/store` es lo nuevo.

  El dia que Alfredo diga que sale, la raiz pasa a renderizar `<StorePage />` y
  esta ruta se borra. Es un cambio de una linea.
*/
export const metadata: Metadata = {
  title: "Nerowa Cases — a double bass case for two bows",
  /* En construccion: fuera de los buscadores hasta que se abra de verdad. */
  robots: { index: false, follow: false },
};

export default function Store() {
  return <StorePage />;
}
