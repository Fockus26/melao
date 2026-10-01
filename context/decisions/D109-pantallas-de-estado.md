# D109 · Componentes · Pantallas de estado con un componente común y la cuenta «1 2 3 4 5 6 7 ·» del 404 · Implementado

**Decisión:** 404, error inesperado, sin conexión y mantenimiento comparten `components/status/status-screen.tsx`
(logo arriba, contenido centrado, columna de ancho completo; ilustración · filete gold-500 · eyebrow · título ·
texto · extra · acciones). La cuenta (`aria-hidden`) va entera con el 4 grande en Fraunces cursiva en el 404 y
"desacompasada" sin el 4 en el 500. El 404 pasa a dos columnas desde 1024 px con título display-xl; el 4 toma ahí
el tamaño de la cuenta del escenario (`--text-stage-count`, 160), el único token de ese tamaño. Con sesión, el 404
ofrece Inicio (`/app`) y el curso; sin sesión, la portada y Entrar. Los botones son los `Button` `lg` del sistema
(radio `md`), no las píldoras del lienzo.
**Por qué:** diseño aprobado por César el 2026-10-01 sin cambios; un solo componente deja las cuatro pantallas
iguales en web y da una pieza que Android/iOS reimplementan una vez. Los botones del sistema evitan una segunda
forma de botón (handoff §2).
**Alternativa descartada:** `global-not-found.js` (experimental en Next 16; el layout raíz es único y basta
`app/not-found.tsx`). Botones en píldora como el lienzo: sería una variante nueva de Button para cuatro pantallas.
