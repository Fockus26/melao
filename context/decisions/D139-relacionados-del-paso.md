# D139 · Producto · Relacionados del paso: prerequisitos, el paso base y sus variaciones · Implementado

**Decisión:** "Relacionados" en el detalle = sus prerequisitos (`step_prerequisites.step_id = paso`,
"Antes aprende"), el paso del que es variación (`variation_of`, "Es una variación de") y sus
variaciones (pasos con `variation_of = paso`, "Variaciones"). Solo publicados y del mismo estilo;
un paso aparece una vez, con la primera relación en ese orden (p. ej. Enchufla doble requiere
Enchufla y es su variación: sale como prerequisito). Los pasos que **requieren** a este no entran.
**Por qué:** es lo que el alumno necesita para aprender este paso o seguir desde él, y lo que
pide la fila de pantallas.md ("Variaciones · Prerequisitos"). Los que lo requieren pueden ser
muchos y ya se ven en el catálogo.
**Alternativa descartada:** incluir "lo requieren" (lista larga en pasos base como Guapea) o
pasos de la misma categoría (relación débil, ruido).
