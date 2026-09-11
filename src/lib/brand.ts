/*
  Datos de marca en un solo sitio. Cuando llegue el logo definitivo se cambia
  una linea aqui y no se toca ninguna pagina.
*/

export const CONTACT_EMAIL = "info@nerowacases.com";

export interface LogoAsset {
  src: string;
  width: number;
  height: number;
}

/*
  Logo de imagen. Mientras valga null, la marca se dibuja con el wordmark
  tipografico de `src/components/brand/logo.tsx`.

  Para usar el archivo real: subelo a `public/brand/` y deja aqui, por ejemplo,

    export const LOGO: LogoAsset | null = {
      src: "/brand/logo.svg",
      width: 480,
      height: 96,
    };

  `width` y `height` son las proporciones reales del archivo, no el tamano en
  pantalla; ese lo controla la clase del componente.
*/
export const LOGO: LogoAsset | null = null;
