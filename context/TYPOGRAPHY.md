# Typography — Melao

> **Estado: final, reconciliado con el handoff (2026-09-26).** Fuente: `design/HANDOFF.md` §1.3 y
> `design/tokens.json` (`typography`). **Implementado (fase 01):** ver "En código" al final.

## Familias

- **Fraunces** (Google Fonts, `next/font`) — ejes opsz 9–144; 400, 500, cursiva 400. Solo en
  `display-xl`, `display`, `h1`, `h2`, el wordmark y los nombres de estilo en las cards de
  elección de estilo.
- **Geist** (`next/font`) — 400, 500, 600. Todo lo demás: UI, botones, cifras, cuenta.
- `font-variant-numeric: tabular-nums` en todo número que cambia (cuenta, BPM, tiempos,
  contadores, duraciones, porcentajes).

## Escala

| Token | Familia | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `display-xl` | Fraunces | 64 / 68 | 400 | −0.02em | landing y 404 en ≥ 1024 |
| `display` | Fraunces | 40 / 44 | 400 | −0.015em | título de pantalla; hero móvil 40/46 |
| `h1` | Fraunces | 32 / 38 | 400 | −0.01em | títulos de flujo |
| `h2` | Fraunces | 24 / 30 | 400 | 0 | secciones; unidad del camino 22/28 |
| `h3` | Geist | 20 / 26 | 600 | 0 | |
| `h4` | Geist | 16 / 24 | 600 | 0 | nombre de paso en listas |
| `h5` | Geist | 14 / 20 | 600 | 0 | encabezados de tabla admin |
| `h6` = `eyebrow` | Geist | 12 / 16 | 600 | 0.14em, mayúsculas | color `gold-700` |
| `overline` | Geist | 12 / 16 | 400 | 0.14em, mayúsculas | color `text-secondary` |
| `body` | Geist | 16 / 24 | 400 | 0 | |
| `small` | Geist | 14 / 20 | 400 | 0 | |
| `caption` | Geist | 12 / 16 | 400 | 0 | mínimo absoluto 12 px |
| `button` / `button-lg` | Geist | 15 / 20 · 16 / 20 | 600 | 0 | |
| `numeric-xl` | Geist | 48 / 52 | 500 | −0.02em | Para hoy, "24 figuras" |
| `numeric-lg` | Geist | 32 / 36 | 500 | 0 | progreso; BPM admin 36/40 |
| `stage-count` | Geist | 160 / 150 | 500 | −0.04em | caja fija 120 px a la izquierda (Compás); 144/136 en la landing |
| `stage-next` | Geist | 32 / 38 | 500 | 0 | 30/36 si comparte fila |
| `stage-current` | Geist | 22 / 28 | 500 | 0 | |
| `stage-beat` | Geist | 22 / 28 | 400 (activo 600) | 0 | |
| `stage-label` | Geist | 12 / 16 | 400 | 0.16em, mayúsculas | |

## Reglas

- Todo tamaño fuera de esta tabla es una decisión nueva (`decisions/02-tipografia.md`).
- Serif solo en titulares; nunca en botones, controles, cifras ni cuenta (D008).
- Nada por debajo de 12 px.

## En código (fase 01)

- Fuentes: `app/fonts.ts` con `next/font/google`, `display: 'swap'`, subconjunto `latin` (cubre
  el español). Fraunces variable con eje `opsz`, normal + cursiva → `--font-fraunces`; Geist
  variable → `--font-geist`. Geist Mono no se carga (ningún token la usa).
- Familias en Tailwind: `font-serif` (Fraunces, Georgia, serif) y `font-sans` (Geist,
  system-ui, sans-serif; es la del `body`).
- **Por rol, usar `type-<rol>`** (D035): `type-display`, `type-h1`, `type-eyebrow`,
  `type-numeric-lg`, `type-stage-count`… fija familia, tamaño, interlineado, peso, tracking,
  mayúsculas y cifras tabulares. `text-<rol>` existe (solo tamaño + interlineado + peso +
  tracking) para cambiar tamaño por breakpoint (`md:text-h1`).
- `tabular-nums` automático en `numeric-*` y `stage-*`; en cualquier otra cifra que cambie,
  la utilidad `tabular-nums`.
- La escala de Tailwind está vaciada (`--text-*: initial`): `text-sm`, `text-lg`… no existen.
- `stage-beat` activo (600) y los tamaños alternativos de la tabla (hero 40/46, stage-next
  30/36, BPM admin 36/40…) no son roles propios: se resuelven en el componente con
  `font-semibold` / `text-<rol>` más cercano cuando se construya.
