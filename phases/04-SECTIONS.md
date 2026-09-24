# Fase 04 — Secciones

## Objetivo

Las secciones de página, en el orden vertical que define el handoff.

## Alcance

- Una sección por unidad de trabajo, en orden.
- Layout de cada una según §3 del handoff: grid, columnas, gaps, ancho máximo.
- Comportamiento responsive explícito en cada breakpoint — no "es responsive".
- Contenido real donde exista; placeholder marcado y registrado donde no.
- Jerarquía de headings correcta dentro de la página.

## Entradas

`design/HANDOFF.md` §3 · `sections-template/TEMPLATE-SECTION.md` para el brief de contenido ·
fases 01-03 cerradas

## Criterio de cierre por sección

- [ ] Coincide con el handoff en estructura, espaciado y comportamiento responsive.
- [ ] Usa componentes del inventario; si creó uno nuevo, está registrado.
- [ ] Heading del nivel correcto, sin saltos.
- [ ] Imágenes con dimensiones explícitas y `alt` real o placeholder registrado.
- [ ] Sin scroll horizontal a 320px.
- [ ] Puerta `a11y` en verde.
- [ ] Skill `seo` ejecutada si la sección trae contenido real.
- [ ] Fila en `SECTION_INVENTORY.md`.

## Ambigüedad frecuente

Cómo colapsa un layout de varias columnas en mobile: ¿se apilan en el mismo orden, se
reordena, o algo se oculta? Si el handoff no lo dice, es pregunta obligada — ocultar contenido
en mobile es una decisión de producto, no de implementación.
