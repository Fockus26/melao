# D084 · Contenido · Precio "US$20": Intl es-419 para la cifra y el símbolo US$ pegado; "al mes" / "al año" · Implementado

**Decisión:** los precios se escriben con `formatPrice` (`lib/plans/format.ts`): la cifra sale de
`Intl.NumberFormat("es-419", { style: "currency", trailingZeroDisplay: "stripIfInteger" })`
(agrupación con coma, sin decimales si es entero: US$20, US$19.99, US$1,234.50) y, en USD, el
código se reemplaza por `US$` pegado a la cifra. El período sale de `billing_interval`: "al
mes" / "al año" en la card, "US$20 / mes" en el resumen y "Renovación mensual / anual".
Precio y período siempre vienen de `plans`; nada escrito en el cliente.
**Por qué:** es-419 da `USD 20.00`, que no es lo que muestra el diseño (US$20) ni lo que lee un
alumno latinoamericano como precio en dólares. Las nativas replican la misma regla.
**Alternativa descartada:** `currencyDisplay: "narrowSymbol"` ($20): ambiguo con monedas locales
que también usan `$`.
