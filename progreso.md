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

Las cuatro preguntas van **alineadas a la izquierda**, no centradas como el
resto de la pagina. El recurso del copy es la repeticion de "A double bass
case" al arranque de tres lineas seguidas; centradas, los arranques no coinciden
y la repeticion se pierde. En telefono tres de las cuatro ocupan dos lineas, que
es aceptable, pero por eso no conviene alargarlas mas.

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
