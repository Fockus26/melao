# Design Tokens — Melao

> Fuente única de verdad para valores reutilizables que no son ni color ni tipografía. Todo
> componente consume estos tokens, nunca valores sueltos.
>
> **Estado: propuesta del kickoff.** Al llegar el handoff, los valores finales viven en
> `design/tokens.json` (formato W3C Design Tokens, generado con Style Dictionary: CSS hoy,
> Compose y SwiftUI después) y esta tabla se sincroniza con él.

## Espaciado

Unidad base: **4px** (escala de Tailwind).

| Token | Valor |
|---|---|
| spacing.1 | 4px |
| spacing.2 | 8px |
| spacing.3 | 12px |
| spacing.4 | 16px |
| spacing.5 | 20px |
| spacing.6 | 24px |
| spacing.8 | 32px |
| spacing.10 | 40px |
| spacing.12 | 48px |
| spacing.16 | 64px |
| spacing.24 | 96px |

Padding lateral de pantalla: 16px en mobile (valores por breakpoint en el handoff).

## Radios de borde

| Token | Valor | Uso |
|---|---|---|
| radius.sm | 8px | inputs, chips |
| radius.md | 12px | cards, botones, marco de video |
| radius.lg | 20px | sheets, modales |
| radius.full | 9999px | segmentados, pills, nodos del camino |

## Sombras

Sin sombras decorativas: la jerarquía se hace con superficies y bordes finos.

| Token | Valor | Uso |
|---|---|---|
| shadow.none | none | todo lo que está en el flujo |
| shadow.overlay | `0 8px 24px rgb(17 17 17 / 0.12), 0 2px 6px rgb(17 17 17 / 0.08)` | sheets, popovers, modales (solo claro) |
| shadow.overlay-dark | none + borde `divider` | en oscuro la elevación es por superficie |

## Objetivos táctiles

| Token | Valor |
|---|---|
| touch.min | 48px |

## Breakpoints

Ver `DESIGN_RULES.md` — deben coincidir exactamente, este archivo no los redefine.

## Transiciones / animación

| Token | Valor |
|---|---|
| duration.fast | 150ms |
| duration.normal | 250ms |
| duration.slow | 400ms (transiciones de pantalla) |
| easing.default | `cubic-bezier(0.2, 0, 0, 1)` |
| easing.exit | `cubic-bezier(0.4, 0, 1, 1)` |

Bajo `prefers-reduced-motion: reduce`: transiciones de pantalla y micro-animaciones a 0ms;
la cuenta del escenario cambia sin animación en cualquier caso (no se anima un número que
cambia ~3 veces por segundo).

## Z-index

| Token | Valor | Uso |
|---|---|---|
| z.base | 0 | contenido |
| z.nav | 10 | barra inferior / navegación lateral |
| z.sticky | 20 | cabeceras pegajosas |
| z.overlay | 40 | sheets y modales (con su fondo) |
| z.toast | 50 | avisos |
