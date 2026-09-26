## Qué cambia

<!-- 2-5 bullets concretos. Una unidad de trabajo por PR. -->

-

## Por qué

<!-- El problema o el pedido (cita literal si vino de César). Closes #N si hay issue. -->

## Cómo probarlo

1.

## Capturas

<!-- Si cambió algo visible: `bun run shots` + `bun run shots:publish` y pega aquí el markdown.
     Móvil (375) y escritorio (1280), claro y oscuro. Si no se pudieron tomar: dilo y por qué. -->

## Verificación

- **Hecho:** <!-- qué se comprobó y cómo: anchos, temas, teclado, axe, tests nuevos -->
- **No verificado:** <!-- qué no y por qué -->

## Decisiones

<!-- "Decisión tomada / alternativa" en 2 líneas cada una. IDs de decisions/. -->

## Acciones manuales / orden de despliegue

<!-- SQL a correr, dashboards a configurar, variables de entorno. "Ninguna" si no hay. -->

## Checklist

- [ ] Typecheck, lint, tests (suite completa) y build en verde
- [ ] Cambio visible → `.changeset/<desc>.md` (sin tocar `version` ni `CHANGELOG.md`)
- [ ] UI: WCAG 2.1 AA (teclado, foco visible, 4.5:1, ningún estado solo por color, sin scroll horizontal a 320 px)
- [ ] Sin valores mágicos: solo tokens
- [ ] Copy nuevo marcado como provisional si no es final
- [ ] `context/` actualizado (decisión + fila en el índice)
