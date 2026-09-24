# Fase 08 — Responsive y pulido

## Objetivo

Recorrer todo lo construido y corregir la deriva. A diferencia de la fase 09, aquí **sí se
corrige**, no solo se reporta.

## Alcance

- Cada página en cada breakpoint del proyecto: 320 · 360 · 390 · 768 · 1024 · 1440 · 1920
  {{· 2560 · 3840}}.
- Mobile en horizontal y pantallas de altura corta.
- Zoom al 200% y al 400%.
- Coherencia de tokens: cero valores mágicos, espaciados de la escala, radios consistentes.
- Coherencia entre páginas: los mismos elementos se ven iguales en todas.
- Consistencia de hover y focus entre elementos equivalentes.
- Modo oscuro revisado en todo, no solo donde se probó.
- `prefers-reduced-motion` respetado.

## Entradas

Todo lo implementado · `design/HANDOFF.md` · `context/DESIGN_RULES.md`

## Criterio de cierre

- [ ] Sin scroll horizontal en ningún ancho, en ninguna página.
- [ ] Sin texto cortado ni solapado en ningún breakpoint.
- [ ] `grep -rnE '\[[0-9]+px\]|\[#[0-9a-fA-F]{3,8}\]' components/ app/` limpio o justificado.
- [ ] Ritmo vertical consistente entre secciones equivalentes.
- [ ] Objetivos táctiles ≥44px en mobile.
- [ ] Modo oscuro revisado en todas las páginas.
- [ ] Correcciones registradas en `decisions/08-responsive.md`.

## Ambigüedad frecuente

Una corrección responsive con más de un camino razonable (cómo colapsa una grid de 4
columnas, dónde se corta una tabla ancha): 3 opciones y se espera.
