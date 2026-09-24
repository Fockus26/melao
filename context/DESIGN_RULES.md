# Design Rules — {{NOMBRE_DEL_PROYECTO}}

> Reglas no negociables. Todo agente y toda skill las cumple sin excepción.
>
> Si un caso concreto necesita romper una regla, **es una decisión nueva** que pasa por César
> y queda registrada en `decisions/` — no una excepción silenciosa dentro de un componente.

## Accesibilidad — WCAG 2.1 AA

- Texto normal: contraste ≥ **4.5:1** contra su fondo real.
- Texto grande (≥24px, o ≥19px bold): ≥ **3:1**.
- Bordes de inputs, íconos informativos y anillos de foco: ≥ **3:1**.
- **Ningún estado se comunica solo con color.** Error, éxito, seleccionado, activo: color
  **+** ícono, texto o forma.
- Foco visible siempre, diseñado, no el outline por defecto ni su ausencia.
- Sin scroll horizontal a **320px** de ancho.
- Al 400% de zoom el contenido reflota en una columna.
- `prefers-reduced-motion` respetado.
- Todo control tiene nombre accesible.

Casos que fallan una y otra vez, verifícalos explícitamente: el tono `main` o `light` de la
marca usado como texto sobre fondo claro · chips y badges de estado · placeholders de input ·
texto sobre imagen o gradiente · texto deshabilitado.

## Breakpoints

| Nombre | Ancho | Notas |
|---|---|---|
| xs | 0 | base, mobile primero |
| sm | {{640px}} | |
| md | {{768px}} | el que más rompe layouts: ni mobile ni desktop |
| lg | {{1024px}} | |
| xl | {{1280px}} | |
| 2xl | {{1536px}} | |
| {{3xl}} | {{1920px}} | {{si el proyecto lo tiene}} |

**Anchos de verificación de QA** (distintos de los breakpoints — son dispositivos reales):
320 · 360 · 390 · 430 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840

## Tokens

- **Cero valores mágicos.** Todo color, espaciado, radio, sombra y tamaño de fuente sale de
  los tokens. Si aparece `mt-[13px]` o `text-[#3a7bd5]`, o el token existe y no se usó, o
  falta un token y eso es una decisión que hay que registrar.
- Unidad base de espaciado: {{4px}} — todo espaciado es múltiplo.
- Ver `DESIGN_TOKENS.md`, `COLORS.md`, `TYPOGRAPHY.md`.

## Componentes

- Antes de crear uno nuevo, revisar `COMPONENTS_INVENTORY.md`. Dos componentes que hacen lo
  mismo con nombres distintos es la deuda más cara del sistema.
- **La librería del proyecto antes que reimplementar** un primitivo a mano: el comportamiento
  de teclado y foco ya está resuelto ahí.
- Los widgets compuestos siguen el patrón de WAI-ARIA Authoring Practices correspondiente.

## Código

- **bun** como gestor y runner. Nunca npm, yarn ni pnpm.
- **Context7** consultado antes de usar la API de cualquier librería.
- Server Components por defecto; `'use client'` lo más abajo posible del árbol.
- TypeScript estricto, cero `any`.
- **Librería de componentes:** {{shadcn/ui | Hero UI | MUI}} — ver `PROJECT_CONTEXT.md`.
- **Sistema de estilos:** {{Tailwind | sx/styled de MUI}}. Uno solo, nunca los dos.
- **Nadie levanta el servidor de desarrollo.** Lo levanta César. Los agentes piden que esté
  corriendo y esperan confirmación.

## Contenido

- **Ningún agente inventa contenido final**: ni copy, ni `alt` real, ni precios, ni datos de
  contacto, ni testimonios. Placeholder marcado + fila en `CONTENT_CHECKLIST.md`.
- **Cero lorem ipsum.** Placeholder realista, en el idioma del proyecto, con la longitud del
  texto final. Un layout validado con lorem se rompe cuando llega el copy de verdad.

## Git

- Nada se commitea sin aprobación explícita de César.
- Push automático solo cuando la rama base **no** es `main`.
- Nada destructivo: ni `reset --hard`, ni `push --force`, ni borrar ramas, ni reescribir
  historia.

## Reglas específicas de este proyecto

- {{REGLA_ADICIONAL_1}}
