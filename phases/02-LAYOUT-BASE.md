# Fase 02 — Layout base

## Objetivo

El esqueleto sobre el que se monta todo lo demás: contenedor, grid, ritmo vertical, providers
y estilos globales.

## Alcance

- `app/layout.tsx`: html/body, idioma, fuentes, providers de tema.
- Contenedor y anchos máximos por breakpoint, según §4 del handoff.
- Grid global: columnas, gutters y padding lateral por breakpoint.
- Ritmo vertical entre secciones.
- Estilos globales mínimos: reset, `scroll-behavior`, selección, `focus-visible` por defecto.
- Header y footer estructurales (aunque su contenido llegue después).
- Skip link a `main`.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`.

## Entradas

`design/HANDOFF.md` §4 · fase 01 cerrada

## Criterio de cierre

- [ ] El contenedor se comporta igual en todos los breakpoints del proyecto.
- [ ] Landmarks correctos y un solo `<main>`.
- [ ] Skip link funcional y visible al enfocarlo.
- [ ] Sin scroll horizontal a 320px en la página vacía.
- [ ] Puerta `a11y` en verde.
- [ ] Skill `seo` ejecutada en modo *init*: metadata base, `robots.ts`, `sitemap.ts`,
      favicons, OG por defecto.

## Ambigüedad frecuente

Cómo se comporta el contenedor por encima de 1920px: ¿se ancla a un máximo, o sigue creciendo?
Si el handoff no lo dice, pregunta — es la causa más común de que un sitio se vea vacío en un
monitor grande.
