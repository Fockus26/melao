# D013 · Producto · FSRS en el backend; 1–4 = Again/Hard/Good/Easy; tarjeta por usuario+paso+rol · Pendiente

**Decisión:** repetición espaciada con FSRS (`ts-fsrs`), una tarjeta por (usuario, paso,
rol), calculada en una Edge Function.
**Por qué:** es el algoritmo actual de Anki y sus 4 botones coinciden con la escala de César
(muy difícil, difícil, bien, fácil). En el backend, Kotlin y Swift no lo reimplementan.
**Alternativa descartada:** SM-2 (el Anki clásico): peor predicción, mismo costo.
