# Decisiones — Colores

## D002 — El dorado de marca es decorativo en el tema claro
**Decisión:** `gold.500` `#B8913A` solo para filetes y ornamentos en claro. Texto dorado:
`gold.700` `#8A6A1F` (bg/surface) o `gold.800` `#7A5C17` (sunken, tintes). Gráficos que
informan (progreso, nodo actual, ícono activo): `gold.600` `#A07D2C`.
**Por qué:** `#B8913A` sobre blanco = 2.94:1, no llega ni a 3:1 de componentes no textuales.
`#A07D2C` = 3.84 / 3.62 / 3.35 sobre bg / surface / sunken; `#8A6A1F` = 5.05 / 4.76 y falla
sobre sunken (4.40), por eso `gold.800` (5.43) ahí.
**Alternativa descartada:** oscurecer todo el dorado a un solo tono ≥ 4.5:1 — se vuelve
ocre/marrón y pierde el brillo que pidió César como acento.
**Estado:** Pendiente (propuesta; se confirma con el handoff)

## D007 — Dark mode completo desde la v1 y práctica siempre en modo escenario
**Decisión:** toda la app tiene tema claro y oscuro (sistema / claro / oscuro en el perfil).
La pantalla de práctica usa siempre la paleta de escenario (`#0B0B0B`), en ambos temas.
**Por qué:** César pidió dark mode completo. El escenario se lee a 1–3 m mientras se baila,
ahorra batería en OLED y separa "practicar" de "navegar".
**Alternativa descartada:** dark mode solo en la práctica — César lo quiso completo.
**Estado:** Pendiente

## D021 — Bordes de input que pasan 3:1 en las tres superficies
**Decisión:** `border.input` claro = `#858585`, oscuro = `#6E6E6E`.
**Por qué:** `#8C8C8C` fallaba sobre sunken claro (2.93). `#858585` = 3.69 / 3.48 / 3.22;
`#6E6E6E` = 3.79 / 3.55 / 3.27.
**Estado:** Pendiente
