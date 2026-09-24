# Fase 01 — Tokens

## Objetivo

Llevar al código el sistema de valores del handoff, de modo que a partir de aquí ningún
componente necesite un valor suelto.

## Alcance

- Colores light y dark en el sistema de tema de la librería elegida (`tailwind.config` /
  `@theme` con Tailwind; `createTheme()` con MUI).
- Escala tipográfica: tamaño, interlineado, peso y tracking por rol.
- Escala de espaciado, radios, sombras, duraciones y curvas, z-index.
- Mecanismo de cambio de tema (si hay dark mode) y respeto de `prefers-color-scheme`.
- Fuentes cargadas con `next/font`, `display: 'swap'`.

## Entradas

`design/HANDOFF.md` §1 · `context/COLORS.md` · `TYPOGRAPHY.md` · `DESIGN_TOKENS.md`

## Unidades de trabajo

1. Colores + tema light/dark
2. Tipografía + carga de fuentes
3. Espaciado, radios, sombras, movimiento, z-index

## Criterio de cierre

- [ ] Todo token del handoff existe en el theme, con el mismo nombre semántico.
- [ ] Los ratios de contraste declarados en el handoff se verifican en el theme real.
- [ ] Dark mode conmuta correctamente y sin flash al cargar.
- [ ] Existe una página o ruta de referencia que muestra todos los tokens juntos, para poder
      revisarlos de un vistazo. Vale la pena: es donde se detectan las inconsistencias antes
      de que se propaguen.
- [ ] `COLORS.md`, `TYPOGRAPHY.md` y `DESIGN_TOKENS.md` reflejan lo implementado.

## Ambigüedad frecuente

Un token del handoff que no llega a AA. **Gana la regla de accesibilidad.** Propón el ajuste
(normalmente un tono más oscuro para texto, dejando el original para superficies), escálalo, y
regístralo como decisión.
