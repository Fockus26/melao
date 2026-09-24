# Colors — Melao

> **Estado: propuesta del kickoff (2026-09-24).** Es la paleta de partida que recibe Claude
> Design; si el handoff la cambia, el handoff manda (salvo AA) y se registra la decisión.
> Ratios calculados con la fórmula de luminancia relativa de WCAG 2.1.
> Blanco domina · dorado acento · negro acompañante.

## Light mode

| Rol | Hex | Uso | Contraste verificado contra |
|---|---|---|---|
| background.default | `#FFFFFF` | fondo de página | — |
| background.surface | `#FAF8F4` | cards, paneles, barra inferior | — |
| background.sunken | `#F3EFE6` | marco de video, bloques hundidos | — |
| text.primary | `#111111` | texto principal, titulares | bg 18.88 · surface 17.80 · sunken 16.46 |
| text.secondary | `#5A5A5A` | texto de apoyo | bg 6.90 · surface 6.50 · sunken 6.01 |
| text.muted | `#6B6B6B` | metadatos, placeholders | bg 5.33 · surface 5.02 · sunken 4.64 |
| text.disabled | `#A3A3A3` | deshabilitado (exento de AA) | bg 2.52 — nunca para información |
| primary (fill) | `#111111` | botón primario, segmentado activo | texto `#FFFFFF` encima: 18.88 |
| gold.100 | `#F3EAD3` | tinte de seleccionado / destacado | texto `#111111` 15.75 · `gold.800` 5.20 |
| gold.500 | `#B8913A` | **solo decorativo**: filetes, ornamentos | bg 2.94 ✗ (no es informativo) · texto `#111111` encima 6.43 |
| gold.600 | `#A07D2C` | gráficos informativos: progreso, nodos, íconos | bg 3.84 · surface 3.62 · sunken 3.35 · gold.100 3.21 |
| gold.700 | `#8A6A1F` | texto dorado sobre bg y surface | bg 5.05 · surface 4.76 · sunken 4.40 ✗ |
| gold.800 | `#7A5C17` | texto dorado sobre sunken y gold.100 | sunken 5.43 · surface 5.87 · gold.100 5.20 |
| border.input | `#858585` | bordes de inputs, controles | bg 3.69 · surface 3.48 · sunken 3.22 |
| divider | `#E7E2D8` | separadores decorativos | bg 1.29 (decorativo) |
| focus.ring | `#111111` | anillo de foco 2px + offset 2px | bg 18.88 |
| success.main | `#1E7A46` | éxito (+ ícono) | bg 5.35 · surface 5.04 · sunken 4.66 · tinte 4.69 |
| success.bg | `#E7F3EC` | tinte de éxito | — |
| warning.main | `#8A5300` | aviso (+ ícono) | bg 6.33 · surface 5.97 · sunken 5.52 · tinte 5.61 |
| warning.bg | `#FBF0DC` | tinte de aviso | — |
| error.main | `#B42318` | error (+ ícono y texto) | bg 6.57 · surface 6.20 · sunken 5.73 · tinte 5.65 |
| error.bg | `#FBEAE8` | tinte de error | — |
| info.main | `#1D5FA6` | información (+ ícono) | bg 6.48 · surface 6.11 · sunken 5.65 · tinte 5.54 |
| info.bg | `#E6EEF8` | tinte de información | — |

## Dark mode

| Rol | Hex | Uso | Contraste verificado contra |
|---|---|---|---|
| background.default | `#0E0E0E` | fondo de página | — |
| background.surface | `#161616` | cards, paneles | — |
| background.sunken | `#1E1E1E` | marco de video, bloques | — |
| text.primary | `#F4F2ED` | texto principal | bg 17.25 · surface 16.17 · sunken 14.90 |
| text.secondary | `#B3AEA4` | texto de apoyo | bg 8.74 · surface 8.19 · sunken 7.55 |
| text.muted | `#948F85` | metadatos, placeholders | bg 6.00 · surface 5.62 · sunken 5.18 |
| text.disabled | `#5E5A54` | deshabilitado (exento) | bg 2.82 — nunca para información |
| primary (fill) | `#D6B25E` | botón primario, segmentado activo | texto `#111111` encima: 9.34 |
| gold.tint | `#2A2413` | tinte de seleccionado | texto `#F4F2ED` 13.80 · `#D6B25E` 7.64 |
| gold.main | `#D6B25E` | texto y gráficos dorados | bg 9.55 · surface 8.95 · sunken 8.25 |
| border.input | `#6E6E6E` | bordes de inputs | bg 3.79 · surface 3.55 · sunken 3.27 |
| divider | `#2A2A2A` | separadores decorativos | bg 1.34 (decorativo) |
| focus.ring | `#D6B25E` | anillo de foco | bg 9.55 |
| success.main / .bg | `#4CC38A` / `#10281B` | éxito | bg 8.71 · surface 8.17 · tinte 7.07 |
| warning.main / .bg | `#E5A93B` / `#2B2110` | aviso | bg 9.26 · surface 8.68 · tinte 7.58 |
| error.main / .bg | `#F07167` / `#2E1614` | error | bg 6.68 · surface 6.26 · tinte 5.85 |
| info.main / .bg | `#6CA8F0` / `#132236` | información | bg 7.81 · surface 7.32 · tinte 6.49 |

## Modo escenario (pantalla de práctica, en ambos temas)

| Rol | Hex | Uso | Contraste |
|---|---|---|---|
| stage.bg | `#0B0B0B` | fondo | — |
| stage.count | `#FFFFFF` | número de la cuenta | 19.68 |
| stage.next | `#D6B25E` | paso siguiente | 9.74 |
| stage.inactive | `#8A8A8A` | tiempos no activos de la fila | 5.70 |
| stage.current | `#FFFFFF` + subrayado `#D6B25E` | tiempo activo (color **y** forma) | 19.68 |

## Notas de contraste

- **D002:** el dorado de marca `#B8913A` no llega a 3:1 sobre blanco: en claro es solo
  decorativo. Texto dorado = `gold.700` (bg/surface) o `gold.800` (sunken, tintes);
  gráficos que informan (progreso, nodo actual, ícono activo) = `gold.600`.
- `gold.700` **falla** sobre `sunken` (4.40): ahí se usa `gold.800`.
- `#5E5E5E` para los tiempos inactivos del escenario daba 3.04: se subió a `#8A8A8A`.
- Detalle en `decisions/01-colores.md`.
