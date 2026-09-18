/*
  Lo que se ve en el instante en que se toca una pestana, antes de que conteste
  el servidor.

  POR QUE ESTE ARCHIVO EXISTE, QUE ES LA PARTE QUE IMPORTA

  Adrian: *"funciona, esta laggy, tengo que clicar 30 veces en los iconos abajo
  para poder ver la pagina"*. No era el area de toque ni la base de datos: era
  que **el toque no cambiaba ni un pixel** hasta que volvia el servidor.

  Medido en un navegador de verdad, con el servidor retrasado 2,5 s a proposito
  para reproducir la red de Adrian, y tocando "Tiendas" desde "Pedidos":

    +227 ms .. +2500 ms | URL: /panel | pestana: gris | pantalla: "3 pedidos"

  Durante dos segundos y medio, **nada**. Ni la URL, ni el color del icono, ni
  el contenido. Treinta toques es la respuesta correcta a eso: no es
  impaciencia, es que la interfaz no contesto.

  La causa esta escrita en la documentacion de esta version de Next
  (`01-getting-started/04-linking-and-navigating.md`), y es exactamente este
  archivo el que faltaba:

  > **Dynamic Route**: prefetching is skipped, or the route is partially
  > prefetched if `loading.tsx` is present.
  > [...] When navigating to a dynamic route, the client must wait for the
  > server response before showing the result. This can give the users the
  > impression that the app is not responding.

  Todas las pantallas del panel son dinamicas — leen la cookie de sesion, asi
  que no hay otra. Sin este archivo no se precargaba NADA: la precarga de las
  tres pestanas devolvia el arbol de rutas con `null` en cada hueco, unos 300
  bytes sin una sola etiqueta que pintar. Con el, devuelve ~8 KB con este
  esqueleto dentro y **cero datos reales** — el armazon se adelanta, la
  consulta a Irlanda no.

  UNO SOLO, Y AQUI

  Un `loading.tsx` envuelve su `page.tsx` y **todo lo que cuelga por debajo**.
  Puesto en `/panel`, cubre las tres pestanas y las pantallas de dentro con un
  archivo. La regla para el dia que alguien quiera afinar uno por pantalla: que
  sea porque la forma de esa pantalla es distinta de verdad, no por adornar.

  LO QUE HACE FALTA PARA QUE ESTO SIGA FUNCIONANDO

  Que `layout.tsx` no se ponga a esperar datos. Un `loading.tsx` no tapa a su
  layout: si el layout aprende a consultar la base o a leer la cookie, la
  navegacion vuelve a bloquearse y este archivo deja de verse, sin avisar. Hoy
  el layout del panel no consulta nada, y conviene que siga asi.

  NO LLEVA TEXTO

  Ni "Cargando..." ni un reloj de arena. Esto se ve medio segundo, y un texto
  que aparece y desaparece se lee como un parpadeo de error. Las barras tienen
  la forma de lo que viene: un titular y tarjetas. Alfredo reconoce la pantalla
  antes de que lleguen los datos.

  Para quien no ve la pantalla, las barras grises no comunican nada: eso lo
  dicen el `aria-busy` y el texto oculto.
*/

export default function CargandoPanel() {
  return (
    <div className="pb-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la pantalla</span>

      <header className="pt-4 pb-5">
        <div className="panel-hueso" style={{ width: "6rem", height: "0.75rem" }} />
        <div className="panel-hueso mt-3" style={{ width: "70%", height: "1.75rem" }} />
      </header>

      <ul className="grid gap-3">
        {/*
          Tres tarjetas y no una: una sola barra parece un fallo de carga, y
          media docena mueve la pagina al llegar los datos de verdad. Tres es
          lo que suele haber pendiente.
        */}
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className="panel-tarjeta panel-hueso-tarjeta">
              <div className="panel-hueso" style={{ width: "45%", height: "1rem" }} />
              <div className="panel-hueso mt-3" style={{ width: "65%", height: "0.75rem" }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
