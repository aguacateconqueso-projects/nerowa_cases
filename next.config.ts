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
  },
};

export default nextConfig;
