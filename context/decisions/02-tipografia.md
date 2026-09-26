# Decisiones — Tipografía

## D008 — Fraunces en titulares, Geist Sans en UI y cifras
**Decisión:** titulares y pantallas de marca en Fraunces (serif variable); botones,
controles, cuentas, BPM y datos en Geist Sans con cifras tabulares.
**Por qué:** César eligió la mezcla A + B (editorial en la marca, práctica en la UI). Una
serif en la cuenta del escenario se lee peor a distancia; Geist ya viene integrada con
`next/font` y trae cifras tabulares, así los números no "bailan" al cambiar.
**Alternativa descartada:** serif en todo (dirección A) — pierde legibilidad en controles y
números; sans en todo (dirección B) — se ve como una app genérica de fitness.
**Estado:** Aprobado en el handoff (Fraunces 400/500 + cursiva; Geist 400/500/600) — se implementa en la fase 01
