import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
      Deteccion de falta de conexion y reintento automatico de las acciones de
      servidor que se quedaron bloqueadas.

      Es exactamente lo que pedia la regla 4 de `docs/panel-nerowa.md` §11.3:
      si Alfredo marca "enviado" en un sotano sin cobertura, la accion se
      reintenta sola en cuanto vuelve la senal, y mientras tanto el panel lo
      dice en pantalla en vez de mentir. Lo trae Next 16 de serie; sin esto, el
      gancho `useOffline` siempre devuelve falso.
    */
    useOffline: true,
    serverActions: {
      /*
        Las fotos de los recibos suben por una accion de servidor, y el limite
        por defecto es 1 MB. El telefono las comprime a unos 300-400 KB, pero
        un PDF o una foto que no se pudo comprimir puede pasar de ahi. El tope
        que manda es el de 4 MB de `recibos.ts`, que ademas cabe en los 4,5 MB
        que Vercel deja por peticion; esto solo tiene que no cortar antes.
      */
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
