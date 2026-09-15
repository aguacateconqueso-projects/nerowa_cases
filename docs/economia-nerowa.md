# Economía de Nerowa — los números que usa el panel

> Escrito en la sesión 10 (2026-09-15) con los datos que dio Adrián. Es la fuente
> de la que salen los precios de la tienda, el portal de tiendas y el gráfico de
> ganancia del panel (`docs/panel-nerowa.md`, §6.5 y §9.3).
>
> **Cada número de aquí tiene su origen anotado.** Los que son cálculo míos están
> marcados como tales, y los que hay que confirmar con un asesor también.

---

## 1. Los datos de partida

| Dato | Valor | Origen |
|---|---|---|
| Precio de fábrica en China | **24 €** por estuche | Adrián |
| Último pedido: unidades | **100** | Adrián |
| Último pedido: factura de fábrica | **2.400 €** | Adrián |
| Último pedido: **desembolso total** | **~3.400 €** | Adrián |
| Precio de venta al público | **180 € sin IVA** | Adrián |
| Precio a tiendas | **120 / 110 / 100 €** por tramo | Adrián |
| Envío | **Siempre aparte**, y se cobra lo que cuesta o más | Adrián |
| Sale desde | **Vilnius, Lituania** | Adrián |
| Se fabrica en | **China** | Adrián |

---

## 2. Lo que cuesta de verdad un estuche

Los 24 € son el precio de fábrica, no el costo. Entre China y el almacén de
Alfredo hay 1.000 € más por lote:

```
Factura de fábrica        2.400 €      24,00 € / unidad
Traer el lote a Vilnius   1.000 €      10,00 € / unidad   ← flete, aduana, IVA de importación, despacho
──────────────────────────────────────────────────────
Costo puesto en Vilnius   3.400 €      34,00 € / unidad
```

**El número que el panel usa para calcular ganancia es 34 €, no 24 €.** Usar 24 €
inflaría el margen en un 42% en cada venta, y a fin de año la diferencia sobre un
lote de 100 son 1.000 € que nunca existieron.

### 2.1 El panel calcula esto por lote, no con un número fijo

El flete y la aduana cambian con el tamaño del pedido, con la ruta y con el año.
Por eso el panel guarda **lotes de importación**, no un costo global:

| Campo del lote | Ejemplo |
|---|---|
| Fecha | 2026-08 |
| Unidades | 100 |
| Factura de fábrica | 2.400 € |
| Flete | por desglosar |
| Aranceles | por desglosar |
| IVA de importación | por desglosar |
| Despacho y otros | por desglosar |
| **Costo unitario del lote** | **34,00 €** — lo calcula el panel |

Cada estuche vendido se atribuye al lote del que salió, así que el día que el
lote 2 llegue a 31 € o a 38 €, el gráfico de ganancia lo refleja solo y los
pedidos viejos conservan su costo real. Sin esto, cambiar de proveedor o de ruta
ensucia todo el histórico hacia atrás.

### 2.2 Hay que pedirle a Alfredo el desglose de esos 1.000 €

**Y no es burocracia: probablemente una parte grande no sea costo.**

Al importar de China a la Unión Europea se paga IVA de importación sobre el valor
del lote. Ese IVA, si la empresa está registrada a efectos de IVA, **se recupera**
— es dinero adelantado, no gastado. De los 1.000 € podrían ser perfectamente unos
500–600 €.

Si ese fuera el caso, el costo real por estuche baja de 34 € a algo cercano a
**28 €**, y cada venta deja 6 € más de lo que dice el cálculo conservador de este
documento.

**Mientras no haya desglose, el panel usa 34 €.** Prefiero que el gráfico se
quede corto y luego mejore, a que prometa un margen que no está.

> ⚠️ **Y hay una pregunta más incómoda, que hay que hacerle al asesor:** si ese
> lote se importó antes de que exista la empresa, y entró a nombre de Alfredo
> como particular, ese IVA probablemente **no se pueda recuperar** y además
> complica revender la mercancía a nombre de una sociedad que aún no existía.
> No sé cómo se hizo. Es de las primeras cosas que el asesor tiene que mirar
> cuando Alfredo defina la empresa, esta semana o la próxima.

---

## 3. Venta por la web

### 3.1 El precio que ve el cliente

Adrián confirmó que los 180 € son **sin IVA**. Entonces:

```
Precio neto                    180,00 €
IVA de Lituania (21%)           37,80 €
──────────────────────────────────────
Precio al cliente              217,80 €
```

**En la tienda hay que mostrar 217,80 €, no 180 €.** Vendiendo a consumidores en
la Unión Europea, el precio que se enseña tiene que ser el final con impuestos
incluidos. Mostrar 180 € y sumar el IVA en el último paso del pago es de las
cosas que traen una queja de consumo.

> El precio que se muestre en el hero de la tienda hay que cambiarlo: hoy hay un
> marcador de posición. Este es el número real, a falta de decidir lo del §3.3.

### 3.2 Lo que queda de cada venta

| Concepto | |
|---|---|
| Entra del cliente | 217,80 € |
| IVA, que no es nuestro | − 37,80 € |
| **Ingreso neto** | **180,00 €** |
| Costo del estuche | − 34,00 € |
| Comisión de Stripe *(estimada)* | − 3,52 € |
| **Queda** | **≈ 142,48 €** |

Es un **79% del ingreso neto**. Es un margen muy bueno, y explica por qué este
negocio aguanta perfectamente un panel que cueste 65 € al mes.

- El envío no aparece porque se cobra aparte y a costo. Si algún día se cobra de
  menos, el panel lo va a mostrar como lo que es: margen que se escapa.
- La comisión de Stripe es una estimación con las tarifas europeas habituales, y
  **se cobra sobre los 217,80 €, no sobre los 180** — Stripe no sabe qué parte es
  IVA. Con tarjetas de fuera del espacio europeo la comisión sube. **El número
  exacto lo confirma la cuenta de Stripe cuando exista**; el panel, de todas
  formas, no lo estima: lee de Stripe lo que realmente cobró en cada venta.

### 3.3 Una cosa que hay que decidir antes de vender fuera de Lituania

Vendiendo a consumidores de otros países de la Unión, pasado cierto umbral de
ventas transfronterizas al año hay que cobrar **el IVA del país del comprador**,
no el lituano. Y el IVA no es igual en todas partes: 21% en Lituania, 19% en
Alemania, 20% en Francia, 27% en Hungría.

Eso obliga a elegir, y las dos opciones son legítimas:

| Opción | Qué implica |
|---|---|
| **Precio final igual en toda la UE** (217,80 €) | El cliente siempre ve lo mismo. Lo que varía es lo que queda: 183 € netos en Alemania, 171 € en Hungría. Más simple de comunicar, más fácil de vender |
| **Precio neto igual** (180 € + el IVA de cada país) | El margen es idéntico siempre, pero el alemán ve 214,20 € y el húngaro 228,60 €. Precios distintos según desde dónde se mire la misma página |

**Mi recomendación es la primera**, precio final igual en toda Europa: la
diferencia de margen entre el mejor y el peor caso es de unos 12 €, y no vale la
pena pagarla con una página cuyo precio cambia según el país del visitante,
justo en el hero que tanto trabajo costó.

Esto no bloquea nada ahora — es de la fase 5, cuando entre Stripe — pero conviene
decidirlo antes de imprimir el precio en ningún sitio. Y **confirmarlo con el
asesor**, porque el umbral y el trámite de declaración tienen su procedimiento.

---

## 4. Venta a tiendas

### 4.1 Los tramos y lo que dejan

Precios de Adrián, envío siempre aparte:

| Unidades | Precio | Costo | **Queda** | Sobre el precio |
|---|---|---|---|---|
| 1 a 5 | 120 € | 34 € | **86 €** | 72% |
| 6 a 15 | 110 € | 34 € | **76 €** | 69% |
| 16 o más | 100 € | 34 € | **66 €** | 66% |

Sin comisión de pago, porque las tiendas pagan por transferencia.

Un pedido de 16 estuches a 100 € son **1.600 € de factura y 1.056 € de margen**,
con un solo envío y una sola gestión. Comparado con vender esos mismos 16
estuches de a uno por la web, se gana menos por unidad pero se trabaja
dieciséis veces menos.

### 4.2 Lo que le queda a la tienda, que es lo que decide si compra

Este es el número que mira el comprador de una tienda, y conviene tenerlo a la
vista antes de la primera reunión. Suponiendo que la tienda revenda al mismo
precio que ustedes:

| Compra a | Le queda | |
|---|---|---|
| 120 € | 33% | Por debajo de lo que suele pedir una tienda especializada |
| 110 € | 39% | Justo |
| 100 € | **44%** | En el rango que una tienda de instrumentos considera normal |

**El comentario, y es de negocio, no de software:** el tramo que una tienda nueva
va a querer comprar — tres o cinco estuches, para probar si se venden — es
justamente el que le deja peor margen. Y el tramo que le resulta atractivo, 16 o
más, exige comprometer 1.600 € con un producto que todavía no ha vendido nunca.

No digo que los precios estén mal: el margen de ustedes es excelente en los tres
tramos y hay espacio de sobra. Solo que **el primer tramo puede costar cerrar la
primera tienda**, y la primera tienda es la que importa. Dos formas de arreglarlo
sin tocar la tabla, si aparece el problema:

- **Envío gratis a partir de 6 unidades.** Cuesta poco y empuja a saltar de tramo.
- **Precio de primera compra**, por una vez, para que la tienda pruebe sin
  arriesgar.

Es decisión de Adrián y no bloquea nada. Queda escrito para cuando aparezca.

### 4.3 El IVA cambia el total de la factura

Ya estaba anotado en el diseño del panel y ahora tiene números:

| A quién se le vende | Factura de 16 unidades |
|---|---|
| Tienda lituana | 1.600 € + 336 € de IVA = **1.936 €** |
| Tienda de otro país de la UE **con número de IVA válido** | **1.600 €**, normalmente sin IVA: lo declara el comprador |
| Tienda de otro país de la UE **sin número válido** | Se le cobra IVA |

Son 336 € de diferencia en una sola factura. Por eso la ficha de cada tienda
guarda el número de IVA y si está validado, y cada pedido deja constancia de cuál
de los tres casos se aplicó. **Confirmar el procedimiento con el asesor antes de
emitir la primera factura.**

---

## 5. El lote: cuándo se paga solo

3.400 € invertidos en 100 estuches.

| Vendiendo... | El lote está pagado con |
|---|---|
| Solo por la web, a 142,48 € de margen | **24 estuches** |
| Solo a tiendas, en el peor tramo (66 €) | **52 estuches** |

Dicho de otro modo: **con una cuarta parte del lote vendida por la web, los otros
76 estuches son ganancia.** Si el lote entero se vendiera por la web, serían
unos **14.200 € sobre 3.400 € invertidos**.

Esto es lo que el panel tiene que enseñar en la pantalla de números, porque es la
pregunta que de verdad importa cuando llegue el momento de pedir el lote
siguiente: *cuántos quedan, cuánto llevamos recuperado de este lote, y cuándo hay
que volver a pedir.*

---

## 6. Qué hace el panel con todo esto

| Dónde | Qué usa |
|---|---|
| Hero de la tienda | 217,80 €, o lo que salga de la decisión del §3.3 |
| Portal de tiendas | Los tres tramos, y el total calculado con o sin IVA según el §4.3 |
| Gráfico de ganancia (§6.5 del panel) | Ingreso neto − costo del lote − envío real − comisión real de Stripe |
| Pantalla del pedido | Al marcar enviado, pregunta el costo del envío con el último importe sugerido |
| Lotes de importación | La pantalla del §2.1, que es de Adrián |
| Existencias | Cuántos quedan del lote, y el aviso de cuándo volver a pedir |

---

## 7. Lo que falta para cerrar estos números

| Qué | Quién | Para qué |
|---|---|---|
| **Desglose de los 1.000 €** del lote: flete, arancel, IVA de importación, despacho | Alfredo | Saber si el costo real es 34 € o 28 € (§2.2) |
| **A nombre de quién se importó el lote actual** | Alfredo + asesor | Si el IVA de importación se puede recuperar (§2.2) |
| **Datos fiscales de la empresa** | Alfredo, esta semana o la próxima | Facturar a tiendas |
| Decidir el §3.3: precio final igual en toda la UE, o precio neto igual | Adrián | Antes de imprimir el precio en la tienda |
| Confirmar tarifas reales de Stripe | Al abrir la cuenta | El panel lee las reales, esto es solo para la previsión |
| Costo de envío típico por zona desde Vilnius | Alfredo | Comprobar que lo que se cobra cubre lo que cuesta |

---

*Todos los cálculos de este documento salen de los datos del §1 y se pueden
rehacer. Si un dato de partida cambia, cambia el documento — no se parchea un
número suelto.*
