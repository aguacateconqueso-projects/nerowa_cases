import type { Metadata } from "next";
import { Newsreader } from "next/font/google";

import { ShopPage } from "@/components/shop/shop-page";
import { INTRO_KEY } from "@/lib/shop/content";

import "./shop.css";

/*
  La tienda con la estructura de dialedcoffee.com, ajustada a Nerowa.

  Vive en `/shop` y no reemplaza a `/store` a proposito: las dos conviven en el
  mismo preview de Vercel para poder compararlas lado a lado. Si esta se queda,
  se borra `/store` y, el dia que se abra, la raiz pasa a renderizar
  `<ShopPage />`.

  La serif se carga aqui y no en el layout raiz: solo la usa esta pagina, y asi
  la pagina de espera no descarga una fuente que no ensena.
*/
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nerowa Cases — two bows, one case",
  /* En construccion: fuera de los buscadores hasta que se abra de verdad. */
  robots: { index: false, follow: false },
};

/*
  La entrada se ensena una vez por sesion. Si ya se vio, este guion la esconde
  ANTES del primer pintado; sin el, quien recarga ve un parpadeo de la cortina
  negra hasta que React arranca y la quita.

  Mete una regla en el `head` y no una clase en `<html>`: una clase puesta antes
  de hidratar no coincide con la del servidor y React lo marca como error.
*/
const HIDE_SEEN_INTRO = `try{if(sessionStorage.getItem(${JSON.stringify(
  INTRO_KEY,
)})||matchMedia("(prefers-reduced-motion: reduce)").matches){var s=document.createElement("style");s.textContent=".sh-preloader{display:none}";document.head.appendChild(s)}}catch(e){}`;

export default function Shop() {
  return (
    <div className={newsreader.variable}>
      <script dangerouslySetInnerHTML={{ __html: HIDE_SEEN_INTRO }} />
      <ShopPage />
    </div>
  );
}
