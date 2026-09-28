# Decisiones — Core de ritmo (07a·3)

## D039 — Frases disponibles: la entrada que se come frases del principio las descuenta de N
**Decisión:** el plan empieza en `startPhrase = k`, el menor entero `≥ 0` con
`t(beatsPerPhrase · (k − leadInPhrases)) ≥ 0`, y cubre `N = max(0, M − k)` frases, donde `M`
son las frases completas desde el beat 0 con `t(B·(p+1)) ≤ danceEndMs`. Ese `N` es el que
recibe el generador de combinaciones y el "caben N figuras" de la UI
(`phraseWindow` en `_shared/core/phrases.ts`; `docs/spec/motor-de-ritmo.md` §3).
**Por qué:** la spec definía `N` desde el beat 0 y a la vez decía que el plan cubre `N` frases;
con intro corta la frase 0 es entrada, así que las dos cosas no podían ser ciertas a la vez.
Contar solo las frases donde se baila una figura es lo que el alumno ve. La fórmula general
coincide con la de la spec para `leadInPhrases = 1` y, con 2+ frases de entrada, desplaza solo
lo necesario en vez de las `leadInPhrases` enteras.
**Alternativa descartada:** `N` desde el beat 0 y que quien arma la sesión reste (cada
plataforma podía restar distinto); desplazar siempre `leadInPhrases` frases (pierde frases
bailables cuando parte de la entrada sí cabe en la intro).
**Estado:** Implementado

## D040 — `tMs` de la línea de tiempo en ms enteros, mitad hacia arriba
**Decisión:** `tMs = floor(t(beat) + 0.5)`, con `t` en doble precisión y la fórmula exacta de
§2. La rejilla (`beatToMs`) no redondea; solo los eventos.
**Por qué:** un entero viaja igual en JSON a Kotlin y Swift, y 0.5 ms es despreciable contra la
tolerancia de ±20 ms del reproductor. `floor(x + 0.5)` es el `Math.round` de JS y de Kotlin;
Swift `.rounded()` redondea la mitad lejos de cero, así que se nombra la fórmula para que nadie
dependa del redondeo por defecto de su lenguaje. Los vectores lo fijan (`timeline-redondeo-192bpm`).
**Alternativa descartada:** `tMs` fraccionario (los vectores dependerían de la precisión de
cada plataforma); truncar (sesgo sistemático de hasta 1 ms hacia atrás).
**Estado:** Implementado

## D041 — Orden de la línea de tiempo y eventos por elemento del plan
**Decisión:** los eventos van por `beat` (y por tanto por `tMs`); en el mismo beat, `stepStart`,
`call`, `count`, `end`. Hay un `stepStart` por cada elemento del plan, también cuando repite el
paso anterior (sin anuncio). `stepId` es el paso en curso en `count`/`stepStart`, el anunciado
en `call` y `null` en la entrada y en `end`. Con `leadInPhrases = 0` no hay entrada ni anuncio
del primer paso.
**Por qué:** un orden total hace los vectores comparables elemento a elemento; `stepStart`
primero deja a la UI cambiar de paso antes de pintar el "1". Marcar cada repetición permite
mostrar "×2" sin reconstruir el plan en el cliente.
**Alternativa descartada:** ordenar solo por `tMs` (empates sin orden definido entre
plataformas); un `stepStart` solo al cambiar de paso (la UI no sabría cuándo empieza la
repetición).
**Estado:** Implementado
