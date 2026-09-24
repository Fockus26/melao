# Design Tokens — {{NOMBRE_DEL_PROYECTO}}

> Fuente única de verdad para valores reutilizables que no son ni color ni tipografía. Todo
> componente debe consumir estos tokens en vez de valores sueltos en el código.

## Espaciado

Unidad base: {{8px}}

| Token | Valor |
|---|---|
| spacing.xs | {{4px}} |
| spacing.sm | {{8px}} |
| spacing.md | {{16px}} |
| spacing.lg | {{24px}} |
| spacing.xl | {{32px}} |
| spacing.2xl | {{48px}} |

## Radios de borde

| Token | Valor | Uso |
|---|---|---|
| radius.sm | {{4px}} | {{inputs, chips}} |
| radius.md | {{8px}} | {{cards, botones}} |
| radius.lg | {{16px}} | {{modales, secciones destacadas}} |

## Sombras

| Token | Valor | Uso |
|---|---|---|
| shadow.sm | {{valor css}} | {{hover de card}} |
| shadow.md | {{valor css}} | {{dropdown, popover}} |
| shadow.lg | {{valor css}} | {{modal}} |

## Breakpoints

Ver `DESIGN_RULES.md` — deben coincidir exactamente, este archivo no los redefine.

## Transiciones / animación

| Token | Valor |
|---|---|
| duration.fast | {{150ms}} |
| duration.normal | {{250ms}} |
| easing.default | {{cubic-bezier(...)}} |
