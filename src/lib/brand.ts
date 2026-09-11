/*
  Datos de marca en un solo sitio. Para cambiar el logo se reemplaza el archivo
  en `public/brand/` y se ajustan estas tres lineas; ninguna pagina se toca.
*/

export const CONTACT_EMAIL = "info@nerowacases.com";

export interface LogoAsset {
  src: string;
  /* Proporciones reales del archivo, no el tamano en pantalla. */
  width: number;
  height: number;
}

export const LOGO: LogoAsset = {
  src: "/brand/logo.png",
  width: 1118,
  height: 288,
};
