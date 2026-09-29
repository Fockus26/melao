# D061 · Contenido · Logo placeholder (baldosa + M de trazo + "Melao" en Fraunces 500) en `components/layout/logo.tsx` hasta exportar el SVG C1 · Obsoleta → D079

**Decisión:** mientras no esté el SVG del logo C1 (handoff §5: no está exportado), el logo es
un SVG simple con tokens: baldosa `primary` de radio 10 sobre viewBox 48 con una M de trazo
5,5 en `on-primary`, y el wordmark "Melao" como texto en Fraunces 500 (24 = `text-h2`; el
handoff pide 22 y no hay rol de 22 serif). Todo en un archivo para cambiarlo de una vez.
**Por qué:** las shells necesitan la marca para medir el header y el lateral; dibujar la C1
"a ojo" desde el mockup sería inventar el logo.
**Alternativa descartada:** solo el wordmark en texto: deja el riel del admin (72, sin
wordmark) sin marca visible. Pendiente: CONTENT_CHECKLIST fila 37.
