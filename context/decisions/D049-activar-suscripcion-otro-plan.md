# D049 · Producto · activate-subscription: mismo plan = idempotente; otro plan con una vigente = 409; vencida = nueva · Pendiente

**Decisión:** con una suscripción vigente del mismo plan, `activate-subscription` la devuelve
tal cual (no renueva ni duplica); con una vigente de otro plan responde 409
`subscription_exists`; una `active`/`past_due` con el período vencido se marca `expired` y se
crea otra. Período de un mes o un año según `plans.billing_interval`.
**Por qué:** v1 es placeholder sin cobro; cambiar de plan de verdad (prorrateo, fecha de
corte) depende de la pasarela real y no conviene inventarlo ahora. El 409 es reversible y no
toca datos; el índice único de una activa por alumno ya impide dos a la vez.
**Alternativa descartada:** cambio de plan inmediato (cancelar la vigente y crear otra):
simple con placeholder, pero fija una semántica que la pasarela podría contradecir.
