# Marca

Archivos de identidad: logo, isotipo, favicon.

## Como poner el logo en la pagina

1. Sube el archivo a esta carpeta. Nombralo `logo.svg` (o `logo.png`).
   - **SVG es lo mejor**: pesa poco y se ve nitido en cualquier pantalla.
   - Si es PNG, que sea con fondo transparente y al menos 1200 px de ancho.
   - El fondo de la pagina es negro, asi que el logo tiene que verse sobre negro.
2. Abre `src/lib/brand.ts` y cambia la ultima linea por:

   ```ts
   export const LOGO: LogoAsset | null = {
     src: "/brand/logo.svg",
     width: 480,
     height: 96,
   };
   ```

   `width` y `height` son las **proporciones reales del archivo**, no el tamano
   en pantalla. Si el logo mide 1200 x 240, pon esos numeros.

Mientras `LOGO` valga `null`, la pagina dibuja un wordmark tipografico
provisional. No hace falta tocar nada mas.

## Favicon

El favicon vive en `src/app/favicon.ico`, no aqui. Para cambiarlo se reemplaza
ese archivo.
