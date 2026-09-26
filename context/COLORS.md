# Colors — Melao

> **Estado: final, reconciliado con el handoff (2026-09-26).** Fuente: `design/HANDOFF.md` §1.1–1.2
> y `design/tokens.json` (`color.light`, `color.dark`, `color.stage`). Si el handoff cambia, se
> actualiza aquí y se registra la decisión. Ratios con la fórmula de WCAG 2.1.
> "tint" = `gold-tint`, "hover" = `hover`.

## Light / Dark (`color.light` · `color.dark`)

| Token | Light | Dark | Uso | Ratios (light · dark) |
|---|---|---|---|---|
| `bg` | `#FFFFFF` | `#0E0E0E` | fondo de página | — |
| `surface` | `#FAF8F4` | `#161616` | cards, barra inferior, lateral | — |
| `surface-sunken` | `#F3EFE6` | `#1E1E1E` | marco de video, chips de metadato | — |
| `text` | `#111111` | `#F4F2ED` | texto principal | bg 18.88 · surface 17.80 · sunken 16.46 · tint 15.75 — dark 17.25 · 16.17 · 14.90 · 13.80 |
| `text-secondary` | `#5A5A5A` | `#B3AEA4` | texto de apoyo | 6.90 · 6.50 · 6.01 · tint 5.75 — dark ≥ 6.99 |
| `text-muted` | `#686868` | `#948F85` | metadatos, bloqueado, placeholder | 5.57 · 5.25 · 4.86 · tint 4.65 · hover 4.98 — dark ≥ 4.80 (D024) |
| `primary` | `#111111` | `#D6B25E` | CTA, segmentado activo, calificación elegida | — |
| `on-primary` | `#FFFFFF` | `#111111` | texto sobre primary | 18.88 · dark 9.34 |
| `primary-hover` | `#2E2E2E` | `#E2C57A` | hover de primary | con on-primary 13.58 · dark 11.24 |
| `gold-500` | `#B8913A` | `#B8913A` | **solo decorativo** (filete 48×1, borde del siguiente) | 2.94 sobre blanco: nunca texto ni gráfico que informe (D002) |
| `gold-600` | `#A07D2C` | `#D6B25E` | gráfico informativo: progreso, nodo actual, nav activa, dificultad | 3.84 · 3.62 · 3.35 · tint 3.21 — dark ≥ 7.64 |
| `gold-700` | `#80621C` | `#D6B25E` | texto dorado (eyebrow, numeración) | 5.70 · 5.38 · 4.97 · tint 4.76 · hover 5.10 — dark ≥ 7.64 (D024) |
| `gold-800` | = gold-700 | = gold-700 | alias, se conserva por compatibilidad (D024) | — |
| `gold-tint` | `#F3EAD3` | `#2A2413` | fondo de seleccionado | text 15.75 · text-secondary 5.75 — dark 13.80 · 6.99 |
| `divider` | `#E7E2D8` | `#2A2A2A` | separadores (decorativo) | — |
| `border-input` | `#858585` | `#6E6E6E` | inputs, chips, botón contorno | 3.69 · 3.48 · 3.22 · 3.08 — dark ≥ 3.03 (D021) |
| `hover` | `#F5F2EB` | `#1C1C1C` | fondo hover de filas y botones | text 16.89 · dark 15.23 |
| `focus-ring` | `#111111` | `#D6B25E` | anillo de foco 2 px + offset 2 px | 18.88 · dark 9.55 |
| `scrim` | `rgba(17,17,17,.4)` | `rgba(0,0,0,.6)` | velo de sheet y diálogo | — |
| `success` | `#1C7644` | `#4CC38A` | éxito + ícono | ≥ 4.70 — dark ≥ 6.97 (D024) |
| `warning` | `#8A5300` | `#E5A93B` | aviso + ícono | ≥ 5.28 — dark ≥ 7.40 |
| `error` | `#B42318` | `#F07167` | error + ícono, input inválido | ≥ 5.49 — dark ≥ 5.34 |
| `info` | `#1D5FA6` | `#6CA8F0` | información | ≥ 5.41 — dark ≥ 6.25 |
| `success-bg` | `#E8F3EC` | `#12261B` | banner de éxito | text 16.60 · success 4.70 — dark 14.23 · 7.19 |
| `warning-bg` | `#F8EFE0` | `#2A2112` | banner de aviso | text 16.56 · warning 5.55 — dark 14.17 · 7.60 |
| `error-bg` | `#FBECEA` | `#2B1614` | banner de error, hover de peligro | text 16.44 · error 5.73 — dark 15.29 · 5.92 |
| `skeleton` | `#EFEBE3` | `#1E1E1E` | bloques de carga | — |

## Escenario (`color.stage`) — idéntico en claro y oscuro (D007)

| Token | Valor | Uso | Ratio sobre #0B0B0B |
|---|---|---|---|
| `bg` | `#0B0B0B` | fondo de práctica | — |
| `count` | `#FFFFFF` | número grande, tiempo activo | 19.68 |
| `current` | `#F4F2ED` | paso actual | 17.59 |
| `next` | `#D6B25E` | paso siguiente | 9.74 |
| `beat-inactive` / `label` | `#8A8A8A` | tiempos inactivos, punto de 4 y 8, AHORA/SIGUIENTE | 5.70 |
| `secondary` | `#B3AEA4` | estilo · BPM, tiempo, "Luego:" | 8.91 |
| `track` / `progress` | `#2A2A2A` / `#D6B25E` | riel (decorativo) / progreso | — / 9.74 |
| `panel` | `#161616` | diálogos sobre el escenario | next 8.95 · secondary 8.19 |
| `control-border` | `#6E6E6E` | borde de reiniciar / voz | 3.86 |
| `rule` | `#B8913A` | filete 48×1 entre cuenta y siguiente | decorativo |
| `button` / `on-button` / `button-hover` | `#FFFFFF` / `#0B0B0B` / `#E6E3DC` | botón pausa | 19.68 · hover 15.36 |
| `warning-bg` / `warning` | `#2A2112` / `#E5A93B` | aviso "la pantalla puede apagarse" | current 14.17 |

## Notas de contraste

- **Tres dorados (D002, D024):** 500 decora, 600 informa (≥ 3:1), 700 es texto (AA en las cinco
  superficies). Es fácil "unificar" al 500 y romper AA.
- El escenario **no** usa los tokens del tema: no se implementa como `dark:`.
- Detalle en `decisions/01-colores.md`.
