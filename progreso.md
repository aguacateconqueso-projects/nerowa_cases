# Progreso — Nerowa Cases

Bitacora del proyecto. **Se lee al abrir cada sesion y se actualiza antes de cerrarla.**
Si algo no esta escrito aqui, no paso.

---

## Estado actual

**Fase 1 de 7 — cerrada.** La pagina de espera esta **publicada en
`nerowacases.com`**. El repositorio, Next.js, Tailwind y el despliegue en Vercel
funcionan.

**Fase 3 — el hero, en marcha.** La tienda vive en **`/store`**, no en la raiz:
el dominio sigue sirviendo solo la pagina de espera y las dos cosas conviven en
el mismo preview de Vercel. El hero esta completo con un **estuche de relleno**;
el modelo real todavia no existe.

El hero entro por el
[PR #10](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/10) y se
**rehizo entero en la sesion 9**, en tres tandas, todas mezcladas a `main` el
2026-09-12:

| PR | Que trae |
|---|---|
| [#12](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/12) | Los siete puntos de Alfredo: menu de una sola placa que se estira, logo que lo abre, estuche que se agarra de verdad, pagina a todo color con haces negros, scroll sin superposicion, cinta de color pegada, y la zona de compra reordenada |
| [#12](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/12) (2.ª tanda) | El panel de compra de pie a la derecha, y fuera el boton "Inspect" |
| [#13](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/13) | La rueda vuelve a bajar la pagina; acercar queda solo en el pellizco |

**Lo que hay hoy en `main` es el hero que Alfredo dio por bueno a la vista**, con
un **estuche de relleno**: el modelo real todavia no existe.

**Fase 7 — el panel, disenada y sin codigo.** En la sesion 10 se diseno entero
en **`docs/panel-nerowa.md`**: tres pestanas (ventas de la web, tiendas
mayoristas, administracion), entregado como **aplicacion instalable en el
telefono**, con **Telegram** como canal de los avisos urgentes y **escalado** para
que ningun pedido se quede parado. Sale en nueve subfases, de la 7.0 a la 7.8, y
**empieza por pedidos cargados a mano**, para que sirva antes de que la tienda
venda su primer estuche. Falta que Adrian lo apruebe o lo corrija.

**De aqui en adelante el dominio no se toca.** `nerowacases.com` sirve la pagina
de espera y nada mas. Todo lo que se construya a partir de ahora se revisa en
Vercel, no en el dominio. Ver "Entornos y publicacion".

---

## Lo primero de la proxima sesion

**Lo que bloquea ahora mismo: la cadena de conexion de Supabase en Vercel.**
El panel entero esta escrito y desplegado, pero sin base no guarda nada. Hay que
entrar en `nerowacases.com/panel/estado` (solo Adrian) y leer el veredicto: la
pantalla nombra el fallo concreto y que hacer. La cadena buena es la del
**Transaction pooler** — servidor terminado en `pooler.supabase.com`, puerto
`6543`, usuario `postgres.<ref>` — **no** la conexion directa
(`db.<ref>.supabase.co`), que solo tiene IPv6 y desde Vercel no se alcanza.

**Cuando la base responda, seguir por la fase 7.1**: meter pedidos a mano en la
pestana 1. Es lo unico del panel que no depende de ningun dato que falte.

**Lo que sigue faltando y no lo puedo suplir yo**: **los 14 colores con nombre y
valor exacto**, el `.glb`, los datos fiscales de la empresa y el desglose de los
1.000 EUR de importacion. Ver el apartado 14 de `docs/panel-nerowa.md`.

**Preguntarle a Alfredo que quiere cambiar del hero rehecho.** Lo aprobo a la
vista en la sesion 9 — *"me gusta lo que hiciste, visualmente"* — y los tres PR
estan mezclados, asi que lo que hay en `main` es lo que el vio. Pero ya avisa dos
veces que va cambiando sobre la marcha: **no adelantar trabajo sobre el hero sin
su lista.**

**Recordarle las dos cosas que tiene que hacer el, y que no puede hacer nadie
mas:**

1. **Abrir el preview en un iPhone y probar el pellizco.** Es lo unico de la
   sesion 9 que no se pudo comprobar aqui. Safari entiende el pellizco como
   acercar la PAGINA entera, porque la etiqueta de ventana de Next deja escalar.
   Las guardas estan puestas (`touchmove` no pasivo que corta solo con dos dedos
   o mas, mas `gesturestart` / `gesturechange`) y probadas en Chromium, pero el
   aparato real hay que mirarlo. Si falla, se arregla en `case-scene.tsx`.
2. **Encender Vercel Authentication** en el panel, para que los previews no se
   abran solo con tener la URL.

**Y las dos decisiones que tome yo y siguen sin veredicto:**

1. **Sobre amarillo, oro y crema el estuche se apoya poco en el fondo**, porque
   son el mismo color. Es la consecuencia directa de "la pagina full color en
   reaccion al color del estuche". Lo que hoy los separa es el pozo negro del
   centro (`.store-hero-well`) y los haces. Sobre azul marino, vinotinto o morado
   se ve perfecto. **Si molesta, la salida es girar el tono del fondo unos grados
   respecto al del estuche** — una linea en `heroSurfaceFor`. No lo hice porque
   pidio el mismo color, no uno parecido.
2. **El boton "Add to cart" sigue dorado en los catorce colores.** Es lo unico de
   la pagina que no reacciona al color del estuche, y ahora se nota mas que antes
   porque el resto del panel si se da vuelta entero.

**Volver a pedir lo que bloquea cerrar la fase 3**, que no lo puedo suplir yo:

| Que falta | Por que bloquea |
|---|---|
| El `.glb` del estuche | Hoy corre un estuche de relleno. Alfredo esperaba dinero el lunes para mandarlo a modelar |
| Los 14 colores: nombre comercial y valor exacto | Son la entrada de la formula del fondo. Sin ellos, tanto la paleta como el color del hero son inventados |

**Lo que NO hay que rehacer aunque cambie el diseno.** Estas piezas estan
verificadas y son independientes de como se vea el hero:

- `src/lib/store/palette.ts` — la formula del color, con las dos superficies (el
  hero a todo color y el fondo de lectura). Si cambia la paleta, cambian los
  valores de entrada, no la formula. La comprobacion de contraste corre sola:
  `enforceContrast` empuja el hero hasta que el texto cumple AA, asi que un color
  nuevo no puede publicar texto ilegible.
- `src/components/store/store-context.tsx` — el estado y el carrito.
- `src/components/store/scene/case-scene.tsx` — el reparto de gestos. Esta medido
  con eventos de verdad y documentado en su cabecera; **no se toca por intuicion**.
- La separacion entre escena y modelo: `case-scene.tsx` tiene el comportamiento y
  `case-model.tsx` + `case-shape.ts` tienen la forma. El `.glb` entra por el
  segundo sin tocar el primero.

**Y lo que si es desechable sin pena:** el estuche de relleno, los seis textos de
preguntas frecuentes, las tres filas de envios y los catorce colores inventados.
Todo eso esta rotulado como marcador de posicion en la propia pagina.

**De la fase 2 (sistema de diseno) sigue pendiente** lo que no depende de nadie:
escala tipografica completa, grid de 8 px y tokens de espaciado, y tokens
estructurales (radios, bordes, sombras, capas). La mitad de color ya quedo
resuelta por `palette.ts`; lo que falta son los valores.

---

## Condiciones de trabajo

1. **Cada tanda de cambios entra por un pull request NUEVO contra `main`.** No es
   uno por sesion: es uno **por cada cosa que Alfredo pide**, aunque sean tres el
   mismo dia.

   **Desde el 2026-09-16 hay un guardia mecanico**, porque esta regla se
   incumplio cuatro veces en la sesion 10 y escribirla aqui no basto:
   `.githooks/pre-push` corta el empujon si el pull request de la rama actual ya
   se mezclo, y dice los cuatro comandos que hay que correr en su lugar. Se
   configura solo con `npm install` (script `prepare`), asi que **lo primero de
   cada sesion sigue siendo instalar las dependencias**.

   **El motivo es como los revisa, y por eso no se negocia:** cada PR trae su
   propio despliegue de preview en Vercel, con URL propia. **Sin PR nuevo no hay
   URL nueva que abrir.** Apilar commits sobre un PR ya mezclado deja a Alfredo
   sin forma de mirar lo que pidio — paso en la sesion 9 y hubo que rehacerlo.

   De ahi sale una regla practica: **si el PR de la rama en la que estas ya se
   mezclo, el trabajo siguiente NO va encima.** Se arranca rama nueva desde
   `main` (`git fetch origin main && git checkout -b <rama-nueva> origin/main`) y
   se abre PR nuevo.

   Mezclar a `main` no cambia lo que ve el publico: la tienda vive en `/store` y
   la raiz sigue siendo la pagina de espera. Ver "Entornos y publicacion".
2. Idioma de trabajo: **espanol neutro**. El sitio publico va en **ingles**.
3. El despliegue se hace en **Vercel**.
4. Cualquier duda se pregunta **antes** de aplicar el cambio.
5. Este archivo se actualiza al cerrar cada sesion.
6. **La rama de la sesion se mezcla antes de cerrarla.** Cada sesion nueva
   arranca de un clon limpio sobre `main`, asi que lo que se quede en una rama
   sin mezclar no existe para la sesion siguiente, ni el codigo ni lo escrito en
   este archivo. **Una rama sin mezclar es trabajo perdido en la practica**, y se
   recupera solo si alguien se acuerda del nombre exacto de la rama. Un PR nuevo
   por sesion sigue siendo la regla; lo que no puede quedar pendiente es el
   merge.

---

## Entornos y publicacion

**Regla, a partir del 2026-09-11:** el dominio publico muestra **solo** la
pagina de espera. Lo que se va construyendo se mira en Vercel.

| Entorno | Que muestra | Quien entra |
|---|---|---|
| `nerowacases.com` (produccion) | Solo la pagina de espera | Cualquiera. Es lo que ve quien llega de Instagram |
| Preview de Vercel (una URL por rama) | La rama que se este trabajando | Solo quien tenga la URL, y con la proteccion activada solo quien tenga cuenta en el proyecto |

**Como funciona.** Cada push a una rama que no sea `main` genera en Vercel un
despliegue de preview con URL propia (`...-git-<rama>-<cuenta>.vercel.app`). El
dominio no se entera: sigue sirviendo el ultimo despliegue de produccion.

**Que hay que dejar claro sobre los previews:**

- Vercel les manda `X-Robots-Tag: noindex`, asi que **no salen en Google**.
- Pero por defecto **quien tenga la URL puede abrirla**. Para cerrarlas de
  verdad hay que encender **Vercel Authentication** en el panel del proyecto
  (Settings → Deployment Protection): con eso, entrar exige iniciar sesion con
  una cuenta que tenga acceso al proyecto. Es ajuste del panel, no del
  repositorio; lo tiene que hacer Alfredo. La proteccion por contrasena es otra
  cosa y va en plan pago.

**La alternativa de la ruta oculta** (montar lo nuevo en produccion bajo un
camino que nadie adivine) se descarta como via principal: mete trabajo sin
terminar en el mismo despliegue que ve el publico, y un error de ruta lo deja
a la vista. Si algun dia hace falta, se hace con `middleware.ts` y contrasena
en variable de entorno, no solo con un nombre raro de carpeta.

---

## Decisiones tomadas

| Fecha | Decision | Motivo |
|---|---|---|
| 2026-09-08 | Rama base `main`, todo lo demas por PR | Sin rama base no se pueden abrir pull requests |
| 2026-09-08 | Next.js 16 + TypeScript + Tailwind v4 | Rutas de servidor para Stripe y correos, PWA para el panel, despliegue nativo en Vercel |
| 2026-09-08 | El estuche del hero se resuelve con un **modelo 3D** (`.glb`) | Un solo archivo cubre los 14 colores y las 3 vistas; la inclinacion y el giro de 360 grados son reales |
| 2026-09-08 | Entrega **por fases**, la vitrina primero | Cada fase sale a Vercel y se revisa viva |
| 2026-09-11 | Pagina de espera en `/` **y** en `/underconstruction` | Quien llega de Instagram entra por la raiz del dominio; el alias sirve para compartir el enlace suelto |
| 2026-09-11 | Fondo de haces dorados **determinista**, no aleatorio | Con posiciones al azar la pagina salia negra en una carga y mostaza en la siguiente |
| 2026-09-11 | El logo se cambia en una sola linea (`src/lib/brand.ts`) | Nadie tiene que tocar una pagina para cambiar el logo |
| 2026-09-11 | El logo vive recortado en `public/brand/logo.png` | El archivo original traia 890 px de margen transparente; sin recortar deja un hueco enorme encima y debajo |
| 2026-09-11 | **Archivo** como tipografia de todo el proyecto | Decision de Alfredo. Se carga con `next/font`, servida desde el mismo dominio |
| 2026-09-11 | Sistema tipografico en clases (`.t-heading`, `.t-label`, `.t-body`, `.t-figures`) | Para que un cambio de tamano se haga en un sitio y no en catorce. La norma esta en `docs/sistema-visual.md` |
| 2026-09-11 | Logo blanco plano, arriba a la izquierda, 140 px / 110 px | Decision de Alfredo. El blanco sale por filtro CSS sobre el mismo archivo dorado, sin segunda version |
| 2026-09-11 | **Se retira el tope de dos animaciones por pagina** | Decision de Alfredo: no aplica a este proyecto. El criterio pasa a ser el juicio, no un numero |
| 2026-09-11 | El boton principal se queda **rectangular**, sin silueta | Se probo con el perfil del estuche y Alfredo lo descarto: si no es igual al estuche real, no sirve |
| 2026-09-11 | **El dominio queda congelado en la pagina de espera**; todo lo demas se revisa en previews de Vercel | Decision de Alfredo. Lo que llega de Instagram no puede toparse con la tienda a medio hacer |
| 2026-09-12 | La tienda se monta en **`/store`**, sobre la rama de trabajo | Resuelve el punto que bloqueaba la fase 2 sin tocar `main` ni crear una rama larga: en el mismo preview, `/` es la pagina de espera y `/store` es lo nuevo. Pasar a produccion sera cambiar una linea en `src/app/page.tsx` |
| 2026-09-12 | **El fondo toma el color del estuche oscurecido y desaturado**, no el color literal | Decision de Alfredo entre tres opciones. Es lo unico que garantiza que el estuche no se pierda contra el fondo y que el texto cumpla AA en los catorce colores sin revisarlos de a uno |
| 2026-09-12 | **Sin cortina de entrada.** La entrada es el zoom-out del estuche girando | Decision de Alfredo. Una sola idea en la apertura; la cortina alargaba la espera antes de ver el producto |
| 2026-09-12 | **Dos vistas: cerrado y abierto.** La de "detalle" queda fuera | Decision de Alfredo. La tercera vista depende de que el modelo real tenga herrajes que aguanten un acercamiento, y todavia no se sabe |
| 2026-09-12 | El boton principal dice **"Add to cart"** y no "Buy now" | Decision de Alfredo: hoy la gente compra de a varias cajas y mandarlos a pagar despues de la primera rompe esa compra |
| 2026-09-15 | El panel se entrega como **PWA instalable**, no como app de tienda | Decision de Adrian. Esta en manos de Alfredo el dia que este lista, sin costo fijo ni revision de Apple. Si las notificaciones del iPhone fallan en la practica, se envuelve con Capacitor sin rehacer codigo |
| 2026-09-15 | **Telegram es el canal principal de los avisos urgentes**; la notificacion web es el extra | Alfredo usa iPhone, y ahi el aviso web solo existe si la app esta instalada en la pantalla de inicio, y se apaga en silencio si la quita. Un panel cuyo unico aviso puede desaparecer sin que nadie se entere no sirve |
| 2026-09-15 | El panel arranca por la **pestana 1 con pedidos cargados a mano** | Decision de Adrian. Sirve desde el dia uno para lo que Alfredo ya vende por mensaje directo. Cuando llegue Stripe, esos pedidos entran por el mismo sitio sin rehacer nada |
| 2026-09-15 | **Solo Adrian confirma un reembolso.** Alfredo hace todo lo demas de la devolucion | Decision de Adrian. Es la unica operacion que saca dinero y no tiene vuelta atras. No le quita autonomia a Alfredo en su trabajo |
| 2026-09-15 | El portal de tiendas es **catalogo y pedido, sin pago en linea** | Decision de Adrian. Las tiendas piden, reciben factura y pagan por transferencia. Un segundo checkout con Stripe seria mucho trabajo para un flujo que no usarian |
| 2026-09-15 | Los graficos miden **ganancia real**, no ventas | Decision de Adrian. Obliga a cargar los costos de envio y produccion en la pestana 3, y a cambio el numero dice cuanto quedo y no cuanto entro |
| 2026-09-15 | **Sin chat interno.** Cada nota va pegada a un pedido, una tienda o una tarea | Decision de Adrian. Dos personas que ya tienen WhatsApp no abren un chat aparte, y lo que se escriba ahi queda lejos del pedido del que habla |
| 2026-09-15 | **Sin contrasenas en el panel.** Se entra con enlace de un solo uso al correo y la sesion dura meses | Alfredo no va a recordar una contrasena: va a terminar anotada en algun sitio, que es peor que no tenerla |
| 2026-09-15 | **Precios fijados:** 180 EUR sin IVA al publico, y a tiendas 120 EUR de 1 a 5, 110 EUR de 6 a 15, 100 EUR de 16 en adelante. Envio siempre aparte | Datos de Adrian. Con 34 EUR de costo, quedan ~142 EUR por venta web y 66-86 EUR por venta a tienda |
| 2026-09-15 | **El costo de un estuche es 34 EUR, no 24 EUR**, y el panel lo calcula **por lote de importacion** | Los 24 EUR son precio de fabrica en China; traer el lote a Vilnius costo 1.000 EUR mas por cada 100 unidades. Usar 24 inflaria el margen un 42%. Y como el flete y la aduana cambian con cada lote, un numero fijo ensuciaria todo el historico al cambiar de ruta |
| 2026-09-15 | **En la tienda se muestra el precio con IVA** (217,80 EUR), no los 180 EUR netos | Vendiendo a consumidores en la Union Europea el precio que se enseña tiene que ser el final con impuestos. El numero de hoy en el hero es un marcador de posicion y hay que cambiarlo |
| 2026-09-15 | **Los numeros y graficos no van en la pantalla de pedidos**, sino a un toque de distancia | Unica cosa de la lista de Adrian que se movio de sitio. La pestana 1 es la cola de trabajo: si arriba hay un grafico, lo primero que ve Alfredo al abrir ya no es lo que le falta despachar |

---

## Fases

| # | Fase | Contenido | Estado |
|---|---|---|---|
| 1 | Andamiaje | Repositorio, Next.js, Tailwind, `progreso.md`, despliegue en Vercel, pagina de espera | **Hecha** — publicada en `nerowacases.com` el 2026-09-11 |
| 2 | Sistema de diseno | Paleta, escala tipografica, grid de 8 px, tokens, formula del fondo por color | Pendiente |
| 3 | Hero | Escena 3D, selector de vista, selector de color, boton de compra | **En marcha** — completo con estuche de relleno; falta el `.glb` real y los 14 colores |
| 4 | Bloques y pie | Los 6 bloques al bajar, el menu y el pie | Pendiente |
| 5 | Stripe | Salida al checkout alojado y las dos pantallas de vuelta | Pendiente |
| 6 | Apoyo y correos | 4 paginas de apoyo y 3 plantillas de correo | Pendiente |
| 7 | Panel del dueno | Tres pestanas (ventas web, mayoristas, administracion) mas los numeros, instalable en el telefono. Disenada en `docs/panel-nerowa.md`, en 9 subfases de la 7.0 a la 7.8 | **Disenada** — sin codigo todavia |

---

## Bitacora

### Sesion 1 — 2026-09-08

**Punto de partida:** repositorio vacio. Cero commits, cero ramas en el remoto.

**Hecho:**

- Se creo la rama base `main` con `README.md` y `.gitignore`.
- Se archivo la especificacion en `docs/estructura-web.md`.
- Se levanto el andamiaje: Next.js 16.3.4, React 19.2, TypeScript, Tailwind v4, ESLint.
- Estructura `src/app` con App Router y alias de importacion `@/*`.
- Pagina de espera minima sobre fondo negro. **No es diseno**: es un marcador
  de posicion para que el despliegue tenga algo que mostrar.
- Se creo este archivo.

**Decidido en esta sesion:** las cuatro decisiones de la tabla de arriba.

**No hecho a proposito:** ningun token de diseno, ninguna tipografia definitiva
y ningun contenido real. Eso entra en la fase 2.

### Sesion 2 — 2026-09-11

**Punto de partida:** el andamiaje seguia sin llegar a `main`, asi que el
despliegue de Vercel no tenia nada que construir.

**Hecho:**

- Pagina de espera en ingles, en `/` y en `/underconstruction`. Las dos rutas
  renderizan el mismo componente (`src/components/under-construction.tsx`).
- Fondo `BeamsBackground` (`src/components/ui/beams-background.tsx`): haces de
  luz en canvas, negro y dorado, con velo fijo y vineta encima.
- Tokens de dorado en `globals.css` (`--gold`, `--gold-bright`, `--gold-deep`).
- Boton que abre el correo a `info@nerowacases.com`, mas la direccion en texto
  debajo por si el aparato no tiene cliente de correo configurado.
- `public/brand/` y `public/images/` con instrucciones para subir archivos.
- Wordmark tipografico provisional mientras no haya logo.

**Comprobado:** `typecheck`, `lint` y `build` limpios; las dos rutas quedan
estaticas; sin desbordamiento horizontal a 320, 390 y 1440 px; sin errores de
consola; el `mailto` correcto en las dos rutas.

**Cuidado con el fondo:** los haces se dibujan en carriles fijos calculados
desde el indice, no al azar. La primera version usaba `Math.random()` y el
resultado cambiaba en cada carga, entre casi negro y mostaza. Tambien se quito
la animacion del velo por el mismo motivo. Si alguien vuelve a meter azar ahi,
vuelve el problema.

**No hecho a proposito:** no se toco la fase 2. Los valores de dorado que hay
son los minimos para esta pagina, no el sistema de diseno.

### Sesion 3 — 2026-09-11

**Punto de partida:** la pagina de espera ya estaba en `main` y desplegada, pero
sirviendo un 404 de plataforma en Vercel (ver "Abierto" mas abajo). Alfredo
subio el logo y pidio el boton perlado.

**Hecho:**

- Logo real en la pagina. El archivo subido (`Firefly_RemoveBackground.png`,
  1320 x 1179) traia el wordmark en una franja central con casi 900 px de
  margen transparente. Se recorto a su caja real, 1118 x 288, y quedo en
  `public/brand/logo.png`. El original sigue en el historial, en el commit
  `78099ec`.
- Se quito el wordmark tipografico provisional: ya no tenia uso y `Logo` era
  una rama muerta.
- Se quito el filete que dibujaba la pagina: el logo trae el suyo.
- `PearlButton` (`src/components/ui/pearl-button.tsx`): boton perlado en dorado,
  con degradado de cuatro paradas, reflejo interior, resplandor exterior y un
  barrido de luz cada 4,5 s. Sirve como enlace o como boton segun reciba `href`.
- `sizes` en el logo: sin eso Next servia la variante de 3840 px del srcset.

**Comprobado:** `typecheck`, `lint` y `build` limpios; sin desbordamiento a 320,
390 y 1440 px; sin errores de consola; el `mailto` intacto; el barrido revisado
fotograma a fotograma congelando la animacion.

**Abierto — ojo con esto:**

1. **Tres animaciones en una pagina.** La convencion del proyecto dice maximo
   dos. Hoy hay tres: los haces del fondo, la entrada del contenido (`rise-in`)
   y el barrido del boton. Se dejo asi a proposito, porque el barrido solo por
   `:hover` no se ve nunca en telefono, que es de donde llega el trafico. Si
   hay que bajar a dos, lo que sobra es `rise-in`.
2. **El 404 de Vercel.** El despliegue de produccion sale **Ready** y el log
   dice `Detected Next.js version: 16.3.4`, o sea que el framework si se
   detecta, pero la pagina responde `404: NOT_FOUND` de plataforma. Falta ver
   el final del log del build para saber que publica.

**Copy definitivo (mismo dia, despues):** Alfredo mando el texto y entro tal
cual. El titular pasa a ser "Not open yet. Already selling." y el cuerpo son
cuatro preguntas en serie que rematan en "Yeah. Nobody else was going to make
it.". Tambien se quito la flecha del boton: en telefono se movia con el barrido
de luz. Y se quito el pie, que repetia la linea de Vilnius.

Las cuatro preguntas se probaron alineadas a la izquierda, para que se viera la
repeticion de "A double bass case" al arranque de tres lineas seguidas. **Alfredo
las quiso centradas y centradas quedaron.** Van con `text-balance`, que reparte
las lineas al cortar y evita la palabra huerfana suelta debajo.

### Sesion 4 — 2026-09-11

**Hecho:**

- **Archivo** como tipografia de todo el proyecto, con `next/font`.
- Sistema tipografico en `globals.css` y la norma escrita en
  `docs/sistema-visual.md`. Esto rige de aqui en adelante, no solo esta pagina.
- Logo blanco plano, arriba a la izquierda, 140 px en escritorio y 110 en movil.
  El blanco sale de un filtro CSS sobre el mismo archivo dorado: un solo
  archivo, no dos versiones por color.
- El boton adopta el estilo de etiqueta del sistema (12 px, tracking +8%).

**Comprobado en el navegador, no de memoria:** etiqueta en Archivo 500 a 12 px
con 0,96 px de tracking (el +8% exacto); texto en Archivo 400 a 17 px; titular
en Archivo 700 con -0,24 px (el -1% exacto); la fuente carga desde el propio
dominio, sin errores de consola; sin desbordamiento a 320, 390 y 1440 px.

### Sesion 5 — 2026-09-11

**Hecho:**

- **Excepcion del logo en la pagina de espera**, por decision de Alfredo: aqui
  va centrado, a 360 px y en dorado. La norma (blanco plano, 140 px, arriba a
  la izquierda) sigue en pie para todo lo demas y quedo escrita como excepcion
  acotada en `docs/sistema-visual.md`.
- **Favicon.** El archivo subido (`public/images/favicon.png`, 278 x 260) no era
  cuadrado. Se recorto a su caja real y se centro sobre un lienzo cuadrado con
  margen: `src/app/icon.png` a 256 px y `src/app/favicon.ico` a 48. Los dos van
  en `src/app/` y no en `public/`, que es donde Next los detecta por nombre.
- **Boton nuevo: `LiquidMetalButton`.** Rectangular, esquinas rectas, fondo
  negro, borde y texto dorados. El borde es un degradado de oro que se recorre
  despacio, con un reflejo casi blanco que lo cruza. Se hace con dos capas de
  fondo y `background-clip`, sin pseudo-elementos y sin SVG.
- **`PearlButton` eliminado.** Lo reemplaza el nuevo; dejarlo era codigo muerto.

**Comprobado:** `typecheck`, `lint` y `build` limpios; el boton con radio 0 y
texto en `#f0c56b`; el `mailto` intacto; las dos etiquetas de icono emitidas y
`/favicon.ico` sirviendo 200 `image/x-icon`; sin desbordamiento a 320, 390 y
1440 px; sin errores de consola; el recorrido del borde revisado congelando la
animacion en tres puntos del ciclo.

**Sigue abierto:** las tres animaciones contra el maximo de dos, y el 404 de
produccion en Vercel.

### Sesion 6 — 2026-09-11

**Hecho:**

- **Se retira el tope de dos animaciones**, en el README y en
  `docs/sistema-visual.md`. Queda el respeto a `prefers-reduced-motion`.

**Probado y descartado: el boton con la silueta del estuche.** Se dibujo el
perfil del estuche puesto en horizontal (vertical no cabe: el producto es
1:10 y el texto no entra). Alfredo lo vio y lo descarto con un criterio claro:
**si la silueta no es igual al estuche real, no le sirve**; una version
"inspirada en" no cumple. El boton vuelve al rectangular.

Queda anotado en `docs/sistema-visual.md` para que nadie lo reintente. Si algun
dia se retoma, tendria que ser con el estuche de verdad y en un sitio donde
quepa entero, no en un boton.

**El 404 de Vercel, cerrado.** Alfredo mando el log completo del build del
commit `ff7b068`, que es `main`. El build esta sano de punta a punta: compila,
TypeScript pasa, prerenderiza las cuatro rutas (`/`, `/_not-found`,
`/icon.png`, `/underconstruction`), escribe la salida y despliega. **No hay
nada en el build que explique un 404.** La conclusion es que el 404 que se vio
venia de un despliegue anterior, de cuando `main` todavia no tenia la
aplicacion. Si reapareciera, el problema estaria en el dominio o el alias, no
en el build.

### Sesion 7 — 2026-09-11 y 12

**Hecho:**

- **Cambio de copy en la linea de envio.** "Shipped from Vilnius to the European
  Union and the United Kingdom." pasa a **"Shipped from Europe."** en la pagina
  de espera (`src/components/under-construction.tsx`). La misma frase iba
  abreviada en la descripcion de metadatos (`src/app/layout.tsx`, tambien usada
  por Open Graph y Twitter) y se cambio igual, para que la tarjeta que sale al
  compartir el enlace no contradiga a la pagina.

No se toco `README.md` ni `docs/estructura-web.md`: son documentos internos en
espanol y ahi el despacho desde Vilnius es un dato del negocio, no copy publico.

**Comprobado:** `typecheck`, `lint` y `build` limpios; las cuatro rutas siguen
prerenderizadas como estaticas.

**La pagina de espera quedo publicada en `nerowacases.com`.** Alfredo la subio
al dominio y responde. Con eso la fase 1 se cierra.

**Regla nueva (decision de Alfredo):** el dominio se queda ahi. `nerowacases.com`
sirve la pagina de espera y nada mas; de aqui en adelante la web se sigue
armando, pero se mira en los previews de Vercel, no en el dominio. La mecanica
quedo escrita arriba, en "Entornos y publicacion".

**Copy del cierre, cambiado despues (texto de Alfredo, entra tal cual).** El
parrafo final era uno solo: "The website isn't finished. The case is. Write to
us and we'll sell you one today.". Ahora son dos lineas seguidas:

1. "The website is coming, the case is here already"
2. "Write to us and we'll sell you one today."

Van con 16 px entre ellas, la mitad de la separacion que traen los demas
parrafos, para que se lean como un bloque y no como dos ideas sueltas.
**La primera linea va sin punto final**, tal como la mando Alfredo; queda
anotado porque las demas si lo llevan y a simple vista parece un descuido.

**Lo que esa regla obliga a resolver (ver "Pendiente de decidir"):** hoy la
condicion 1 dice que todo entra por pull request contra `main`, y `main` es lo
que Vercel publica en el dominio. Si se sigue asi al pie de la letra, el primer
PR de la fase 2 que se mezcle cambia lo que ve el publico. Hay que separar
las dos cosas antes de empezar la fase 2.

**Como cerro la sesion.** Dos pull requests mezclados a `main` y publicados en
el dominio: el #7 (linea de envio) y el #8 (cierre en dos lineas, mas esta
bitacora). `main` esta en `2f1d90d`. No queda nada a medio hacer en el codigo.

---

## Pendiente de Alfredo (bloquea trabajo)

Nada de esto lo puedo inventar. Cada linea que falte frena una fase.

| Que hace falta | Para que fase | Estado |
|---|---|---|
| Modelo 3D del estuche en `.glb`, o las fotos para mandarlo a modelar | 3 | Falta — **es lo unico que bloquea el hero**. Mientras, corre un estuche de relleno |
| **Abrir el preview en un iPhone de verdad y probar el pellizco** | 3 | Falta — es lo unico de la sesion 9 que no pude comprobar yo. Detalle abajo |
| Textura real del fondo | 3 | Falta — hoy es un trenzado hecho en CSS |
| Los 14 colores del catalogo: nombre comercial y valor exacto | 2 y 3 | Falta |
| Medidas exteriores, medida util interior, peso y materiales | 4 | Falta |
| Foto del interior con los dos arcos dentro | 4 | Falta |
| Musicos de "Quien lo usa": nombre, instrumento y foto | 4 | Falta |
| Las 6 preguntas frecuentes que hoy llegan por mensaje directo | 4 | Falta |
| Precios de envio por zona (UE y Reino Unido) | 4 y 5 | Falta |
| Texto de "Quienes somos", corto y sin narrativa de taller | 4 | Falta |
| Cuenta de Stripe y claves de prueba | 5 | Falta |
| Datos legales de la empresa (razon social, domicilio, identificacion fiscal) | 6 | Falta |
| Existencias iniciales por color | 7 | Falta |

## Pendiente de decidir

- ~~Como se separa lo publicado de lo que se esta armando.~~ **Resuelto el
  2026-09-12 por la via de la ruta:** la tienda vive en `/store` y la pagina de
  espera se queda en `/`. Las dos conviven en el mismo despliegue, asi que no
  hace falta ni rama larga ni desconectar el dominio. El dia que la tienda salga,
  `src/app/page.tsx` pasa a renderizar `<StorePage />` y `/store` se borra.
  Mientras tanto `/store` lleva `robots: noindex`.
- **Encender Vercel Authentication** en el proyecto para que los previews no se
  abran solo con tener la URL. Lo hace Alfredo en el panel.
- Tipografias definitivas (fase 2). Hoy corre una pila de sistema, provisional.
- ~~Formula exacta del fondo oscuro y desaturado a partir del color del estuche
  (fase 2).~~ **Resuelta y ampliada el 2026-09-12:** ahora son dos superficies,
  el hero a todo color y el fondo de lectura oscuro. Las dos en `palette.ts`.
- ~~Cual de las tres alternativas de movimiento en movil se implementa (fase 3).~~
  **Resuelto el 2026-09-12:** ninguna de las tres, y sin interfaz de por medio.
  `touch-action: pan-y` reparte el gesto solo. Razon y medicion en
  `case-scene.tsx`.
- Proveedor de base de datos y de correo para el panel y las reservas (fases 5 a 7).

### Sesion 8 — 2026-09-12

**Punto de partida:** la pagina de espera publicada y la fase 2 sin arrancar,
bloqueada por no saber donde montar lo nuevo sin tocar el dominio.

**Lo primero que se resolvio fue eso, y no hizo falta ninguna de las dos formas
que estaban anotadas.** La tienda se monta en **`/store`**: en el mismo preview
de Vercel, `/` sigue siendo la pagina de espera y `/store` es la tienda. No hay
rama larga que mantener ni despliegue manual que recordar, y la vuelta atras es
borrar una carpeta.

**Hecho — el hero completo, en `/store`:**

- **Sistema de color reactivo** (`src/lib/store/palette.ts`). Del color del
  estuche salen el fondo, el texto y el acento. El fondo conserva el tono, corta
  la saturacion a un tercio con tope en 0.20 y aplasta la luminosidad a la
  franja 0.05–0.085. Los grises se van a negro puro en vez de inventarles un
  tono. Como el fondo nunca pasa del 10% de luminosidad, el texto claro cumple
  AA en los catorce colores sin revisarlos de a uno; `contrastRatio` esta escrita
  en el mismo archivo para poder comprobarlo.
- **Escena 3D** (`src/components/store/scene/`). Entrada con zoom-out y una
  vuelta entera sobre el eje, aterrizaje en diagonal de la esquina superior
  derecha a la inferior izquierda, seguimiento del cursor muy leve, deriva lenta
  cuando nadie toca nada, y arrastre para inspeccionar que **mantiene la pose al
  soltar** y solo vuelve a la diagonal con el scroll. Cambio de color con una
  vuelta completa. Sin mapa de entorno: cuatro luces explicitas, para no
  descargar un HDRI en cada visita.
- **Estuche de relleno** (`case-shape.ts` + `case-model.tsx`). No es un cilindro:
  es la silueta sacada de las fotos, proporcion 1:7, extremos redondeados, panza
  asimetrica, banda negra en la costura, interior con varilla y cintas, cierres y
  anillas. La tapa gira media vuelta sobre la bisagra del canto largo. Cuando
  llegue el `.glb`, se borran esos dos archivos y nada mas.
- **Cabecera flotante**: menu de hamburguesa y logo en un bloque de vidrio,
  panel desplegable con las secciones y la invitacion a comprar destacada, y el
  boton **"Back to the case"** que aparece pasado el hero.
- **Controles de compra** abajo a la derecha: catorce muestras con el nombre del
  color apareciendo encima al pasar por encima, aviso de fidelidad de color,
  selector de vista y "Add to cart" con el precio.
- **Carrito** en cajon lateral, con cantidades y persistencia en el navegador.
  La salida a pagar esta desactivada a la vista hasta la fase de Stripe.
- **Fondo con textura**: trenzado diagonal en CSS que se desplaza 14 px en 40 s,
  halo que respira en 20 s, y vineta. Todo se apaga con `prefers-reduced-motion`.
- **Secciones al bajar**: que es, especificaciones, envios, seis preguntas
  frecuentes en acordeon, contacto y pie.

**Comprobado en el navegador, no de memoria:** `typecheck`, `lint` y `build`
limpios; las cinco rutas estaticas; sin desbordamiento horizontal a 390 y
1440 px; cero errores de consola; el arrastre gira el estuche, la pose se
mantiene 1,5 s despues de soltar y el scroll la devuelve a la diagonal.

**Dos fallos encontrados mirando, que no habrian salido leyendo el codigo:**

1. **La etiqueta de la vista seleccionada desaparecia al pasarle el raton por
   encima.** `.store-view:hover` lleva una pseudo-clase y por eso pesa mas que
   `.store-view--on`, asi que le pintaba el texto del mismo color que su fondo.
   Se arreglo acotando el hover con `:not(.store-view--on)`.
2. **El logo salia del tamano de una uña en telefono.** El boton "Back to the
   case", aunque invisible, seguia ocupando sitio en la fila y empujaba al logo
   contra el carrito. Ahora va colocado en absoluto, fuera del flujo.

**Todo lo que hay de contenido es marcador de posicion** y esta rotulado como
tal en la propia pagina: los catorce colores, las medidas, los materiales, los
precios de envio y las preguntas. Los valores que faltan van con un guion largo
y no con un numero inventado, que en una tabla de especificaciones se lee como
verdadero y termina publicado.

**Lo que bloquea cerrar la fase 3:** el `.glb` del estuche y los catorce colores
con su nombre comercial y su valor exacto.

**Cierre de la sesion.** El trabajo salio en el
[PR #10](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/10),
contra `main`, y **Alfredo lo mezclo el mismo dia**. Lo dio por bueno en lo
general, pero avisa que **va a cambiar muchas cosas** y corta la sesion sin
detallar cuales.

La fase 3 queda **sin cerrar**. No es que falte trabajo tecnico: falta la lista
de cambios.

**Por que se mezclo aunque falten cambios.** Cada sesion arranca de un clon nuevo
del repositorio, sobre `main`. Lo que se queda en una rama sin mezclar no lo ve
la sesion siguiente a menos que alguien le diga el nombre de la rama, y ese
nombre esta escrito justamente en el archivo que se quedo en la rama. Mezclar es
lo que rompe ese circulo. No cuesta nada hacerlo porque `main` no cambia lo que
ve el publico: la tienda vive en `/store`, con `noindex`, y `/` sigue siendo la
pagina de espera. **Esa es la razon de fondo por la que la tienda se monto en una
ruta aparte, y no solo una comodidad para el preview.**

**Como arranca la sesion 9:** esta escrito arriba, en "Lo primero de la proxima
sesion", que es donde se lee primero.

---

### Sesion 9 — 2026-09-12

**Punto de partida:** el hero de la sesion 8 mezclado en `main` y Alfredo
avisando que iba a cambiar muchas cosas sin decir cuales. **Esta sesion llego la
lista: siete puntos.** Los siete estan hechos.

---

**1 y 2 — La cabecera es UNA placa que se estira, y el logo tambien la abre.**

Antes habia un rectangulo de vidrio con la hamburguesa y el logo, y al pulsar
salia OTRO rectangulo de vidrio ocho pixeles mas abajo. Ahora es una sola pieza
que crece hacia abajo y hacia los lados y ensena lo que tenia guardado. Y el logo
hace lo mismo que la hamburguesa: si la placa es una pieza, toda la pieza
responde igual.

Subir al principio de la pagina, que es lo que hacia el logo, no se perdio: lo
hacen "Buy the case" dentro del menu y el boton de volver al estuche.

Los dos detalles con truco, por si hay que tocarlo:

- **El alto** se anima con `grid-template-rows` de `0fr` a `1fr`, que es el alto
  real del contenido medido por el navegador. Con `max-height` y un tope
  inventado, la animacion corre a una velocidad distinta a la real y se nota el
  tiron al cerrar.
- **El ancho** va entre dos valores escritos en `globals.css`
  (`--store-shell-closed` y `--store-shell-open`). `width: auto` no interpola en
  ningun navegador que importe hoy. **Si cambia el tamano del logo, hay que
  cambiar esos dos numeros.**

**3 — Se puede agarrar el estuche de verdad: girar, acercar, mover, dar la
vuelta.**

| Escritorio | |
|---|---|
| arrastrar | gira, sin tope: se le puede dar la vuelta entera |
| rueda | acerca y aleja, entre 0,55 y 3,2 |
| Mayus + arrastrar, o boton central/derecho | mueve: sube, baja, corre a los lados |
| doble clic | lo devuelve a su sitio |

En telefono el hero ocupa la pantalla entera, asi que si el lienzo se quedara con
el dedo en vertical no habria forma de bajar la pagina desde ahi. La salida es un
**interruptor "Inspect"** en la consola: apagado, el dedo vertical baja la pagina
y el horizontal gira; encendido, el lienzo se queda con todo — un dedo gira en los
dos ejes, dos dedos acercan y mueven — y la pagina queda bloqueada mientras tanto.
Si alguien consigue bajar con la inspeccion encendida, se apaga sola.

Se eligio un interruptor a la vista y no adivinar la intencion del gesto porque
adivinar falla justo en el gesto que no se puede fallar: el de bajar a leer el
precio.

**La pose ya no se pierde sola.** Antes cualquier desplazamiento la devolvia a la
diagonal. Ahora se queda donde la dejaron y aparece un boton "Reset" — solo
cuando hay algo que reiniciar.

**4 — La pagina entera a todo color, con los haces negros.**

El fondo ya no es solo la version oscura y desaturada del color del estuche. Son
**dos superficies**:

- **El hero, a todo color.** El color del estuche llevado a su version mas
  encendida, con los haces del fondo de la pagina de espera encima pero **en
  negro**, y un pozo negro en el centro.
- **Lo que se lee, debajo.** La superficie oscura de siempre. Seis secciones de
  texto sobre un amarillo encendido no las lee nadie, y eso no es una opinion:
  es lo que sale de medir el contraste.

Entre las dos hay un degradado de una pantalla de alto, manejado por `--hero-veil`
segun el scroll, asi que al bajar no se cruza una linea — el color se apaga solo.

**Lo que hubo que resolver para que esto no publicara texto ilegible.** Sobre un
hero encendido no se puede dar por hecho que el texto claro contrasta: el amarillo
pide texto negro y el azul marino pide texto blanco. `heroForegroundFor` no elige,
**mide** con `contrastRatio` y se queda con el que mas saca. Aun asi, dos de los
catorce colores caian justo en la franja media donde ninguno de los dos llega a
AA — el verde bosque en 4,16 y el naranja en 4,24. Para eso esta `enforceContrast`:
empuja la luminosidad del hero de a una centesima, en la direccion que le conviene
al texto que iba ganando, hasta cruzar el 4,5. **Comprobado con los catorce: el
peor queda en 4,55.** Es un ajuste que no se ve y sin el la pagina publica texto
que no se lee.

Los haces negros viven en `store-beams.tsx`, aparte de `beams-background.tsx`.
Aquel monta su propio contenedor negro con velo y vineta; aqui hace falta lo
contrario, una capa transparente que se pinta encima de un color que cambia. Lo
unico que comparten es la matematica de los carriles, que son treinta lineas. Su
peso sale de `beamStrengthFor`: sobre un hero claro se sujetan y sobre uno oscuro
se suben, porque si no, sobre azul marino no aparecen.

**5 — El scroll: el estuche se queda donde esta y nada le pasa por encima.**

Antes el lienzo era `fixed` y ocupaba la pantalla entera durante toda la pagina:
al bajar, el estuche se quedaba clavado detras mientras las secciones le pasaban
por encima, y para que el texto se leyera habia que desvanecerlo. Ahora **el
lienzo vive dentro del hero, en absoluto**. El hero es una seccion normal de una
pantalla de alto y se va hacia arriba como se va cualquier cosa. El estuche no se
desvanece, no se encoge y no se aparta: se va con su consola de compra, y lo que
sigue empieza despues de el.

Lo unico que se sigue apagando con el scroll es el color del hero, que es un
fondo fijo aparte. Eso no es el estuche desvaneciendose, es la sala bajando las
luces para leer.

**6 — Las muestras de color van pegadas, y la elegida se enciende con su color.**

Catorce muestras sin un pixel entre ellas, con las esquinas de los extremos
redondeadas: una cinta, no catorce botones. La seleccionada crece y lleva el
`box-shadow` de color del ejemplo que mando Alfredo. **El resplandor sale del
color de la propia muestra y no del acento**: si saliera del acento, las catorce
se encenderian igual y la cinta perderia lo que la hace legible. Se reparten el
ancho, asi que las catorce caben en telefono sin desplazar.

**7 — La zona del color y el estuche, reordenada.**

Antes era una columna en la esquina inferior derecha con seis bloques apilados del
mismo peso, y lo que mas espacio ocupaba era el aviso legal. Ahora es **una sola
barra apoyada abajo, partida en tres zonas por filetes de un pixel**, en el orden
de la decision de compra:

```
┌───────────────────────────┬──────────────┬──────────────────┐
│ FINISH                    │ VIEW         │        ONE PRICE │
│ Burgundy · Last few       │ Closed  Open │             €180 │
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮            │ Inspect Reset│   ADD TO CART    │
│ Screen colours may differ │              │                  │
└───────────────────────────┴──────────────┴──────────────────┘
      eleccion                 inspeccion        cierre
```

El nombre del color pasa a titular, que es lo que pesa: es la unica decision real
que toma el comprador. El aviso de fidelidad baja a pie de zona, en gris. El
precio sale de dentro del boton y se pone al lado: un precio metido en el boton se
lee como parte de la etiqueta.

**Es una propuesta, no un final.** Alfredo dijo que no tenia solucion y que
propusiera. Esta es la propuesta.

---

**Comprobado en el navegador, no de memoria.** `typecheck`, `lint` y `build`
limpios; las cinco rutas siguen estaticas; sin desbordamiento horizontal a 390 y
1440 px, ni antes ni despues de bajar; cero errores de consola. Y los gestos
probados uno a uno, con eventos de verdad: arrastre, rueda, Mayus+arrastre, doble
clic, el boton Reset apareciendo y desapareciendo, y en telefono el dedo vertical
bajando la pagina con Inspect apagado, quedandose en el lienzo con Inspect
encendido, y la pinza de dos dedos acercando.

**Cuatro fallos encontrados mirando, que no habrian salido leyendo el codigo:**

1. **El estuche no se podia agarrar.** Los oyentes estaban bien puestos y no
   llegaba ni un solo evento. La causa: la capa que funde la consola de compra
   cubre el hero entero, y una caja sin fondo sigue recibiendo el puntero. Le
   faltaba `pointer-events-none`. **El arrastre parecia funcionar** en la primera
   prueba porque la deriva y el seguimiento del cursor cambiaban la escena igual;
   lo que lo delato fue que el boton "Reset" no aparecia nunca.
2. **En telefono la consola se comia media pantalla** y el estuche quedaba sin
   sitio. Se reordeno: el selector de vista y los botones de inspeccion comparten
   fila, y el precio y el boton tambien.
3. **El boton de volver al estuche chocaba con el carrito** a 390 px. En telefono
   quedo solo la flecha.
4. **Sobre los colores claros el pozo no pesaba lo suficiente** y el estuche se
   veia recortado en papel. Se subio el pozo y se subieron los haces.

**Lo que queda abierto, y es de gusto, no tecnico:** sobre amarillo, oro y crema
el estuche se apoya menos en el fondo, porque son el mismo color. Es la
consecuencia directa de lo que se pidio. Si molesta, se gira el tono del fondo
unos grados respecto al del estuche, en una linea de `heroSurfaceFor`. No lo hice
porque lo pedido fue el mismo color, no uno parecido.

**Lo que bloquea cerrar la fase 3** sigue igual: el `.glb` del estuche y los
catorce colores con su nombre comercial y su valor exacto.

---

### Sesion 9, segunda vuelta — el mismo dia

Alfredo vio el hero rehecho, le gusto, y mando dos cosas.

**1. La pantalla quedaba descompensada. El panel de compra se pone de pie.**

La barra horizontal de abajo funcionaba pero dejaba todo el peso repartido en una
franja baja, y el menu abierto — que es un bloque alto arriba a la izquierda — no
tenia nada que le respondiera. Ahora, **en escritorio, el panel es vertical,
pegado a la derecha, de media pantalla para abajo y con el mismo ancho que el menu
abierto (320 px)**. Las dos esquinas opuestas se equilibran.

Lo lleva `min-height: calc(50svh - 1.5rem)` con el panel apoyado abajo: crece
hacia arriba y su borde superior cae en el centro exacto. Las zonas se reparten el
alto sobrante con `space-between`, para que no se amontonen arriba dejando un
hueco muerto al pie.

**El estuche se aparta, no se encoge.** En escritorio lo que sobra ya no es alto
sino ancho, asi que el encaje descuenta los 344 px del panel mas su margen y corre
el estuche a la izquierda, al centro de lo que queda libre. En telefono no cambia
nada: el panel sigue siendo la barra de abajo, que es donde lo escaso es el ancho.

**2. El boton "Inspect" se fue, y la pregunta de Alfredo estaba bien hecha.**

Pregunto por que existia y si inspeccionar no deberia poderse siempre. Lo medi con
eventos tactiles de verdad, **con el boton apagado**:

| Gesto | Llega al lienzo | La pagina se mueve |
|---|---|---|
| Un dedo, empezando de lado y siguiendo en diagonal | Si, **los dos ejes** (dx 200, dy 154) | No |
| Dos dedos, pinza | Si | No |
| Dos dedos, arrastre vertical | Si | No |
| Un dedo hacia abajo, vertical seco | No | **Si**, como debe ser |

O sea que el boton no hacia falta: `touch-action: pan-y` ya reparte bien. Si el
dedo arranca de lado, el navegador nos entrega el gesto completo y el componente
vertical tambien llega; si arranca hacia abajo, se lo queda la pagina. Lo unico
que se cede es girar con un dedo que arranque en vertical seco, y eso es
exactamente lo que hay que ceder: el hero ocupa la pantalla entera y el gesto de
bajar a leer el precio no se puede fallar. Los dos dedos cubren ese hueco.

**Estaba ofreciendo como modo algo que ya estaba disponible siempre.** Fuera.

**Lo que si hubo que anadir, y NO se puede comprobar desde aqui.** Safari en
iPhone entiende el pellizco como acercar la PAGINA entera, porque la etiqueta de
ventana de Next deja escalar. Se pusieron dos guardas en el lienzo: un `touchmove`
no pasivo que corta **solo cuando hay dos dedos o mas**, y `gesturestart` /
`gesturechange`, que son de Safari. El dedo suelto no se toca, porque es el que
baja la pagina. **Esto esta probado en Chromium; el pellizco en un iPhone de
verdad lo tiene que mirar Alfredo.** Es lo unico de esta sesion que no pude
verificar yo.

**Tercer arreglo, de mirarlo:** la cinta de color perdia el borde contra el panel
oscuro. El negro es la primera muestra y sin filete la cinta parecia empezar en el
blanco. Se le puso un filete **a la cinta entera**, no a cada muestra: uno por
muestra las separaria, que es justo lo que no queremos.

**Un susto que no era.** En la captura del estuche negro sobre hero negro el
estuche parecia haberse encogido a un tercio. No era cierto: sobre ese fondo solo
se le ve el filo iluminado. Se comprobo con una sonda en el bucle de dibujo
(escala real 0,817, la manda el alto) y en la captura del azul marino se ve
entero y del tamano que toca. Queda anotado porque el mismo susto va a volver.

**Comprobado otra vez de punta a punta:** `typecheck`, `lint` y `build` limpios,
cinco rutas estaticas, sin desbordamiento a 390 ni 1440, cero errores de consola,
y los gestos vueltos a pasar uno a uno — arrastre, rueda, Mayus+arrastre, doble
clic, Reset apareciendo y desapareciendo, el dedo vertical bajando la pagina, el
dedo de lado girando en los dos ejes y la pinza de dos dedos acercando.

---

### Sesion 9, tercera vuelta — el mismo dia

**El scroll del raton vuelve a ser de la pagina. Acercar queda solo en el
pellizco.**

Alfredo lo corto en seco y tiene razon: el hero ocupa la pantalla entera, asi que
si la rueda acerca, quien baja con el raton se queda encerrado en la primera
pantalla y no llega nunca al resto de la web. Un objeto que se deja inspeccionar
no vale nada si el precio de inspeccionarlo es no poder seguir leyendo.

**Como se separan los dos gestos, que es lo unico con truco.** El navegador manda
el pellizco de trackpad como una rueda con `ctrlKey` encendido. Es una convencion
de hace anios, la misma que usan los mapas y los editores de diseno. Entonces:

| Lo que llega | Que hace |
|---|---|
| Rueda **con** `ctrlKey` — pellizco de trackpad, o Ctrl+rueda de raton | acerca |
| Rueda **sin** `ctrlKey` — rueda de raton, o dos dedos de trackpad | baja la pagina |
| Dos dedos en telefono | acercan y mueven, como ya estaba |

Y `preventDefault` pasa a llamarse DESPUES de la comprobacion, nunca antes:
llamarlo en el segundo caso es exactamente lo que cortaba el scroll.

El delta se topa en 16 antes de usarlo, porque los dos gestos que llegan mandan
escalas muy distintas: el pellizco va de a dos o tres unidades por evento y
Ctrl+rueda de raton salta de cien en cien. Sin el tope, el mismo factor que hace
suave al pellizco convierte cada muesca de la rueda en un salto.

**Comprobado con eventos de verdad, los tres casos:**

| Prueba | Resultado |
|---|---|
| Rueda sobre el lienzo | la pagina baja (scrollY 400) y NO aparece "Reset": no hubo acercamiento |
| Ctrl+rueda sobre el lienzo | la pagina no se mueve, la escena cambia y aparece "Reset" |
| Arrastre | sigue girando, y el scroll sigue en cero |

Y vueltas a pasar las de telefono: el dedo de lado gira en los dos ejes, la pinza
de dos dedos acerca, y el dedo vertical seco sigue bajando la pagina.

**La ayuda del panel cambia de texto y de forma.** Ya no dice "scroll to zoom",
que ahora seria mentira. En el panel vertical las tres ayudas van en columna,
gesto y efecto — Drag/turn, Pinch/zoom, Shift-drag/move — como lista de
definiciones de verdad, asi un lector de pantalla las lee emparejadas. En la barra
de telefono se queda la linea corrida, que ahi lo escaso es el ancho.

**`AGENTS.md` y `CLAUDE.md` pasan a estar versionados.** Los escribe `next dev` en
cada arranque. En la vuelta anterior los mande al `.gitignore`, y estaba mal: el
propio archivo avisa de que sacarlos del diff solo vuelve a crear el cambio sin
confirmar, y que confirmarlos con el trabajo es lo que deja el arbol limpio.
Comprobado: despues de confirmarlos, `next build` ya no ensucia nada.

**Como salio este cambio, y por que en un PR aparte.** El
[PR #12](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/12) ya
estaba mezclado cuando llego este encargo, asi que el commit del scroll se quedo
colgando sobre una rama cerrada. Se saco a `claude/scroll-libre`, desde `main`, y
va por el
[PR #13](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/13).

**Regla que Alfredo dejo clara, y que a partir de ahora no se discute: cada tanda
de cambios va en su PROPIO pull request.** No es capricho de proceso — es como
los revisa: **cada PR trae su propio despliegue de preview en Vercel, y sin PR
nuevo no hay URL nueva que abrir.** Apilar commits sobre un PR ya mezclado lo deja
sin forma de mirar lo que pidio. Esto ya estaba escrito arriba, en la condicion 1
de "Condiciones de trabajo"; queda repetido aqui porque se incumplio.

---

### Cierre de la sesion 9

**Los tres PR estan mezclados a `main`.** No queda nada a medio hacer ni ninguna
rama con trabajo dentro.

| PR | Que trae | Mezclado |
|---|---|---|
| [#12](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/12) | Los siete puntos, mas el panel de pie y quitar el "Inspect" | 2026-09-12 |
| [#13](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/13) | La rueda vuelve a bajar la pagina; acercar solo con pellizco | 2026-09-12 |

**Lo que se aprendio, y no es de codigo.** Esta sesion se hizo bien el trabajo y
se hizo mal el proceso, dos veces:

1. **Mirar no es opcional.** Cinco de los fallos de esta sesion no habrian salido
   leyendo el codigo: el estuche que no se podia agarrar porque una caja
   transparente se quedaba con el puntero, la consola comiendose media pantalla
   en telefono, el boton chocando con el carrito a 390 px, el pozo sin peso sobre
   los colores claros, y la cinta perdiendo el borde contra el panel oscuro.
   **Todos aparecieron en una captura.** Y uno de ellos — el del arrastre —
   *parecia* funcionar en la primera prueba, porque la deriva movia la escena
   igual; lo delato que el boton "Reset" no aparecia nunca. Una prueba que mira
   el sintoma equivocado da verde y miente.
2. **Un PR por tanda, sin excepcion.** Alfredo lo pidio dos veces antes de que se
   hiciera. El motivo esta en la condicion 1 y se repite aqui porque costo dos
   vueltas: sin PR nuevo no hay preview nuevo, y sin preview no hay forma de que
   el mire lo que pidio. **Si el PR de la rama ya se mezclo, el trabajo siguiente
   arranca de rama nueva desde `main`.** No encima.
3. **Un gesto medido gana a un gesto supuesto.** El boton "Inspect" existio
   porque di por hecho que en telefono no se podia girar sin el. Alfredo pregunto
   por que, se midio con eventos tactiles de verdad, y resulto que `touch-action:
   pan-y` ya repartia bien el gesto. Se quito. **Estaba ofreciendo como modo algo
   que ya estaba disponible siempre.**

**La fase 3 sigue sin cerrar,** y no por falta de trabajo tecnico: faltan el
`.glb` del estuche y los catorce colores de verdad. Las dos cosas las tiene
Alfredo.

**Como arranca la sesion 10:** esta escrito arriba, en "Lo primero de la proxima
sesion", que es donde se lee primero.


---

### Sesion 10 — 2026-09-15

**Punto de partida:** `main` en `3110539`, con el hero rehecho y los tres PR de la
sesion 9 mezclados. Adrian no pidio tocar el hero: pidio **disenar el panel**.

**No se escribio codigo, a proposito.** El encargo terminaba en *"pregunta y haz
las recomendaciones que consideres antes de armar algo"*, asi que la sesion fue de
preguntas y diseno. El resultado esta en **`docs/panel-nerowa.md`**, 16 apartados.

**Las ocho decisiones que tomo Adrian** estan arriba, en la tabla de decisiones,
con su motivo. En resumen: aplicacion instalable en vez de app de tienda, arranque
por pedidos cargados a mano, el reembolso solo lo confirma Adrian, portal de
tiendas sin pago en linea, graficos de ganancia real, notas ancladas sin chat.

**Los dos datos que aparecieron preguntando y que cambiaron el diseno:**

1. **Alfredo usa iPhone.** En iPhone la notificacion web solo existe si la
   aplicacion esta instalada en la pantalla de inicio, y se apaga en silencio si
   la quita. Un panel cuyo unico aviso de "vendiste algo" puede desaparecer sin
   que nadie se entere no sirve para el trabajo que tiene que hacer. De ahi sale
   **Telegram como canal principal de lo urgente**, con la notificacion web como
   extra y el panel comprobando solo que su suscripcion sigue viva.
2. **Envia con la agencia de correos nacional de Lituania.** O sea que la
   operacion es lituana: euros, IVA lituano, y el IVA intracomunitario de las
   ventas mayoristas deja de ser un detalle contable y pasa a cambiar el total de
   la factura. Y marcar "entregado" se automatiza distinto que con un courier
   privado: queda manual con recordatorio a los 7 dias, y **antes de prometer lo
   automatico hay que comprobar si el correo lituano da acceso tecnico al
   seguimiento**. No se dio por hecho.

**Lo unico que se le movio de sitio a lo que pidio Adrian.** El queria los
graficos en la pestana 1, junto a los pedidos. Van a una seccion propia, a un
toque del encabezado. El motivo: la pestana 1 es la cola de trabajo, y si arriba
hay un grafico, **lo primero que ve Alfredo al abrir el panel corriendo ya no es
lo que le falta despachar**. Queda anotado por si Adrian prefiere lo contrario.

**Tres cosas que se anadieron porque el encargo las pedia sin saberlo:**

1. **Escalado de avisos.** Adrian dijo que Alfredo despacha solo y a veces no
   tiene tiempo. Avisar una vez no resuelve eso: el pedido sin enviar vuelve a
   avisar a las 24 h, y a las 48 h le llega tambien a Adrian.
2. **Costos pegados al envio.** Se pidio "ganancias" y un grafico de ventas no es
   eso. Para que la palabra sea cierta hay que restar produccion, envio y
   comision, asi que al marcar un pedido como enviado el panel pregunta ahi mismo
   cuanto costo el envio, con el importe de la ultima vez ya sugerido.
3. **Separar desistimiento de producto defectuoso** en el formulario de
   devolucion. No es lo mismo y **quien paga el envio de vuelta cambia segun cual
   sea**. Mezclarlos en un solo formulario garantiza discutir con el cliente
   despues. Queda escrito que esto lo confirmen con su asesor en Lituania antes
   de publicar los terminos.

**Lo que bloquea arrancar** esta en el apartado 14 del documento. Dos cosas
nuevas que antes no estaban en la lista: **cuanto cuesta producir un estuche**
(sin eso no hay grafico de ganancia) y **los datos fiscales de la empresa en
Lituania** (sin eso no hay factura mayorista).

**Que sale de aqui:** un solo pull request con el documento de diseno y esta
bitacora. Ninguna pantalla, ninguna tabla de base de datos. La fase 7.0 arranca
cuando Adrian diga que el diseno esta bien.

---

### Sesion 10, segunda vuelta — el mismo dia

**Llegaron los numeros del negocio, y con ellos el documento
`docs/economia-nerowa.md`.** Adrian dio precios y costo; de ahi salen el precio
de la tienda, los tramos del portal de tiendas y el grafico de ganancia del panel.

| Dato | Valor |
|---|---|
| Fabrica, en China | 24 EUR por estuche |
| Ultimo lote | 100 unidades, 2.400 EUR de factura, **~3.400 EUR desembolsados** |
| **Costo puesto en Vilnius** | **34 EUR** por estuche |
| Venta al publico | 180 EUR **sin IVA** → 217,80 EUR con el IVA lituano |
| A tiendas | 120 EUR (1-5), 110 EUR (6-15), 100 EUR (16+), envio aparte |
| Envio al cliente | Se cobra lo que cuesta o mas: no come margen |

**Lo que dejan:** unos **142 EUR por venta web** (79% del ingreso neto) y entre 66
y 86 EUR por venta a tienda. **El lote de 3.400 EUR se paga con 24 ventas web**, o
con 52 en el peor tramo mayorista. Vendido entero por la web serian unos 14.200
EUR sobre 3.400 invertidos.

**Tres cosas que se corrigieron al hacer las cuentas, y las tres cambian codigo:**

1. **El costo no es 24 EUR, es 34.** Los 24 son precio de fabrica; traer el lote
   costo 1.000 EUR mas. Usar 24 habria inflado el margen un 42% en cada venta y
   1.000 EUR por lote a fin de anio. Y como el flete y la aduana cambian en cada
   pedido, **el panel guarda lotes de importacion y calcula el costo unitario de
   cada uno**, en vez de un numero fijo: asi un lote mas caro no ensucia hacia
   atras lo que ya se vendio.
2. **En la tienda hay que mostrar 217,80 EUR, no 180.** Adrian confirmo que los
   180 son netos, y a consumidores de la Union Europea el precio que se enseña
   tiene que llevar el IVA dentro. El precio del hero es un marcador de posicion
   y hay que cambiarlo.
3. **Una parte de esos 1.000 EUR probablemente no sea costo.** El IVA de
   importacion se recupera si la empresa esta registrada, y podrian ser 500-600
   EUR del total. Si es asi, el costo real baja de 34 a unos 28 EUR. **Mientras no
   haya desglose, el panel usa 34**: mejor que el grafico se quede corto y luego
   mejore, a que prometa un margen que no esta.

**Una bandera que hay que pasarle al asesor, y que no es de software.** Si el lote
actual se importo antes de que exista la empresa, a nombre de Alfredo como
particular, ese IVA probablemente no se recupere y ademas complica revender la
mercancia a nombre de una sociedad que aun no existia. No se como se hizo. Alfredo
define la empresa esta semana o la proxima; es de lo primero que hay que preguntar.

**Un comentario de negocio, no de codigo, que quedo escrito en el documento.** La
tienda que compra a 120 EUR y revende a 180 se queda con un 33%, por debajo de lo
que suele pedir una tienda de instrumentos; a 100 EUR se queda con un 44%, que ya
es lo normal. O sea que **el tramo que una tienda nueva va a querer comprar
(tres o cinco, para probar) es justo el que peor margen le deja**, y el que le
resulta atractivo le exige comprometer 1.600 EUR con un producto que nunca ha
vendido. Los precios de Adrian no estan mal — el margen propio es excelente en los
tres tramos — pero eso puede costar cerrar la primera tienda, que es la que
importa. Dos salidas sin tocar la tabla: envio gratis desde 6 unidades, o un
precio de primera compra por una vez. Decision de Adrian, no bloquea nada.

**Lo que se tacho de la lista de pendientes:** precio de venta, costo de
produccion y precios mayoristas. **Lo que entro en su lugar:** el desglose de los
1.000 EUR del lote, y a nombre de quien se importo.

**Sigue sin resolverse, y es de Alfredo:** los datos fiscales de la empresa. Es lo
unico que bloquea la fase 7.6, el portal de tiendas.

---

### Sesion 10, tercera vuelta — la fase 7.0 construida

Adrian dio luz verde: *"empieza a armar todo, dale play, deja margen para
cambiar bases a futuro conforme vayamos definiendo todo lo tecnico de la
empresa"*. Eso ultimo no es un detalle de estilo: es la decision de arquitectura
de esta tanda.

**El panel vive en `/panel`**, en el mismo repositorio, con `noindex` y detras de
sesion. La tienda sigue en `/store` y la raiz sigue siendo la pagina de espera.

**La capa que cumple el encargo de Adrian.** Ninguna pantalla, ningun formulario
y ninguna accion del panel importa un proveedor. Todos piden `servicios()` y
reciben interfaces:

| Puerto | Que abstrae | Adaptador de hoy |
|---|---|---|
| `Almacen` | Todos los datos | memoria, con datos de ejemplo |
| `Correo` | Enlaces de entrada y avisos al cliente | consola |
| `Avisos` | Telegram, notificacion web, correo | consola |
| `Archivos` | Facturas y comprobantes | memoria |

**Cambiar de base de datos son tres pasos:** escribir el adaptador, anadir su
caso en `src/lib/panel/servicios.ts`, y poner `PANEL_ALMACEN=postgres` en Vercel.
No hay paso cuatro. Si algun dia hiciera falta tocar una pantalla, el puerto
estaria mal disenado y lo que habria que arreglar es el puerto.

**Lo que se puede hacer ya, abriendo el preview:** entrar con enlace sin
contrasena, ver la cola de pedidos ordenada por antiguedad con el atraso a la
vista, abrir un pedido, copiar la direccion de un toque, pegar el seguimiento y
marcarlo enviado, anotar lo que costo el envio, y ver el desglose del margen
—que solo ve el rol dueno—. El panel se instala en la pantalla de inicio del
telefono.

**El dinero va en centimos enteros, nunca en euros con decimales.** 0,1 + 0,2 no
da 0,3 en coma flotante, y un panel que suma lineas de pedido termina descuadrado
por centimos que nadie sabe de donde salieron. Hay **17 comprobaciones** de la
aritmetica (`npm run pruebas`) atadas a `docs/economia-nerowa.md`: si un calculo
deja de cuadrar con el documento, una de las dos cosas esta mal.

**Tres fallos que aparecieron MIRANDO, y los tres pasaban typecheck, lint y
build.** La leccion de la sesion 9 vuelve a valer entera:

1. **El boton "Marcar enviado" quedaba fuera de pantalla.** Medido con el
   navegador: caia en y=641 de un iPhone de 664 px de alto. Rompia la prueba de
   los quince segundos, porque el primer gesto dejaba de ser tocar el boton y
   pasaba a ser buscarlo. Se anclo el boton abajo y se compacto la direccion.
2. **La muestra del color negro desaparecia** contra la tarjeta oscura: `#111`
   sobre `#17171a`. No se veia de que color era el pedido. Anillo mas grueso y
   claro. Es el mismo susto del estuche negro de la sesion 9, pero esta vez si
   era un fallo.
3. **La confirmacion de "marcado enviado" no se veia nunca.** La accion ocurria,
   pero al revalidar el formulario dejaba de dibujarse y se llevaba el mensaje
   consigo. Era exactamente el "guardar en silencio" que la especificacion
   prohibe. Ahora la confirmacion viaja en la URL y sobrevive al cambio de
   estado. **Este no lo habria encontrado nadie leyendo el codigo.**

**Un cuarto arreglo, de disenar mejor:** preguntar el coste del envio DENTRO del
formulario de envio estaba mal por dos razones. El boton anclado lo tapaba, y el
orden era el equivocado: el comprobante del correo lo tiene Alfredo DESPUES de
despachar. Ahora se pregunta al volver, con el importe de la ultima vez ya
sugerido. Es lo que hace que el grafico diga ganancia y no solo ventas.

**Sobre Next 16.** `experimental.useOffline` da de serie la deteccion de falta de
conexion y el reintento automatico de las acciones de servidor bloqueadas — justo
la regla 4 de `docs/panel-nerowa.md` §11.3, sin escribirla a mano. Queda
encendido y el panel avisa en pantalla cuando no hay senal.

**Comprobado de punta a punta, no de memoria:** `typecheck`, `lint`, `build` y
las 17 pruebas en verde; el flujo entero de despachar recorrido en un navegador a
390 px; cero errores de consola; sin desbordamiento horizontal; el rol operacion
NO ve el margen y el rol dueno si.

**Lo que NO esta y por que:** base de datos de verdad, correos, bot de Telegram,
notificaciones web y el escalado de avisos. Todos necesitan cuentas de terceros
que todavia no existen. Los puertos ya estan escritos, asi que entran sin tocar
pantallas.

**Una incoherencia que esta tanda deja a la vista y hay que arreglar aparte:** la
pagina de espera publicada dice "180 EUR", que es el precio SIN IVA. Al
consumidor hay que ensenarle 217,80 EUR. Es texto de cara al publico en el
dominio, asi que va en su propio PR y lo decide Alfredo.

**Arreglo posterior al PR #15: el preview no dejaba entrar a nadie.** El modo de
entrada sin correo dependia de poner `PANEL_MODO_DEMO=1` a mano, y en Vercel no
esta puesta. O sea que Adrian habria abierto el preview en su telefono, pedido el
enlace, y el enlace se habria escrito en el registro del servidor donde no lo ve
nadie: puerta cerrada y ningun modo de abrirla.

Ahora **se enciende solo** mientras el almacen sea de memoria Y el correo sea de
consola — en esa situacion no hay datos reales que proteger y el enlace no puede
llegar a ningun sitio, asi que la alternativa era un panel al que no entra nadie.
**En cuanto se conecte una base de datos o un correo de verdad, se apaga solo.**
No hay que acordarse de nada, que es justo lo que no se le puede confiar a la
memoria de nadie en un panel que maneja dinero. `PANEL_MODO_DEMO` sigue
existiendo para forzarlo en los dos sentidos, y los dos estan comprobados en el
navegador.

---

### Sesion 10, cuarta vuelta — los correos de verdad

**`alfredo@nerowacases.com` no existe.** Era inventado por mi en los datos de
ejemplo y Adrian lo corrigio al abrir el preview del PR #15. Los correos del
panel son dos, y solo dos:

| Persona | Rol | Correo |
|---|---|---|
| Alfredo | operacion | **info@nerowacases.com** |
| Adrian | dueno | **hello@arcmediahouse.com** |

**El de Alfredo se importa de `src/lib/brand.ts`**, donde ya vivia como
`CONTACT_EMAIL` porque lo usan la pagina de espera y la tienda. No se repite la
cadena: el dia que cambie, cambia en un sitio y el panel se entera solo.

**Se quito `correosAlternos`.** Se habia anadido una vuelta antes para que Adrian
pudiera entrar con dos direcciones suyas; con un correo por persona se quedo sin
usuario, y una abstraccion sin usuario es deuda. Si hace falta otro correo, se
vuelve a anadir en cinco minutos.

**La pantalla de entrada ya no dice "y el de Adrian".** Lista los correos que de
verdad valen, sacados del almacen y no escritos a mano en el texto, y cada uno es
un boton que rellena el campo de un toque.

**Sobre el merge del PR #15, que conviene saber:** se mezclo con el head que
GitHub tenia registrado (`a384261`) y dejo fuera el ultimo commit de la rama
(`3315d95`, el que anadia `correosAlternos`). No se perdio nada que hiciera
falta —ese commit traia justo lo que ahora se quita— pero **el head que se mezcla
hay que mirarlo, no darlo por supuesto**. Los cambios de esta vuelta se rehicieron
limpios desde `main`.

**Comprobado en el navegador, los ocho casos:** los dos correos nuevos entran,
los dos viejos ya no, tocar un correo rellena el campo, `info@` entra como
Alfredo y NO ve el margen, y `hello@` entra como Adrian y si lo ve.

---

### Sesion 10, quinta vuelta — la entrada pasa a ser correo y clave

**Se revierte la decision de "sin contrasenas", y el motivo es un fallo mio de
diseno.** El enlace de un solo uso sigue siendo mejor para Alfredo —no hay nada
que recordar— pero necesita un proveedor de correo que todavia no existe. Sin
el, el enlace habia que enseñarlo en pantalla, **debajo de un mensaje verde que
decia "le acaba de llegar un enlace"**. Adrian se quedo esperando un correo que
nunca iba a salir, con el boton para entrar justo debajo y sin pinta de ser la
accion. El panel no se pudo abrir.

**Un acceso que necesita que te expliquen como usarlo no sirve**, y menos el
acceso de la herramienta con la que se lleva el control de las ventas.

**Lo que hay ahora:**

| Correo | Rol | Clave |
|---|---|---|
| info@nerowacases.com | operacion | la misma para los dos |
| hello@arcmediahouse.com | dueno | la misma para los dos |

**La clave no esta escrita en claro en el repositorio.** Se guarda pasada por
scrypt con una sal — una funcion pensada para esto, lenta a proposito y cara de
revertir. Se puede cambiar sin tocar codigo con `PANEL_CLAVE` en Vercel. Y la
comparacion es en tiempo constante: comparar con `===` se corta en la primera
letra distinta y el tiempo delata cuantas acerto quien prueba.

**Se borro el enlace magico entero, no se dejo apagado.** Fuera
`EnlaceEntrada` del dominio, sus dos metodos del puerto `Almacen`, su
implementacion en el adaptador, la ruta `/panel/entrar/[testigo]` y
`entradaSinCorreo()` de `servicios.ts`. Dos caminos de entrada conviviendo es
justo la clase de cosa que despues nadie se atreve a tocar.

**LO QUE HAY QUE CAMBIAR ANTES DE QUE HAYA DATOS REALES, y queda escrito en el
propio archivo `clave.ts`:** hoy el panel corre con pedidos de ejemplo, asi que
no hay nada que proteger. El dia que se conecte la base de datos, una clave
compartida entre dos personas deja de ser suficiente: una por persona, y fuera
del repositorio.

**Comprobado en el navegador, ocho casos:** los dos correos con la clave buena
entran; clave mala, correo desconocido y la clave con otra capitalizacion no
entran; **a los tres fallos les contesta exactamente el mismo mensaje**, que es
lo que evita averiguar quien tiene acceso probando direcciones; `hello@` entra
como Adrian y ve el margen; `info@` entra como Alfredo y no lo ve; y
`/panel/entrar/<lo-que-sea>` ya devuelve 404.

**Y la regla de la condicion 1 se incumplio otra vez, por tercera sesion
seguida.** Este cambio se empujo a `claude/correos-panel`, cuyo PR #16 ya estaba
mezclado, asi que el commit quedo colgando sobre una rama cerrada y sin preview
que Adrian pudiera abrir. Lo corto el en el acto. Se saco a `claude/clave-panel`
desde `main` y salio por el PR #17.

**Lo que hay que hacer para no repetirlo, y es una comprobacion de dos
segundos:** antes de empujar, mirar si el PR de la rama actual sigue abierto. No
basta con recordar si se mezclo — en la sesion 10 dos PR se mezclaron entre una
vuelta y la siguiente sin que quedara constancia en la conversacion. **Si esta
mezclado: `git fetch origin main && git checkout -B <rama-nueva> origin/main`, y
PR nuevo.**

---

### Sesion 10, sexta vuelta — la pestana 2 por dentro

Adrian la pidio sin esperar a los datos fiscales: *"no importa que aun no
tengamos la info fiscal de Nerowa, vayamos armando todo"*. **Y tiene razon: los
datos fiscales solo hacen falta para EMITIR una factura, no para guardar los
datos de una tienda ni para llevarle los pedidos.** Asi que la fase 7.6 se parte
en dos: **7.6a, lo de dentro del panel, hecho**; y 7.6b, el portal con enlace
propio para que las tiendas pidan solas, que si espera.

**Lo que se puede hacer ya:** dar de alta una tienda con sus datos de
facturacion y sus condiciones, registrarle pedidos, y ver de un vistazo lo que
debe y desde cuando.

**La decision de diseno que manda: cobro y envio son DOS PISTAS PARALELAS, no
un estado lineal.** En mayorista casi nunca pasan a la vez — se envia y se cobra
a treinta dias, o se cobra por adelantado y se manda cuando hay stock. Un solo
estado obligaria a elegir un orden que no siempre se cumple, y a mentir el resto
de las veces. Cada pedido lleva tres: `Pedido` (por confirmar / confirmado /
cancelado), `Cobro` (sin facturar / facturado / pagado) y `Envio` (sin enviar /
enviado / entregado). Cerrado es cobrado **Y** entregado, y se calcula, no se
guarda.

**El IVA se calcula solo y queda escrito en cada pedido.** Del pais de la tienda
y de su numero salen los cuatro casos — nacional, intracomunitario, sin numero
validado y exportacion — y el pedido congela cual se aplico. Un numero de IVA
**sin comprobar no cuenta como valido**: se cobra el IVA, que es el lado seguro,
porque cobrarlo de mas se devuelve y no cobrarlo lo paga la empresa. Sigue
pendiente confirmar el procedimiento con el asesor; el panel deja constancia, no
sustituye a nadie.

**El precio se calcula mientras se escribe el pedido.** El tramo depende del
total de unidades y nadie tiene por que saberse que pasar de 15 a 16 estuches
baja el precio de 110 a 100. Si el panel no lo dice, se descubre al facturar.
Comprobado en el navegador: 4 unidades → 120 EUR, 16 unidades → 100 EUR, en vivo.

**Dar por cobrado es cosa del dueno**, igual que el reembolso: es la otra
operacion donde se declara que entro dinero.

**Dos fallos que encontraron las pruebas y el mirar, no la lectura:**

1. **La prueba pillo que el rol operacion podia cancelar un pedido mayorista.**
   En la rama de "por confirmar" las acciones se devolvian sin pasar por el
   filtro de rol. Cancelar un pedido es dinero y es del dueno.
2. **Mirando se vio que "Cancelar el pedido" salia en dorado, del mismo tamano
   que "Confirmar el pedido" y pegado justo debajo.** Un toque mal dado en un
   telefono cancelaba un pedido de dos mil euros. Ahora lo destructivo va
   plegado, en peso bajo y con confirmacion.

**Comprobado de punta a punta en un navegador a 390 px:** alta de una tienda
española, IVA asignado correcto (sin numero validado → se le cobra), pedido de
16 unidades con el tramo de 100 EUR, confirmar, facturar, y la deuda de la lista
subiendo de 2.202,20 a 4.235 EUR. Cero errores de consola, sin desbordamiento.
Y un POST directo del rol operacion pidiendo cancelar **no cancela nada**: el
filtro por rol vive en el dominio, no en el boton.

**36 comprobaciones del dominio en total**, 17 de economia y 19 de mayorista.

---

### Sesion 10, septima vuelta — la sesion no aguantaba en Vercel

**Adrian no podia probar nada: cada click le volvia a pedir la clave.** Y es un
fallo mio, de los que solo aparecen en el entorno de verdad.

**La causa.** La sesion se guardaba en un `Map` en la memoria del proceso. En
local funciona, porque hay un solo proceso. En Vercel no: **cada peticion puede
caer en una instancia distinta**, y las instancias se reciclan solas. Entras en
la A, el siguiente toque va a la B, la B no conoce esa sesion y te devuelve a la
pantalla de entrada.

**El arreglo.** La sesion va ahora **dentro de la propia cookie, firmada** con
HMAC-SHA256: quien es y hasta cuando, mas una firma que solo puede calcular el
servidor. Cualquier instancia la verifica sin consultar nada. El secreto sale de
`PANEL_SECRETO` o, si no esta, se **deriva de la clave del panel** —
determinista, para que todas las instancias lleguen al mismo valor; generarlo al
azar al arrancar habria repetido el problema.

Y de paso desaparecen del puerto `Almacen` los tres metodos de sesion: ya no
hacen falta, y un almacen que no guarda sesiones no puede volver a romperlas.

**Como se comprueba, que es lo unico que vale aqui:** entrar, **matar el
servidor entero**, levantarlo de nuevo, y navegar con la misma cookie. Es
exactamente lo que pasa al cambiar de instancia. Cuatro rutas y tres toques
seguidos: sigue dentro. Y una cookie con el usuario cambiado a mano: rechazada.

**LA OTRA MITAD DEL MISMO PROBLEMA, QUE NO TIENE ARREGLO SIN BASE DE DATOS.**
Los datos tambien viven en la memoria del proceso. Una tienda dada de alta en
una instancia puede no estar en la siguiente. **La sesion se arreglo; los datos
no se pueden arreglar sin conectar Postgres.** Lo que si se hizo es que el panel
lo diga con todas las letras en la franja de arriba: "lo que guardes puede
desaparecer al cambiar de pantalla, no solo al recargar. Sirve para probar como
se usa el panel, no para meter datos de verdad."

**Lo que esto adelanta en el orden de las fases:** la base de datos deja de ser
la fase 7.2 y pasa a ser lo siguiente. El panel ya tiene bastante superficie
—pedidos, tiendas, pedidos mayoristas— como para que probarlo sin guardar nada
deje de tener sentido. Los puertos estan escritos desde el primer dia justo para
esto: entra un adaptador nuevo y no se toca ninguna pantalla.

---

### Sesion 10, octava vuelta — la base de datos de verdad

**Se adelanta la base de datos**, que estaba planificada para la fase 7.2. El
motivo es el de la vuelta anterior: con el almacen en memoria, en Vercel los
datos se pierden entre instancias y el panel no se puede ni probar.

**Supabase, pero solo como Postgres gestionado.** Sin el SDK de Supabase, sin
ORM: SQL escrito a mano y migraciones en un archivo de texto. Asi, el dia que
haya que mudarse a Neon o a cualquier otro Postgres, se cambia la cadena de
conexion y ya. Atarse al SDK seria lo contrario de lo que pidio Adrian.

**El adaptador se escribio DESPUES de las pantallas, contra la misma interfaz
`Almacen`, y no hubo que tocar ni una pantalla.** Eso era exactamente la
promesa de los puertos, y ahora esta comprobada en vez de prometida. Cambiar de
base de datos son tres pasos: escribir el adaptador, anadir su caso en
`servicios.ts`, y poner `PANEL_ALMACEN=postgres`.

**Decisiones del esquema, con su motivo:**

| Decision | Por que |
|---|---|
| El dinero en `bigint` de centimos | La misma regla que en el codigo. `numeric` seria exacto pero obliga a convertir en los dos sentidos |
| Las fechas en `timestamptz`, en UTC | Se formatean al mostrar, con la zona de Vilnius, nunca al guardar |
| Los estados en `text` con `check`, no `enum` | Anadir un valor a un `enum` bloquea la tabla; cambiar un `check` no. Los estados de este panel van a cambiar |
| Las lineas de un pedido en `jsonb`, no en tabla hija | Se escriben una vez, se leen siempre enteras y nunca se consultan sueltas. Una tabla hija serian dos consultas para no ganar nada |
| Sin `on delete cascade` hacia los pedidos | Una tienda se desactiva, no se borra: sus pedidos son historia |

**Las migraciones corren solas en la primera peticion de cada proceso**, una
sola vez cada una, cada una dentro de su transaccion. Y la semilla —las dos
personas, los colores, el lote— va con `on conflict do nothing`, asi que puede
correr en cada arranque sin pisar lo que alguien haya editado.

**UN FALLO QUE LAS PRUEBAS DEJARON PASAR, Y LA LECCION QUE DEJA.**

La direccion de una tienda se guardaba con **doble codificacion**: se
serializaba a JSON y el cliente lo trataba como texto, asi que dentro del
`jsonb` acababa una cadena en vez de un objeto. Al leerla, `direccion.pais` era
`undefined` y la ficha de la tienda reventaba.

Las 25 comprobaciones del adaptador estaban en verde. **Pasaban porque hablaban
con la base por una API distinta a la de produccion**, y esa API lo toleraba.
El fallo aparecio al abrir el panel de verdad contra Postgres.

El arreglo son dos cosas: casteo explicito a `::jsonb` al escribir, y aceptar
objeto o cadena al leer. Pero lo que importa es lo otro: **las pruebas ahora
usan `postgres.js` con las mismas opciones que produccion**, contra un Postgres
real expuesto por TCP. Una prueba que usa un cliente distinto al que se
despliega comprueba algo que no es lo que se despliega.

**Comprobado de punta a punta, y esta vez con la prueba que de verdad responde
a la queja de Adrian:** crear una tienda con sus datos desde el panel, darle un
pedido de 18 estuches, confirmarlo, facturarlo, **matar el servidor entero**, y
volver a abrir. Sobreviven la sesion, la tienda, su razon social, su numero de
IVA, su plazo de 60 dias, el pedido, su estado de cobro y la deuda de
2.286,90 EUR.

**63 comprobaciones del dominio en total**: 17 de economia, 19 de mayorista y 27
de Postgres.

**Lo que hace falta de Adrian para que esto funcione en Vercel** — y sin ello el
preview sigue en modo demostracion:

| Variable | Valor |
|---|---|
| `PANEL_ALMACEN` | `postgres` |
| `DATABASE_URL` | la del pooler de transacciones, puerto **6543** |
| `PANEL_SECRETO` | cualquier texto largo al azar |

El puerto importa: con la conexion directa, en Vercel se agotan las conexiones
en cuanto hay trafico.

**Pantalla de estado del sistema, en `/panel/estado`.** Solo para el dueno.
Contesta de un vistazo la pregunta que siempre es la primera cuando algo no
funciona: **"¿esto esta guardando de verdad o sigue en modo demostracion?"**.

Dice que adaptador esta activo para cada cosa, si la base de datos responde y en
cuantos milisegundos, cuantas filas hay de cada tipo, y que variables de entorno
estan puestas. **Lo que nunca sale de ahi es el valor de ninguna variable**: ni
la cadena de conexion, ni la clave, ni el secreto de firma. Solo si estan o no.

Se cuentan filas de verdad en vez de hacer un `select 1`: asi la pantalla
distingue "la base no responde" de "la base responde pero las tablas estan
vacias", que son dos fallos distintos con dos arreglos distintos.

Existe porque la alternativa era mirar variables de entorno en el panel de
Vercel, y eso es justo lo que este proyecto no le puede pedir a nadie.
Comprobada en los dos escenarios —con Postgres y sin el—, sin filtrar secretos y
con el rol operacion rebotado.

---

### Sesion 10, novena vuelta — el panel se caia entero por la base de datos

Adrian conecto Supabase, abrio el preview y se encontro con **"This page
couldn't load. A server error occurred."** El muro de Next, sin decir que pasa
ni que hacer.

**Lo reproduje con el build de produccion y una base inalcanzable**, que es lo
que no habia hecho: hasta ahora solo habia probado `next dev`. `/panel/entrar`
devolvia **500**.

**La causa no es la base: es como estaba montado el panel.** Cualquier fallo de
conexion tumbaba TODAS las pantallas, porque las dos primeras cosas que hace
cada una —saber quien eres y listar los correos— iban a la base. Y con ellas se
caia tambien `/panel/estado`, **la pantalla que existe justo para decir que le
pasa a la base de datos.**

Una herramienta de diagnostico que se cae por lo mismo que tiene que
diagnosticar no sirve de nada. Eso es un fallo de diseno mio, no de Supabase.

**Los tres arreglos:**

1. **La sesion ya no consulta la base.** La cookie firmada lleva tambien el rol
   y el nombre, asi que `usuarioActual()` funciona con la base caida. El precio,
   dicho en el codigo: si a alguien se le cambia el rol, su sesion abierta
   conserva el viejo hasta que caduque. Con dos personas vale la pena.
2. **Entrar tiene respaldo.** Si la base no responde, se identifica a quien entra
   con la lista configurada. **La clave sigue siendo obligatoria** y los correos
   son los mismos, asi que no se permite nada nuevo — pero se puede entrar y
   llegar al diagnostico.
3. **`error.tsx`**: en vez del muro de Next, una pantalla en castellano que dice
   que probablemente sea la base, que no se perdio nada, y con botones para
   reintentar o ir a ver el estado. Y el identificador del error, para buscarlo
   en el registro de Vercel.

**De paso se quito una duplicacion de verdad:** las dos personas del panel
estaban definidas en dos sitios con los valores copiados. Ahora salen de
`personas.ts`, que alimenta los tres usos: datos de ejemplo, semilla de la base
y respaldo de entrada.

**Comprobado en el build de produccion, los dos escenarios:**

| Con la base caida | |
|---|---|
| La pantalla de entrada | aparece (antes: 500) |
| Entrar | funciona |
| `/panel/estado` | **se llega, y dice "La base de datos no responde"** |
| El mensaje exacto de la base | se ve: `connect ECONNREFUSED ...` |
| La cadena de conexion | no se filtra |
| Una pantalla que si necesita la base | "Esta pantalla no cargó", no el muro |

| Con la base buena | |
|---|---|
| Entrar, ver pedidos | bien |
| Estado | "✓ Guardando en la base de datos" |
| Crear una tienda | se guarda, y el contador del estado sube a 1 |
| Errores de consola | 0 |

**La leccion, que es la misma de siempre con otra cara:** probar en `next dev`
no es probar. El fallo estaba a un `npm run build && npx next start` de
distancia, con una variable de entorno mal puesta a proposito.

**La condicion 1, incumplida por cuarta vez, y lo que se hizo al respecto.** El
arreglo del panel se empujo a `claude/base-de-datos`, cuyo PR #20 ya estaba
mezclado. Adrian lo corto: *"no puedo mezclar de nuevo, tienes que hacer PR
nuevo, es una regla del proyecto, siguela porfa"*.

Cuatro veces el mismo fallo, y siempre por lo mismo: **dar por hecho el estado
del PR en vez de mirarlo**. Escribirlo en la bitacora no funciono, asi que ahora
hay un **guardia de `pre-push`** que corta el empujon a una rama cuyo PR ya se
mezclo, y dice exactamente que comandos correr en su lugar. Se instala solo con
`npm install`.

**La primera version del guardia no detectaba mi propio caso**, y eso tambien
vale la pena anotarlo: comprobaba si la rama estaba contenida en `main`, y
cuando el commit que se queda colgando es POSTERIOR al merge, la rama tiene
trabajo que main no tiene — asi que la comprobacion daba "no mezclada" justo
cuando mas falta hacia el aviso. Se descubrio **probando el hook contra el error
de verdad**, no leyendolo. Ahora busca el commit de mezcla en el historial de
`main`, y esta comprobado en los tres casos: bloquea la rama mezclada, deja
pasar una rama nueva, y deja pasar el segundo empujon a una rama abierta.

---

### Sesion 10, decima vuelta — el diagnostico que dice que hacer

**La pantalla de estado funciono**: Adrian abrio el preview y en vez del muro
negro leyo el error exacto — `password authentication failed for user
"postgres"`. Eso **no es un fallo del panel**: es la cadena de conexion.

**Y el mensaje delata cual es el problema.** Al pooler de transacciones de
Supabase no se entra como `postgres` a secas, sino como
`postgres.<referencia-del-proyecto>`. Cuando el usuario llega corto, el sintoma
es exactamente ese: **parece un problema de contrasena y es de usuario**. Pasa
cuando se copia la cadena directa y se le cambia el puerto a mano.

**Pero un error exacto en ingles y con vocabulario de base de datos no le sirve
a quien no programa.** La pantalla decia que paso; no decia donde tocar. Para
este proyecto eso es media pantalla.

**Ahora traduce.** Encima del mensaje crudo van las **pistas**: que esta mal en
una frase, y que hacer con el sitio exacto. Dos fuentes:

1. **La forma de la cadena, antes de conectar.** Usuario `postgres` a secas
   contra el puerto 6543, conexion directa en vez de pooler, contrasena con
   caracteres que rompen una URL, o una cadena que ni siquiera tiene forma de
   direccion.
2. **Lo que contesta la base.** Autenticacion rechazada, no se puede llegar,
   conexiones agotadas, sentencias preparadas.

**El mensaje crudo sigue estando**, debajo y rotulado "por si hay que buscarlo":
es lo que permite buscar en internet o en el registro de Vercel. Lo que cambia
es el orden — primero que hacer, despues el dato tecnico.

**La contrasena no sale de ahi, y hay una prueba que lo comprueba.** La cadena
se analiza para sacar el puerto y la forma del usuario; la contrasena no se lee,
no se guarda y no se devuelve ni enmascarada. Dos de las doce comprobaciones
nuevas existen solo para eso: una pantalla que se ensena cuando algo falla acaba
en una captura.

**`diagnostico-conexion.ts` NO lleva `server-only`, y es a proposito:** son
funciones puras que reciben la cadena como argumento en vez de ir a buscarla, y
eso es lo que permite probarlas aisladas. Se descubrio al intentar correr la
prueba: un modulo que no se puede probar solo suele estar pidiendo que le quiten
una dependencia.

**75 comprobaciones del dominio en total**: 17 de economia, 19 de mayorista, 27
de Postgres y 12 de diagnostico.

**Y el guardia de la condicion 1 funciono a la primera:** `npm install` lo dejo
configurado solo, sin que nadie se acordara de nada.

---

### Sesion 10, vuelta 11 — la cadena a la vista, y una fuga de contrasena

Adrian arreglo lo que le dije y **siguio fallando**. En su pantalla aparecian dos
pistas: la de "la base rechazo el usuario o la contrasena" y, la que importaba,
**"la contrasena lleva caracteres que rompen la direccion"**. Y NO aparecia la
del usuario del pooler — o sea que su usuario estaba bien y el problema era la
contrasena.

**Se vio que faltaba poder mirar la cadena.** Con solo el error de Postgres hay
que adivinar si lo que esta mal es el usuario, el puerto o la contrasena, y
adivinar cuesta una vuelta entera cada vez. Ahora la pantalla enseña la cadena
**con la contrasena tapada** y marca en verde o en rojo cada parte: si el
usuario lleva la referencia del proyecto, si el puerto es el del pooler, y si
hay contrasena. Lo que se tapa es la contrasena y nada mas — el usuario, el
servidor y el puerto son la mitad publica de una conexion y son justo lo que hay
que poder comprobar.

**Y probando eso aparecio un fallo mas gordo, de los dos tipos a la vez.** Con
una contrasena que lleva una barra:

1. **El cliente de Postgres reventaba al construirse**, y como eso pasaba al
   construir los servicios, se caia hasta la pantalla de entrada. Otra vez el
   panel mudo.
2. **El error traia la cadena entera dentro, contrasena incluida**, en su campo
   `input`. En Vercel eso se escribe tal cual en el registro. **Una contrasena de
   base de datos en los logs.**

Los dos arreglados: el cliente se crea **perezosamente**, en la primera consulta
y no al pedir la conexion, dentro de un `try` que **relanza un mensaje limpio sin
repetir ni un caracter de la cadena**. Comprobado buscando la contrasena en el
registro del servidor: no aparece.

**Por que `URL` no vale para esto.** Tanto la vista enmascarada como la revision
de la cadena se parten a mano en vez de usar `new URL()`. Cuando la contrasena
trae caracteres sin codificar, `URL` parte por donde no debe y devuelve un
usuario que **no es el que hay escrito** — justo en el caso que hay que
detectar. Hay una prueba para eso.

**17 comprobaciones de diagnostico** (de 12), y cinco son solo para garantizar
que la contrasena no sale por ningun sitio: una pantalla que se ensena cuando
algo falla acaba en una captura, y un error de servidor acaba en un registro.

**79 comprobaciones del dominio en total.**

**Y el fallo era mucho mas tonto de lo que estabamos persiguiendo: los
corchetes.** Adrian preguntó *"siempre la coloqué bien solo que dentro de
corchetes, había que eliminar los corchetes?"*. Si.

Supabase da la cadena con `[YOUR-PASSWORD]` como hueco, y **los corchetes son
parte del hueco, no de la sintaxis**. Al escribir la contrasena dentro de ellos,
lo que viaja es `[laclave]` con corchetes incluidos, y Postgres contesta
"password authentication failed" — que suena a contrasena equivocada cuando la
contrasena era la correcta desde el principio.

**Lo que hice mal, y es de trato, no de codigo.** La pista decia "la contrasena
lleva caracteres que rompen la direccion" — cierto, porque los corchetes estan
en la lista — y mandaba a **cambiar la contrasena en Supabase**. La contrasena
estaba bien; habia que borrar dos caracteres. Una pista tecnicamente correcta
que manda a hacer un trabajo innecesario es casi peor que ninguna, porque se
obedece.

**Ahora se detecta el caso concreto y se nombra:** si la contrasena esta entre
corchetes sale "La contrasena quedo entre corchetes — hay que BORRARLOS", y **no**
sale la generica. Ademas los corchetes se ven en la cadena tapada
(`:[•••••••]@`), porque con la contrasena oculta el fallo era invisible. Y el
mensaje de "la base rechazo el usuario o la contrasena" nombra ahora las dos
causas comunes, con los corchetes primero por ser la mas frecuente.

**La leccion:** cuando el diagnostico se cumple pero el usuario sigue atascado,
lo que suele fallar no es la deteccion sino **el nombre que se le da al
problema**. Detectar "hay un caracter raro" y decir "cambia la contrasena" es
resolver el sintoma con el remedio equivocado.

20 comprobaciones de diagnostico. 83 en total.

### Sesion 10, vuelta 12 — la pantalla de estado se colgaba

Adrian: *"hice todo, ni siquiera carga"*, con una captura de
`504 FUNCTION_INVOCATION_TIMEOUT` en `nerowacases.com/panel/estado`.

**El cambio de sintoma es el diagnostico.** Antes la base contestaba
`password authentication failed`; ahora **no contesta nadie**. Eso no es la
misma averia con otra cara: es que la cadena apunta a otro sitio. Supabase
ofrece dos, y la que sale primero en su pantalla es la **conexion directa**
(`db.<ref>.supabase.co`), que **solo tiene IPv6** y desde Vercel no se alcanza.
No rechaza: se queda esperando hasta que Vercel corta la funcion a los 10
segundos.

**Lo que estaba mal de mi lado, y es lo importante:** la pantalla que existe
**para explicar por que la base no va** se colgaba con la base. Preguntaba seis
cosas a Postgres sin tope de tiempo, y la revision de la cadena — que no
necesita base ninguna — corria **despues** de intentar conectar. Con la base
muda, el unico aviso capaz de nombrar el fallo moria esperando a la causa del
fallo.

**Arreglado por orden de dependencia, no por orden de escritura:**

- La revision de la cadena y la vista enmascarada se calculan **antes** de tocar
  la base. Son texto; no tienen por que esperar a nadie.
- Las seis consultas van envueltas en `conTope(...)`, con 4 segundos de techo.
  Cuatro es menor que los 10 de Vercel a proposito: la pantalla tiene que poder
  contar que hubo espera, y para contarlo tiene que seguir viva.
- `connect_timeout` baja de 10 a 5 en `conexion.ts`.
- `db.<ref>.supabase.co` se detecta y se marca **error, no aviso**: "Esa es la
  conexion directa, y desde Vercel no funciona". Es la causa mas probable de lo
  que Adrian esta viendo, y el sitio donde tiene que leerlo es la propia
  pantalla, no un mensaje mio.
- El tiempo agotado tiene su traduccion propia, que apunta a IPv6 o a un
  proyecto dormido.

**`conTope` vive en `src/lib/panel/tope.ts` y no lleva `server-only`.** Mismo
motivo que `diagnostico-conexion.ts`: lo que no se puede importar desde una
prueba, no se prueba. Una de las cuatro comprobaciones vigila con
`process.getActiveResourcesInfo()` que **no queden relojes sueltos**, porque un
`setTimeout` sin limpiar mantiene viva la funcion en Vercel — arreglar un tiempo
de espera creando otro habria sido gracioso.

**Comprobado contra un socket que acepta y no contesta nunca** (un agujero
negro, que es exactamente lo que hace la conexion directa desde Vercel): la
pantalla responde en **0,7 s** con el motivo escrito, en vez de agotar los 10 y
devolver 504.

**La leccion, otra vez la misma de la vuelta anterior con otra ropa:** una
herramienta de diagnostico que depende de lo que diagnostica no es una
herramienta de diagnostico. Falla justo cuando hace falta.

4 comprobaciones del tope. 22 de diagnostico. **89 en total.**

### Sesion 10, vuelta 13 — sondas de red: llegar es un paso antes de preguntar

Adrian mando la pantalla de estado ya con la cadena **correcta**: usuario
`postgres.<referencia>` ✓, puerto `6543` ✓, contrasena puesta ✓, servidor
`aws-1-eu-west-1.pooler.supabase.com` — el pooler, no la conexion directa. Las
tres comprobaciones en verde. Y aun asi: "La base no contesto en 4 segundos".

**Ahi la pantalla se quedo sin nada que decir.** Con las tres comprobaciones de
forma en verde y un tiempo agotado, no habia forma de saber si el fallo era la
direccion, el puerto, el proyecto o la base. El diagnostico se acababa justo
donde empezaba el problema.

**Y habia un fallo mio encima.** El tope de la pantalla eran 4 s y el
`connect_timeout` del cliente 5 s, asi que **el tope ganaba siempre la carrera**.
El error que salia era el mio —"no contesto a tiempo"—, generico, en lugar del de
Postgres, que habria dicho `ENOTFOUND`, `ECONNREFUSED` o `ETIMEDOUT`. Un tope
puesto para no perder el diagnostico estaba tapandolo. Ahora `connect_timeout`
son 3 s y el tope de la consulta es lo que quede del presupuesto: **se rinde
antes el cliente**, y lo que sale es su error de verdad.

**Dos sondas, antes de Postgres** (`src/lib/panel/sonda-red.ts`):

1. **Traducir el nombre** (DNS). No solo si resuelve: **de que familia**. Un
   nombre que solo da IPv6 es la conexion directa de Supabase, y esa es la
   diferencia entre "esta mal escrito" y "esta bien escrito pero es la otra".
2. **Tocar el puerto** (TCP). Abrir un socket y cerrarlo, sin mandar un byte.

Con eso, tres averias que se arreglan en sitios distintos dejan de parecer la
misma:

| Lo que contestan | Que pasa de verdad |
|---|---|
| El nombre no resuelve | La direccion esta mal, o el proyecto se borro |
| Resuelve, el puerto no contesta | **Proyecto pausado**, casi siempre |
| Resuelve, el puerto rechaza | Puerto equivocado (`ECONNREFUSED`) o proyecto a medio arrancar (`ECONNRESET`) |
| Acepta, y falla la consulta | La red esta bien: es credenciales o tablas |

Ninguna de las dos necesita credenciales, y juntas tardan menos de medio segundo
cuando todo va bien. El presupuesto total es de 8 s repartidos (2 s al nombre,
2,5 s al puerto, el resto a la consulta), por debajo del corte de Vercel.

**Lo que casi hago mal, y es la parte que vale la pena recordar.** Sonde el
servidor de Adrian desde este contenedor: DNS resolvia por IPv4 y el puerto 6543
no contestaba. Estaba a un paso de escribirle "confirmado, tu proyecto esta
pausado". **Antes calibre**: probe 1.1.1.1:53, github.com:22 y gmail:587. Los
tres, silencio. Este contenedor **solo deja salir por 80 y 443**, asi que mi
sonda no media Supabase, medía la jaula. La prueba que habria "confirmado" el
diagnostico no probaba nada.

La leccion: **una medida sin calibrar no es una medida.** Cuando un instrumento
nuevo confirma a la primera lo que ya sospechabas, esa es justo la vez que hay
que comprobar el instrumento — la respuesta comoda es la que menos se audita.

**11 comprobaciones de las sondas**, contra sockets de verdad: un servidor que
acepta, un puerto cerrado, un nombre inventado. Nada simulado, porque lo que se
comprueba es precisamente la diferencia entre esos casos, y una sonda de mentira
distingue solo lo que le digan que distinga. Una vigila que no quede el socket
abierto, por lo mismo que la del tope vigila los relojes.

**100 comprobaciones del dominio en total.**

### Sesion 10, vuelta 14 — el panel se habia atascado a si mismo

Las sondas de la vuelta anterior hicieron su trabajo y dieron la vuelta al
diagnostico entero. Adrian mando la pantalla con **todo en verde**: proyecto
`Healthy` en Irlanda, el nombre resuelve por IPv4, **el puerto acepta en 77 ms**,
usuario y puerto los del pooler. Y la consulta agotando los 7,8 segundos.

**La pista definitiva estaba en un tiempo que NO salto.** El `connect_timeout`
del cliente son 3 segundos y cubre hasta terminar la autenticacion —se
comprueba en `node_modules/postgres/src/connection.js`, donde el temporizador se
cancela al recibir `ReadyForQuery`—. Si no salto, es que **la sesion se abrio y
se autentico bien**. Credenciales correctas, TLS correcto, red correcta. Lo que
se cuelga es la consulta.

**Y la consulta se cuelga porque el panel se atasco a si mismo.**

La primera llamada al almacen dispara `prepararBase()` → `migrar()` → `create
table if not exists`, que pide un candado exclusivo. Cuando a Vercel se le acabo
el tiempo en los intentos anteriores, corto la funcion **a mitad de la
transaccion**. Postgres no limpia eso solo: la sesion queda `idle in
transaction` **con los candados puestos**, esperando educadamente a un cliente
que ya no existe. A partir de ahi, cualquier `create table` espera para siempre.

**Lo peor: mi propio tope lo empeoraba en cada recarga.** `conTope` abandona la
promesa pero **no cierra la conexion**, asi que la consulta sigue viva al otro
lado. Cada vez que Adrian recargaba la pantalla de estado para ver que pasaba,
anadia otra sesion abandonada al monton. De ahi las 7 conexiones abiertas que
enseñaba Supabase. La herramienta de diagnostico estaba alimentando la averia
que diagnosticaba.

**Arreglado en tres sitios:**

1. **Que no pueda volver a pasar.** Las migraciones llevan ahora `set local
   lock_timeout = '3s'` y `statement_timeout = '15s'` **dentro de su propia
   transaccion** — `set local` y no `set` a secas porque en el pooler de
   transacciones la siguiente consulta puede caer en otra conexion, y lo unico
   garantizado es lo que dura la transaccion. El fallo llega en tres segundos y
   **dice que es un candado**.
2. **Que se pueda ver.** `salud.ts` le pregunta a la base por si misma con
   consultas que **no pueden bloquearse**: `select 1`, `to_regclass` y
   `pg_stat_activity`. Ninguna toca las tablas del panel, asi que contestan
   aunque todo lo demas este atascado. La pantalla enseña el pulso, si las
   tablas existen y cuantas sesiones hay a medio hacer.
3. **Que se pueda arreglar sin saber SQL.** Un boton, solo para el dueno, que
   cierra las sesiones `idle in transaction`. No corta consultas en curso ni
   conexiones sanas: una sesion en ese estado, por definicion, no esta haciendo
   nada — lo unico que aporta es el candado que retiene.

**Ademas, una pista que se habia vuelto falsa.** Con el puerto aceptando en
77 ms, la pantalla seguia diciendo "casi siempre es que la direccion no se puede
alcanzar... usa el Transaction pooler". Correcta para el caso de ayer, **falsa
para el de hoy**, y mandaba a rehacer lo unico que ya estaba bien. `traducirError`
recibe ahora si se llega o no al servidor, y con el puerto aceptando dice lo
contrario: la direccion esta bien, lo que espera es un candado.

**La leccion, y es incomoda:** el sistema de diagnostico no era un observador
neutral. Cada medicion dejaba una sesion muerta, y las mediciones eran la causa
de que el numero subiera. Un instrumento que altera lo que mide no solo da mal
el dato — puede ser el problema.

8 comprobaciones de salud. **108 en total.**
