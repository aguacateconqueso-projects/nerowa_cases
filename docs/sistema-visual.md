# Sistema visual

La norma de la marca. **Rige la pagina de espera y todo lo que se construya
despues.** Antes de inventar un tamano o un peso, se busca aqui.

La implementacion vive en `src/app/globals.css`. Los valores no se escriben
sueltos en cada pagina: se usa la clase que les corresponde, para que el dia
que cambie un tamano cambie en un solo sitio.

---

## Tipografia

**Archivo**, en todas sus variantes. Se carga con `next/font` desde
`src/app/layout.tsx`: se descarga en el build y se sirve desde el mismo
dominio, sin peticion a Google en cada visita y sin salto de fuente al cargar.
Es variable, asi que un solo archivo cubre todo el rango de pesos.

| Rol | Norma | Clase |
|---|---|---|
| Titulares | Archivo 600-700, ancho normal, tracking -1%, caja baja | `.t-heading` (700), `.t-heading-soft` (600) |
| Etiquetas | Archivo 500, 11-12 px, mayusculas, tracking +8% | `.t-label` |
| Texto | Archivo 400, 16-17 px | `.t-body` (17 px), `.t-body-sm` (16 px) |
| Precios y especificaciones | Archivo con cifras tabulares | `.t-figures` |

**Caja baja en titulares.** Los titulares van como se escribe una frase, no en
mayusculas. Las mayusculas son de las etiquetas.

**Cifras tabulares.** Todo precio y toda medida lleva `.t-figures`. Las cifras
ocupan el mismo ancho, asi una columna de precios o de medidas queda alineada.
Importa mas en la fase de la tienda, donde habra catorce filas de existencias.

El tamano (`text-2xl`, `text-sm`) se pone aparte con Tailwind. Las clases del
sistema fijan **peso, tracking y caja**, que es lo que define el rol.

---

## Logo

- El wordmark actual, **blanco plano**. Un solo archivo
  (`public/brand/logo.png`, dorado) que la clase `.logo-flat-white` aplasta a
  blanco con `brightness(0) invert(1)`. No se guardan dos versiones por color.
- **~140 px de ancho en escritorio, ~110 px en movil.**
- **Arriba a la izquierda**, en el `header`. No centrado.

### Unica excepcion: la pagina de espera

En `/` y `/underconstruction` el logo va **centrado, en grande (360 px, o 74%
del ancho en movil) y en su dorado**. Ahi no hay resto de sitio del que ser el
encabezado: la pagina entera es la marca.

La excepcion **empieza y termina en esa pagina**. Cualquier pantalla nueva
sigue la norma de arriba.

---

## Iconos del navegador

- `src/app/icon.png` — 256 x 256, la N del logo centrada con margen.
- `src/app/favicon.ico` — la misma imagen a 48 x 48, para el `/favicon.ico` que
  algunos navegadores piden solos.

Los dos viven en `src/app/`, no en `public/`: Next los detecta por el nombre y
escribe las etiquetas `<link rel="icon">` sin que haya que declararlas.

---

## Color

Lo que hay hoy es el minimo de la pagina de espera, **no la paleta definitiva**:
esa entra en la fase 2, junto con la formula del fondo por color de estuche.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#000000` | Fondo |
| `--foreground` | `#f2f2f2` | Texto |
| `--gold` | `#d4a441` | Etiquetas, enlaces al pasar por encima |
| `--gold-bright` | `#f0c56b` | Alto del degradado del boton, foco |
| `--gold-deep` | `#8a6a20` | Bajo del degradado |

---

## Reglas que vienen del README

- Espaciado en **multiplos de 8**.
- Contraste **WCAG AA** en todo texto.
- **Maximo dos animaciones por pagina.** Hoy la pagina de espera tiene tres
  (haces del fondo, entrada del contenido, recorrido del borde del boton); esta
  anotado como deuda en `progreso.md`.
- Cero fotos de banco de imagenes, cero ilustraciones genericas.
