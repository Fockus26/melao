# D044 · Producto · FSRS sin pasos cortos (enable_short_term false): intervalos en días; srs_cards no guarda learning_steps · Aprobado (César, 2026-09-28)

**Decisión:** parámetros por defecto de `ts-fsrs` 5.4.2, retención 0.90, sin *fuzz* y sin
pasos de aprendizaje de minutos: intervalos en días (mínimo 1), `new → review` al primer
repaso; `learning`/`relearning` no se producen.
**Por qué:** `srs_cards` no guarda `learning_steps` (ni `scheduled_days`); con pasos cortos
el índice del paso se perdería en cada lectura y una tarjeta en `learning` no se graduaría
nunca. Además un paso de baile se repasa por sesión: "Para hoy" es por día, un vencimiento a
los 10 minutos no tiene uso. Sin *fuzz*, los vectores son deterministas.
**Alternativa descartada:** migración que añade `learning_steps` a `srs_cards` y deja los pasos
por defecto (1 min, 10 min). Se puede adoptar después sin romper tarjetas existentes.
**Estado (detalle):** Implementado (07a) · aprobado por César 2026-09-28
