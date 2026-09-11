# Progreso — Nerowa Cases

Bitacora del proyecto. **Se lee al abrir cada sesion y se actualiza antes de cerrarla.**
Si algo no esta escrito aqui, no paso.

---

## Estado actual

**Fase 1 de 7 — andamiaje.** El repositorio existe, la aplicacion Next.js corre y
se puede desplegar en Vercel. En `/` y en `/underconstruction` hay una pagina de
espera publicable. Todavia no hay sistema de diseno ni tienda.

---

## Condiciones de trabajo

1. Todo cambio entra por un **pull request nuevo** contra `main`.
2. Idioma de trabajo: **espanol neutro**. El sitio publico va en **ingles**.
3. El despliegue se hace en **Vercel**.
4. Cualquier duda se pregunta **antes** de aplicar el cambio.
5. Este archivo se actualiza al cerrar cada sesion.

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

---

## Fases

| # | Fase | Contenido | Estado |
|---|---|---|---|
| 1 | Andamiaje | Repositorio, Next.js, Tailwind, `progreso.md`, despliegue en Vercel, pagina de espera | En curso |
| 2 | Sistema de diseno | Paleta, escala tipografica, grid de 8 px, tokens, formula del fondo por color | Pendiente |
| 3 | Hero | Cortina de entrada, escena 3D, selector de vista, selector de color, boton de compra | Pendiente |
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

---

## Pendiente de Alfredo (bloquea trabajo)

Nada de esto lo puedo inventar. Cada linea que falte frena una fase.

| Que hace falta | Para que fase | Estado |
|---|---|---|
| Modelo 3D del estuche en `.glb`, o las fotos para mandarlo a modelar | 3 | Falta |
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

- Tipografias definitivas (fase 2). Hoy corre una pila de sistema, provisional.
- Formula exacta del fondo oscuro y desaturado a partir del color del estuche (fase 2).
- Cual de las tres alternativas de movimiento en movil se implementa (fase 3).
- Proveedor de base de datos y de correo para el panel y las reservas (fases 5 a 7).
