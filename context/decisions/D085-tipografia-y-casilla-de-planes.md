# D085 · Componentes · Precios de Planes en numeric-xl / numeric-lg y casilla nueva (Radix) de 24 con área de 48 · Implementado

**Decisión:** el precio de la card de Planes usa `type-numeric-xl` (48/52) y el "Total hoy" del
checkout `type-numeric-lg` (32/36), en vez del 40/44 y 28/600 del tablero P-Planes, que no
existen en la escala. La casilla de términos es un primitivo nuevo, `components/ui/checkbox.tsx`
(Radix Checkbox, estilo shadcn): 24 px, radio sm, marcada en `primary` con check; un `::after`
extiende el área táctil a 48 × 48 sin mover el diseño. Error: borde `error` + `aria-invalid` y
mensaje con `aria-describedby`.
**Por qué:** cero valores mágicos (regla del proyecto): se toma el token más cercano con el mismo
papel (cifra destacada / total). La casilla la reutiliza Bienvenida (handoff P-Bienvenida).
**Alternativa descartada:** agregar tokens `numeric-40` y `numeric-28` solo para esta pantalla:
cambia la escala tipográfica sin revisión de diseño.
