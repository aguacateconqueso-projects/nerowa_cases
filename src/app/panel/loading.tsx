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

  Y LO QUE SE APRENDIO A GOLPES: UN ESQUELETO PUEDE MENTIR PARA SIEMPRE

  La primera version de este archivo dejaba el panel colgado en gris. Adrian
  mando la foto: `/panel/tiendas` con las barras puestas y nada mas, sin error,
  sin salida, indefinidamente.

  Reproducido: si el flujo de la respuesta **se corta a media emision** —que es
  lo que hace Vercel cuando mata una funcion que se paso de tiempo— el navegador
  se queda con el esqueleto ya pintado y nunca recibe ni el contenido ni el
  error. Medido a 1 s, 3 s y 10 s: ocho barras, cero avisos, para siempre. En la
  consola solo queda un `ERR_INCOMPLETE_CHUNKED_ENCODING` que la persona no ve.

  Es el precio de transmitir por partes: el contenido util viaja DESPUES, asi
  que un corte cuesta mas que antes. La pantalla de error de `error.tsx` no
  salva este caso — solo salta cuando llega un error, y aqui no llega nada.

  POR QUE EL AVISO ES DE CSS Y NO DE JAVASCRIPT

  Porque en ese fallo **JavaScript no llega a funcionar**: el flujo esta cortado,
  React no termina de montar, y un `useEffect` con un temporizador no corre. Lo
  unico que sigue vivo es lo que ya esta en el documento y en la hoja de
  estilos. Una animacion con retraso no necesita nada mas, y los enlaces de
  abajo son `<a href>` de los de toda la vida: funcionan sin hidratar.

  A los 12 segundos, el esqueleto deja de fingir: las barras se quedan quietas y
  aparece que pasa y a donde ir. Doce y no tres, porque una pantalla lenta que
  SI va a cargar no puede acusar de averia a los tres segundos; si el contenido
  llega, este bloque se va con el resto del esqueleto y no se ve nunca.

  LO QUE NO SE HIZO, Y CONVIENE SABERLO ANTES DE INTENTARLO

  Lo obvio seria ponerle un tope de tiempo a todas las consultas en el
  envoltorio de `servicios.ts`, para que un cuelgue acabe en la pantalla de
  error en vez de en un corte. **No se puede tal cual**: la primera peticion
  tras un despliegue dispara las migraciones, y esas tienen permitido
  `statement_timeout = '15s'` a proposito. Un tope general por debajo de eso las
  cortaria a mitad de transaccion — que es exactamente como se dejaron los
  candados muertos de la vuelta 14. El tope general hay que hacerlo, pero
  distinguiendo la migracion del resto, y eso es una vuelta propia.
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

      <Tardanza />
    </div>
  );
}

/*
  El aviso de que esto ya no es una espera normal.

  Invisible hasta los 12 segundos, y entonces aparece solo, sin JavaScript. Va
  al final del documento a proposito: mientras esta oculto no ocupa sitio ni lo
  lee un lector de pantalla, y cuando aparece esta debajo de lo que la persona
  ya estaba mirando.

  Manda a los mismos dos sitios que `error.tsx`. Que la salida sea la misma
  importa: desde el punto de vista de quien lo sufre, una pantalla que no carga
  es una pantalla que no carga, y no tiene por que aprenderse dos vocabularios
  segun como fallo por dentro.

  LO QUE NO DICE, Y ES A PROPOSITO

  No nombra a la base de datos. La primera version decia "lo mas probable es que
  el panel no este pudiendo hablar con la base de datos", y eso era **adivinar
  en voz alta**: desde aqui no se sabe por que no llego el contenido. Puede ser
  la base, puede ser que la funcion se pasara de tiempo, puede ser la red del
  telefono. Un aviso que nombra un culpable que no ha comprobado manda a buscar
  donde no es — que es justo lo que hizo perder tres vueltas en la sesion 10.

  Dice lo unico que consta —que no cargo, que no se perdio nada, que recargar es
  seguro— y manda a la pantalla que SI puede medirlo.
*/
function Tardanza() {
  return (
    <div className="panel-tardanza" role="status">
      <p className="t-heading text-lg">Esto esta tardando mas de lo normal</p>
      <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--panel-tenue)" }}>
        No se perdio nada: lo que ya estaba guardado sigue ahi, y recargar la
        pagina es seguro. Si al recargar sigue igual, la pantalla de estado dice
        que esta fallando.
      </p>

      <div className="mt-5 grid gap-2">
        <a href="/panel/estado" className="panel-boton panel-boton-suave">
          Ver que le pasa al sistema
        </a>
        <a href="/panel" className="panel-boton panel-boton-suave">
          Volver a los pedidos
        </a>
      </div>
    </div>
  );
}
