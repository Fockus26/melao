# Design Rules — Melao

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

**En este proyecto, el caso crítico es el dorado:** `gold-500` (#B8913A) da 2.94:1 sobre
blanco y es **solo decorativo** en el tema claro. Texto dorado = `gold-700`/`gold-800`;
gráficos informativos dorados = `gold-600`. Ver `COLORS.md` y D002.

### Reglas propias de la app

- **Objetivos táctiles ≥ 48×48 px** (criterio de Android, más estricto que el de WCAG).
- **La práctica no depende solo del audio:** la cuenta, el paso actual y el siguiente se ven
  en pantalla siempre (para quien baila sin sonido del coach o con discapacidad auditiva).
- **La práctica no depende solo de la vista:** el coach anuncia por voz; la pantalla de
  práctica expone el paso actual en una región `aria-live` educada (no cada tiempo).
- **Nada parpadea más de 3 veces por segundo.** La cuenta cambia hasta ~3.5 veces por
  segundo a 210 BPM: se cambia el número, **no se hace destellar la pantalla**.
- **Video:** subtítulos o descripción en texto de cada paso (qué se hace en cada tiempo).
- **Wake Lock** en la práctica; si no hay soporte, se avisa.

## Breakpoints

| Nombre | Ancho | Notas |
|---|---|---|
| xs | 0 | base, mobile primero (diseño de referencia: 390) |
| sm | 640px | |
| md | 768px | el que más rompe layouts: ni mobile ni desktop |
| lg | 1024px | la app pasa de barra inferior a navegación lateral; admin cómodo desde aquí |
| xl | 1280px | |
| 2xl | 1536px | |

**Anchos de verificación de QA** (distintos de los breakpoints — son dispositivos reales):
320 · 360 · 390 · 430 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840

La app es mobile-first: en escritorio, el contenido de la app va en una columna centrada con
ancho máximo (valor en el handoff); no se estira a 1920.

## Tokens

- **Cero valores mágicos.** Todo color, espaciado, radio, sombra y tamaño de fuente sale de
  los tokens. Si aparece `mt-[13px]` o `text-[#3a7bd5]`, o el token existe y no se usó, o
  falta un token y eso es una decisión que hay que registrar.
- Unidad base de espaciado: **4px** — todo espaciado es múltiplo.
- Fuente única de tokens: `design/tokens.json` (se genera el CSS; Android/iOS generan sus
  temas del mismo archivo). Ver `DESIGN_TOKENS.md`, `COLORS.md`, `TYPOGRAPHY.md`.

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
- **Librería de componentes:** shadcn/ui — ver `PROJECT_CONTEXT.md`.
- **Sistema de estilos:** Tailwind v4. Uno solo.
- **Backend-first:** ninguna regla de negocio solo en Next.js. Reglas en Postgres/RLS o Edge
  Functions; el core de dominio en `supabase/functions/_shared/core/` es TS puro y testeado.
- **Textos de UI** en `messages/es.json`, nunca literales sueltos en componentes.
- **Servidor de desarrollo:** lo levanta César (excepción solo si él la autoriza por tanda).

## Contenido

- **Ningún agente inventa contenido final**: ni copy, ni `alt` real, ni precios, ni pasos, ni
  canciones, ni licencias. Placeholder marcado + fila en `CONTENT_CHECKLIST.md`.
- **Cero lorem ipsum.** Placeholder realista, en español, con la longitud del texto final.
- Nombres de pasos de ejemplo (placeholder, no catálogo real): Guapea, Dile que no, Enchufla,
  Dile que sí, Exhibe, Sombrero, Setenta, Paso libre.

## Git

- Modo `pr` (ver `GIT_STATE.md`): en la rama de la unidad se commitea y empuja sin pedir
  permiso; la aprobación de César es su revisión del PR.
- **Nunca** push a `main`, nunca `gh pr merge`, nunca auto-merge.
- Nada destructivo: ni `reset --hard`, ni `push --force`, ni borrar ramas, ni reescribir
  historia.

## Reglas específicas de este proyecto

- Todo cambio de comportamiento actualiza `docs/spec/` en el mismo PR (es el contrato que
  Android e iOS van a reimplementar).
- Un estilo de baile nuevo es configuración + contenido, nunca código de motor nuevo.
- Ningún audio entra al catálogo sin fuente y permiso de uso registrados en la canción.
