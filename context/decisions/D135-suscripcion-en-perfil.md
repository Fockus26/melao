# D135 · Datos · La suscripción de Perfil sale de `my_subscription()` con el estado resuelto en SQL; sin CTA a Consultoría · Implementado

**Decisión:** función `public.my_subscription()` (`security invoker`, `auth.uid()`): la vigente o
la más reciente, con plan y precio (null si el plan ya no es legible) y `state` = `active` (la
condición de `has_active_subscription()`), `past_due`, `canceled` o `expired`. Perfil la muestra
con pill de texto y "Se renueva el / Venció el"; sin vigente, "Activa tu plan" → `/plans`. El CTA
a Consultoría del handoff no se muestra hasta la v2.
**Por qué:** D003: qué suscripción se ve y si da acceso es regla; Android/iOS la llaman igual. El
admin lee todas por RLS: la función filtra por quien llama. Consultoría es v2 (CLAUDE.md).
**Alternativa descartada:** leer `subscriptions` + `plans` y decidir el estado en el cliente (regla
repetida en tres plataformas); mostrar el CTA a Consultoría apagado (promete algo que no existe).
