/*
  Trabajador de servicio del panel de Nerowa.

  A proposito NO guarda paginas en cache todavia. Un panel que enseña pedidos
  viejos de una cache sin avisar es peligroso: Alfredo podria despachar dos
  veces el mismo pedido o dar por pendiente uno ya enviado. La cache offline
  llega cuando este decidido QUE se puede enseñar sin conexion y con que aviso.

  Hoy hace dos cosas, las dos necesarias:
  - Existir, que es lo que permite instalar el panel en la pantalla de inicio.
  - Recibir notificaciones web y abrir la pantalla correcta al tocarlas.
*/

self.addEventListener("install", () => {
  /* Toma el control sin esperar a que se cierren las pestanas abiertas. */
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("push", (evento) => {
  if (!evento.data) return;

  let datos;
  try {
    datos = evento.data.json();
  } catch {
    datos = { titulo: "Nerowa", cuerpo: evento.data.text() };
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo ?? "Nerowa", {
      body: datos.cuerpo ?? "",
      icon: "/panel/icono-192.png",
      badge: "/panel/icono-192.png",
      vibrate: [80, 40, 80],
      /* Que dos avisos del mismo pedido no se apilen en la pantalla. */
      tag: datos.etiqueta ?? undefined,
      data: { enlace: datos.enlace ?? "/panel" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.enlace ?? "/panel", self.location.origin);

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      /* Si el panel ya esta abierto, se reutiliza esa ventana en vez de abrir
         otra: en un telefono, tres copias del panel abiertas son un estorbo. */
      for (const ventana of ventanas) {
        if (ventana.url.startsWith(self.location.origin + "/panel") && "focus" in ventana) {
          ventana.navigate?.(destino.href);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino.href);
    }),
  );
});
