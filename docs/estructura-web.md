# Prompt para Claude Design — Nerowa Cases

> Pegar en Claude Design. Fase 1: estructura, comportamiento y mapa de pantallas.
> La dirección visual fina (tipografías, tratamiento) va en un segundo pase.

---

## Lo que estamos construyendo

Una tienda online de un solo producto para **Nerowa Cases**: estuches para dos arcos de contrabajo. Un modelo, catorce colores de catálogo, 180 €. Fabricación por lotes en China, despacho desde Vilnius.

Hoy vende por mensaje directo de Instagram con transferencia bancaria y pierde ventas en el momento de pagar, porque nadie confía en transferirle dinero a un desconocido. La tienda existe para resolver eso.

**No es un sitio de contenido. Es un objeto puesto en una vitrina, con un botón de comprar al lado.** Casi sin texto. La página vende mostrando el producto, no explicándolo.

---

## Quién compra

Contrabajistas profesionales, estudiantes avanzados, luthiers y tiendas del sector. Unión Europea y Reino Unido. Compran en inglés.

Llegan de Instagram o por recomendación de otro músico. **Ya saben qué es y para qué sirve.** No hay que explicarles el producto: hay que dejarlos verlo bien, elegir color y pagar.

---

## Restricciones

- **Móvil primero.** Casi todo el tráfico llega de Instagram, en teléfono, con datos móviles.
- **Idioma: inglés.** Sin selector de idioma.
- **Mercados: Unión Europea y Reino Unido.**
- **El pago no se diseña.** El botón de compra lleva a la página alojada de Stripe. Se diseñan la salida y las dos vueltas.
- Espaciado en múltiplos de 8. Escala tipográfica consistente. Contraste WCAG AA en todo texto.
- Cero fotos de banco de imágenes. Cero ilustraciones genéricas.
- Nada de contadores de urgencia, ventanas emergentes, ruedas de descuento ni avisos de "doce personas están viendo esto".
- **El producto no es artesanal.** Se fabrica por lotes. No hay taller, no hay manos trabajando, no hay narrativa de oficio. No la inventes.

---

## Pantalla 1 · La entrada

Cortina animada sobre fondo negro. Solo la palabra **Nerowa**. La cortina se abre y descubre la escena del producto.

- Se muestra una vez por sesión, no en cada carga.
- Se puede saltar. Cualquier toque o tecla la corta.
- Duración total por debajo de dos segundos.
- No bloquea nada crítico: si algo falla en la animación, la página aparece igual.

---

## Pantalla 2 · Hero · La escena del producto

Esta pantalla es la tienda entera. Todo lo demás es apoyo.

**Composición.** Fondo negro. El estuche flota en el centro, en diagonal, de la esquina superior derecha a la esquina inferior izquierda. Nada más ocupa el espacio central.

**Movimiento.** El estuche tiene un movimiento leve guiado por el cursor: se inclina hacia donde está el puntero. Es sutil, no es un juguete.

*En móvil no hay cursor.* Tres soluciones, en este orden de preferencia:

1. **Arrastre con el dedo** sobre el estuche: lo gira dentro de un rango corto y vuelve solo al soltarlo.
2. **Deriva lenta y continua** cuando nadie toca nada, para que el objeto nunca se vea congelado.
3. Sensor de orientación del dispositivo — funciona, pero en iOS exige un permiso explícito con un botón de por medio. Solo si las dos anteriores no bastan.

Diseña las tres y márcame cuál recomiendas.

**Elementos fijos sobre la escena:**

| Posición | Qué va |
|---|---|
| Arriba a la izquierda | La palabra **Nerowa**, con un botón de menú a su izquierda. El botón tiene que llamar la atención: es la única navegación del sitio. |
| Abajo a la derecha | Selector de vista, selector de color y botón de compra, en ese orden vertical. |

**Selector de vista.** Encima de los colores: `open` · `side` · `detail`. Cambia lo que se ve del estuche. Cada vista se puede pulsar para inspeccionarla en grande.

El estuche es idéntico en los catorce colores: la forma, el interior y los herrajes no cambian. Las tres vistas se producen una sola vez y adoptan el color seleccionado; no se duplican por color.

**Selector de color.** Los colores disponibles, como muestras. Al elegir uno:

- El estuche cambia de color.
- El fondo cambia con él.
- La transición es un fundido cruzado.
- El estuche da una vuelta completa sobre su eje mientras se transforma.

**Aviso de fidelidad de color.** Junto al selector, una línea pequeña advirtiendo que el color en pantalla puede variar respecto al real. Discreta, siempre visible cuando hay colores a la vista, sin ventana emergente y sin que el comprador tenga que aceptar nada.

**Regla de fondo, importante.** El fondo no toma el color literal del estuche: toma una versión muy oscura y desaturada de ese color. Si el estuche es crema y el fondo es crema, el objeto desaparece. Define una fórmula y aplícala a los catorce, y comprueba que el texto sobre el fondo sigue cumpliendo AA en todos los casos.

**Botón de compra.** Siempre visible, siempre al alcance del pulgar en móvil. Muestra el color elegido y el precio.

---

## Pantalla 3 · El resto, al bajar

El menú se queda fijo arriba a la izquierda durante todo el desplazamiento.

Cuatro bloques. Nada más:

| # | Bloque | Qué tiene |
|---|---|---|
| 01 | Qué es | Dos o tres frases. Para dos arcos, francés y alemán indistintamente, los dos a la vez. Una imagen del interior con los arcos dentro. |
| 02 | Especificaciones | Medidas por fuera, medida útil por dentro, peso, materiales. Tabla seca. |
| 03 | Envíos | Unión Europea, 3 a 5 días. Estados Unidos, próximamente. Precio por zona. |
| 04 | Quién lo usa | Los músicos que ya tocan con un Nerowa. Nombre, instrumento y una foto. Sin testimonios largos ni comillas decorativas: el nombre hace el trabajo. |
| 05 | Quiénes somos | Corto. Qué es Nerowa y de dónde sale. Sin narrativa de taller. |
| 06 | Preguntas frecuentes | Seis como máximo. Las que hoy llegan por mensaje directo. |

**Fuera:** cualquier bloque de proceso artesanal, manos trabajando o taller. No existe.

El bloque **Quién lo usa** es el que resuelve la confianza en el momento del pago. Diséñalo para que se lea en dos segundos desde el teléfono y para que aguante crecer de cuatro nombres a doce sin romperse.

**Pie.** Envíos, devoluciones, contacto, legales. **Sin Instagram.**

---

## El menú

Se abre desde el botón de arriba a la izquierda. Tiene que ser una pantalla con presencia, no una lista gris.

Contiene:

- Los bloques de la pantalla 3, como enlaces.
- Devoluciones y garantía, contacto, legales.
- **La invitación a comprar, siempre, y destacada.** Con animación propia. Es el elemento que más pesa dentro del menú.

---

## Estados del color

Cada color puede estar en uno de tres estados. Diséñalos los tres, dentro del selector del hero:

- **Disponible.** Se elige y se compra.
- **Últimas unidades.** Se compra igual, con un aviso discreto. Sin dramatismo.
- **Agotado.** No se puede comprar hoy. En su lugar aparece la reserva: el comprador deja su correo y se le avisa cuando llegue el lote. El plazo de fábrica es de dos a tres semanas y se dice en claro.

La reserva es un formulario de un solo campo. Sin nombre, sin teléfono, sin país.

---

## Después del pago

Dos pantallas de vuelta desde Stripe, y las dos mantienen la escena de fondo:

- **Compra correcta.** Número de pedido, color comprado, qué pasa ahora y cuándo llega.
- **Compra cancelada.** Sin culpa ni presión. Vuelta al producto con el color que había elegido ya seleccionado.

---

## Páginas de apoyo

Cuatro, simples, legibles en teléfono: envíos y plazos · devoluciones y garantía · contacto · legales.

---

## Correos automáticos

Tres plantillas. Texto sobre todo, poca imagen, legibles en el correo del teléfono: confirmación de compra · aviso de envío con número de seguimiento · confirmación de reserva.

---

## Panel del dueño

Esto es la mitad del proyecto, no un extra. Mismo cuidado que la tienda.

**El contexto manda:** Alfredo no tiene computadora. Opera su negocio entero desde el teléfono, tiene poco tiempo y ningún perfil técnico. Se perdió en el panel de escritorio de Stripe. No tiene a nadie que lo haga por él.

**Reglas:**

- Cada tarea se resuelve en una sola pantalla. Sin menús, sin pestañas, sin decisiones intermedias.
- Se instala en la pantalla de inicio del teléfono y se abre como una aplicación.
- Botones pulsables con el pulgar, con una mano, de pie, mientras empaqueta.
- Cada acción confirma que ocurrió. Nada de guardar en silencio.

**Prueba de aceptación, literal:** si Alfredo no puede pegar un número de seguimiento y marcar un pedido como enviado en menos de quince segundos, sin preguntarle nada a nadie, el panel está mal diseñado.

| # | Pantalla | Qué resuelve |
|---|---|---|
| A | Entrar | Correo y contraseña. Que la sesión dure. |
| B | Pedidos | Pantalla de inicio. Los nuevos arriba, grandes. Un vistazo y sabe qué le falta despachar. |
| C | Detalle del pedido | **La más importante.** Quién compró, qué color, dirección, y un campo para pegar el número de seguimiento con un botón que marca como enviado y dispara el correo. Un campo, un botón. |
| D | Existencias | Los colores en una lista. Sumar, restar, apagar un color cuando se acabe. |
| E | Reservas | Quién espera qué color. Un botón para avisarles a todos cuando llegue el lote. |
| F | Ajustes | Lo mínimo. |

Diseña también los estados vacíos: sin pedidos, sin reservas, primer día. Son las pantallas que más va a ver al principio y las que deciden si confía en el panel.

---

## Lo que NO se diseña ahora

- La pantalla de pago (es de Stripe).
- Carril mayorista o B2B.
- Otros idiomas.
- Estados Unidos como mercado.
- Catálogo de más productos.

---

## Qué quiero de vuelta

1. La escena del hero resuelta: composición, comportamiento del movimiento en escritorio y las tres alternativas en móvil, y la transición completa de cambio de color.
2. El selector de vista y cómo se abre la inspección en grande.
3. El menú abierto, con la invitación a comprar destacada.
4. Los tres estados de color.
5. Los bloques de abajo y el pie, con Quién lo usa resuelto.
6. El panel completo, con estados vacíos.
7. Los huecos de imagen rotulados: qué hace falta en cada uno y en qué proporción, para poder producirlo.
