# D040 · Producto · tMs de la línea de tiempo en ms enteros: floor(t + 0.5); la rejilla no redondea · Implementado

**Decisión:** `tMs = floor(t(beat) + 0.5)`, con `t` en doble precisión y la fórmula exacta de
§2. La rejilla (`beatToMs`) no redondea; solo los eventos.
**Por qué:** un entero viaja igual en JSON a Kotlin y Swift, y 0.5 ms es despreciable contra la
tolerancia de ±20 ms del reproductor. `floor(x + 0.5)` es el `Math.round` de JS y de Kotlin;
Swift `.rounded()` redondea la mitad lejos de cero, así que se nombra la fórmula para que nadie
dependa del redondeo por defecto de su lenguaje. Los vectores lo fijan (`timeline-redondeo-192bpm`).
**Alternativa descartada:** `tMs` fraccionario (los vectores dependerían de la precisión de
cada plataforma); truncar (sesgo sistemático de hasta 1 ms hacia atrás).
