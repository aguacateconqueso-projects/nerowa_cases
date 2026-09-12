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
[PR #10](https://github.com/aguacateconqueso-projects/nerowa_cases/pull/10),
mezclado a `main` el 2026-09-12. Alfredo lo aprobo en lo general — *"me gusta,
pero vamos a cambiar muchas cosas"* — y **la lista de cambios llego el mismo dia,
en la sesion 9**: siete puntos, todos hechos. Ver "Sesion 9" al final.

**De aqui en adelante el dominio no se toca.** `nerowacases.com` sirve la pagina
de espera y nada mas. Todo lo que se construya a partir de ahora se revisa en
Vercel, no en el dominio. Ver "Entornos y publicacion".

---

## Lo primero de la proxima sesion

**Ensenarle a Alfredo el hero rehecho y recoger la siguiente tanda de cambios.**
Los siete puntos que mando en la sesion 9 estan hechos y comprobados en el
navegador; lo que falta es su veredicto sobre como quedaron. Tres en particular
son decisiones de gusto que tome yo y que conviene que mire de frente:

1. **El estuche de color claro se confunde con su propio fondo.** Es la
   consecuencia directa de "la pagina full color en reaccion al color del
   estuche": con un estuche amarillo, el fondo es amarillo. Lo que hoy los separa
   es el pozo negro del centro (`.store-hero-well`) y los haces. Sobre azul
   marino, vinotinto o morado se ve perfecto; sobre amarillo, oro y crema el
   estuche se apoya menos. **Si le molesta, la salida es girar el tono del fondo
   unos grados respecto al del estuche** — se cambia en una linea, en
   `heroSurfaceFor`. No lo hice porque el pidio el mismo color, no uno parecido.
2. **El menu del logo.** El logo ya no sube al principio de la pagina: abre el
   menu, como la hamburguesa. Subir se hace desde "Buy the case" o desde el boton
   de volver al estuche.
3. **En telefono no hay ningun boton para inspeccionar, y no hace falta.** Se
   comprobo con eventos tactiles de verdad: `touch-action: pan-y` ya reparte bien
   el gesto. Detalle en el cierre de la sesion 9.

**Y las tres decisiones de la sesion 8 que siguen sin veredicto:**

1. El boton "Add to cart" **sigue dorado** en los catorce colores. Es lo unico de
   la pagina que no reacciona al color del estuche. Ahora se nota mas que antes,
   porque el resto de la consola si se da vuelta entera.
2. Los catorce colores son inventados, y viven en `src/lib/store/catalog.ts`.
3. ~~En telefono el dedo gira el estuche solo en horizontal.~~ **Resuelto en la
   sesion 9:** el dedo que arranca de lado gira en los dos ejes y los dos dedos
   acercan y mueven, sin ningun boton de por medio.

**Volver a pedir lo que bloquea cerrar la fase 3**, que no lo puedo suplir yo:

| Que falta | Por que bloquea |
|---|---|
| El `.glb` del estuche | Hoy corre un estuche de relleno. Alfredo esperaba dinero el lunes para mandarlo a modelar |
| Los 14 colores: nombre comercial y valor exacto | Son la entrada de la formula del fondo. Sin ellos, tanto la paleta como el fondo a todo color son inventados |

**Lo que NO hay que rehacer aunque cambie el diseno.** Estas piezas estan
verificadas y son independientes de como se vea el hero:

- `src/lib/store/palette.ts` — la formula del color, ahora con las dos
  superficies (hero a todo color y fondo de lectura). Si cambia la paleta, cambian
  los valores de entrada, no la formula. La comprobacion de contraste corre sola:
  `enforceContrast` empuja el hero hasta que el texto cumple AA, asi que un color
  nuevo no puede publicar texto ilegible.
- `src/components/store/store-context.tsx` — el estado y el carrito.
- La separacion entre escena y modelo: `case-scene.tsx` tiene el comportamiento y
  `case-model.tsx` + `case-shape.ts` tienen la forma. El `.glb` entra por el
  segundo sin tocar el primero.

**Y lo que si es desechable sin pena:** el estuche de relleno, los seis textos de
preguntas frecuentes, las tres filas de envios y los catorce colores inventados.
Todo eso esta rotulado como marcador de posicion en la propia pagina.

**De la fase 2 (sistema de diseno) sigue pendiente** lo que no depende de nadie:
escala tipografica completa, grid de 8 px y tokens de espaciado, y tokens
estructurales (radios, bordes, sombras, capas). La mitad de color ya quedo
resuelta por la formula de `palette.ts`; lo que falta son los valores.

---

## Condiciones de trabajo

1. Todo cambio entra por un **pull request nuevo contra `main`**. Desde el
   2026-09-12 ya no hay conflicto con el dominio: la tienda vive en `/store` y
   la raiz sigue siendo la pagina de espera, asi que mezclar a `main` no cambia
   lo que ve quien llega de Instagram. Ver "Entornos y publicacion".
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
| 7 | Panel del dueno | Las 6 pantallas (A–F) mas los estados vacios, instalable en el telefono | Pendiente |

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

