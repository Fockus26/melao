# Design Tokens — Melao

> **Estado: final, reconciliado con el handoff (2026-09-26).** Fuente única:
> `design/tokens.json` (W3C Design Tokens; genera el CSS hoy y los temas Compose/SwiftUI después,
> D018). Este archivo es el resumen legible; si difiere de `tokens.json`, manda `tokens.json`.
> **Implementado (fase 01):** ver "En código" al final.

## Espaciado (`spacing`)

Base 4 px, igual que la escala de Tailwind: tokens `0 1 2 3 4 5 6 7 8 10 12 14 16 20 24 30 32`
= n × 4 px. Valores en uso: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 120, 128.
(6 y 14 aparecen en el lienzo solo como gap de chips y listas: se redondean a 4/8 y 12/16.)

Ritmo vertical: 32 entre secciones de app · 24 entre bloques de formulario · 16 entre campos ·
80/128 entre secciones de landing.

## Radios (`radius`)

| Token | Valor | Uso |
|---|---|---|
| `sm` | 8px | inputs, chips, etiquetas sobre video |
| `md` | 12px | cards, botones, marco de video, banners, filas activas |
| `lg` | 20px | sheets y diálogos |
| `pill` | 999px | segmentados, nodos, switch, pills |

## Sombras (`shadow`) — solo en elevación, nunca en cards

| Token | Valor | Uso |
|---|---|---|
| `sheet` | `0 -12px 32px rgba(0,0,0,.18)` | sheet inferior |
| `modal` | `0 16px 40px rgba(0,0,0,.22)` | diálogo |
| `drag` | `0 8px 24px rgba(0,0,0,.18)` | fila arrastrada (constructor) |

## Movimiento (`motion`)

| Token | Valor |
|---|---|
| `duration-press` | 120ms |
| `duration-hover` | 160ms |
| `duration-move` | 240ms |
| `duration-enter` | 320ms |
| `duration-pulse` | 1600ms |
| `ease-standard` | `cubic-bezier(.2,0,0,1)` |
| `ease-exit` | `cubic-bezier(.4,0,1,1)` |
| `ease-linear` | `linear` |

Qué anima y qué se apaga con `prefers-reduced-motion`: `design/HANDOFF.md` §6. La cuenta del
escenario cambia sin transición siempre.

## Z-index (`zIndex`)

base 0 · nav 10 · popover 20 · scrim 40 · sheet 50 · dialog 60 · toast 70.

## Layout (del handoff §4)

| Contexto | Contenedor | Padding lateral | Navegación |
|---|---|---|---|
| App 360–767 | 100 % | 20 (24 en flujos) | barra inferior 80 |
| App 768–1023 | columna máx. 640 | 32 | barra inferior 80 |
| App ≥ 1024 | lateral 248 + columna máx. 800 | 48 | lateral |
| Landing | contenido máx. 1200 | 24 · 64 (1024) · 120 (1440) | header 72 |
| Admin ≥ 1024 | nav 232 (≥ 1280) o riel 72 + ancho completo | 40 · 28 | lateral |

Objetivo táctil mínimo 48 px (chips de 40 visibles con zona táctil de 48 por pseudo-elemento).
Breakpoints: ver `DESIGN_RULES.md`.

## En código (fase 01)

Todo sale de `app/tokens.css`, generado por `bun run tokens` (D033). Referencia visual: `/tokens`.

| Grupo | Variable | Utilidad |
|---|---|---|
| Espaciado | `--spacing: 4px` + `--spacing-<n>` | `p-4`, `gap-6`, `mt-30`… (n × 4 px) |
| Radios | `--radius-<none\|sm\|md\|lg\|pill>` | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-pill` (los de Tailwind vaciados) |
| Sombras | `--shadow-<sheet\|modal\|drag>` | `shadow-sheet`, `shadow-modal`, `shadow-drag` (los de Tailwind vaciados) |
| Duración | `--duration-<press\|hover\|move\|enter\|pulse>` | `duration-press`, `duration-hover`… (`transition-duration`) |
| Curva | `--ease-<standard\|exit\|linear>` | `ease-standard`, `ease-exit`, `ease-linear` |
| z-index | `--z-<base\|nav\|popover\|scrim\|sheet\|dialog\|toast>` | `z-nav`, `z-dialog`… |

Foco global: `outline 2px var(--color-focus-ring)` con 2 px de separación (`app/globals.css`).
