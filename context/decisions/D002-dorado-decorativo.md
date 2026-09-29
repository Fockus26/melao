# D002 · Colores · Dorado #B8913A solo decorativo en claro; texto gold.700/800, gráficos gold.600 · Aprobado (handoff)

**Decisión:** `gold.500` `#B8913A` solo para filetes y ornamentos en claro. Texto dorado:
`gold.700` `#8A6A1F` (bg/surface) o `gold.800` `#7A5C17` (sunken, tintes). Gráficos que
informan (progreso, nodo actual, ícono activo): `gold.600` `#A07D2C`.
**Por qué:** `#B8913A` sobre blanco = 2.94:1, no llega ni a 3:1 de componentes no textuales.
`#A07D2C` = 3.84 / 3.62 / 3.35 sobre bg / surface / sunken; `#8A6A1F` = 5.05 / 4.76 y falla
sobre sunken (4.40), por eso `gold.800` (5.43) ahí.
**Alternativa descartada:** oscurecer todo el dorado a un solo tono ≥ 4.5:1 — se vuelve
ocre/marrón y pierde el brillo que pidió César como acento.
**Estado (detalle):** Aprobado en el handoff (gold-700/800 ajustados por D024) — se implementa en la fase 01
