# Marca

Archivos de identidad: logo, isotipo, favicon.

## Logo

El que usa la pagina es `logo.png`: el wordmark sobre fondo transparente, ya
recortado (sin margen sobrante alrededor de las letras).

## Como cambiarlo

1. Sube el archivo nuevo a esta carpeta.
   - **SVG es lo mejor**: pesa poco y se ve nitido en cualquier pantalla.
   - Si es PNG, con fondo transparente y al menos 1200 px de ancho.
   - El fondo de la pagina es negro: el logo tiene que verse sobre negro.
   - **Recortalo** contra las letras. Si trae margen transparente, en la pagina
     se ve como un hueco raro encima y debajo del logo.
2. Abre `src/lib/brand.ts` y ajusta `LOGO`:

   ```ts
   export const LOGO: LogoAsset = {
     src: "/brand/logo.png",
     width: 1118,
     height: 288,
   };
   ```

   `width` y `height` son las **proporciones reales del archivo**, no el tamano
   en pantalla. Si el logo mide 1600 x 400, pon esos numeros. El tamano en
   pantalla lo controla la clase de ancho donde se usa `<Logo />`.

## Favicon

El favicon vive en `src/app/favicon.ico`, no aqui. Para cambiarlo se reemplaza
ese archivo.
