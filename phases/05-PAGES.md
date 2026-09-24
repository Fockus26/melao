# Fase 05 — Páginas

## Objetivo

Ensamblar las secciones en rutas reales, con su navegación y su metadata.

## Alcance

- Una ruta por unidad de trabajo.
- Composición de secciones en el orden del handoff.
- Navegación entre páginas, con estado activo.
- Metadata por página y JSON-LD del tipo correspondiente (skill `seo`).
- Rutas dinámicas con `generateMetadata` y `notFound()` cuando el recurso no existe.
- Entrada en `sitemap.ts`.

## Entradas

`design/HANDOFF.md` · `context/PAGE_INVENTORY.md` · fase 04 cerrada

## Criterio de cierre

- [ ] Todas las rutas del inventario existen y navegan entre sí.
- [ ] Un solo `<h1>` por página.
- [ ] Metadata única por página; canonical correcta.
- [ ] Las páginas que no deben indexarse (gracias, cuenta, checkout) con
      `robots: { index: false }`.
- [ ] Cero enlaces rotos.
- [ ] Puerta `a11y` en verde · skill `seo` ejecutada en modo *página*.
- [ ] `PAGE_INVENTORY.md` actualizado.
