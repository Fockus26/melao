# Typography — Melao

> **Estado: propuesta del kickoff (2026-09-24).** Claude Design puede sustituir las familias
> justificando la elección; el handoff manda y se registra en `decisions/02-tipografia.md`.

## Familias

- Heading (titulares y pantallas de marca): **Fraunces** (serif variable, Google Fonts) —
  400/500, cursiva 400 para acentos.
- Body, UI, cifras y cuentas: **Geist Sans** (variable, `next/font`) — 400/500/600, con
  **cifras tabulares** (`font-variant-numeric: tabular-nums`) en cuentas, BPM y tiempos.
- Mono: no se usa en la UI de producto.

## Escala (mobile-first)

| Nivel | xs (mobile) | md (tablet) | 1920px+ | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| display | 40px | 48px | 56px | 1.1 | -0.02em |
| h1 | 32px | 36px | 40px | 1.2 | -0.01em |
| h2 | 24px | 28px | 32px | 1.25 | -0.005em |
| h3 | 20px | 22px | 24px | 1.3 | 0 |
| body | 16px | 16px | 17px | 1.5 | 0 |
| small | 14px | 14px | 15px | 1.45 | 0 |
| caption | 12px | 12px | 13px | 1.35 | 0.01em |
| eyebrow/label | 12px | 12px | 13px | 1.3 | 0.08em (sentence case, sin mayúsculas forzadas) |

### Modo escenario (práctica)

| Nivel | Tamaño | Notas |
|---|---|---|
| stage.count | `clamp(120px, 38vw, 160px)` | Geist Sans 500, tabular; se lee a 2 m |
| stage.next | 28–32px | paso siguiente, `stage.next` |
| stage.current | 20–22px | paso actual |
| stage.beats | 16px | fila `1 2 3 · 5 6 7 ·` |

## Reglas

- Todo tamaño de fuente que no esté en esta tabla es una decisión nueva: se registra en
  `decisions/02-tipografia.md` antes de usarlo.
- Serif **solo** en titulares y pantallas de marca (landing, camino, título de lección). En
  botones, controles, cifras y cuentas, siempre sans.
- Nada por debajo de 12px.
- Cuentas, BPM, duraciones y contadores siempre con cifras tabulares (no "bailan" al cambiar).
