@AGENTS.md

# Melao

App *mobile-first* de suscripción para aprender salsa casino y merengue (más estilos después):
curso en video por rol, coach por voz sincronizado con la canción y repaso espaciado (FSRS).

**Tipo:** app · **Cliente:** proyecto propio de César · **Track de fases:** Producto (07 partida en 07a/07b, D001) · **Modo git:** pr (ver `context/GIT_STATE.md`)

Web (Next.js) hoy; después Android (Kotlin) e iOS (Swift) reimplementan la misma UI y
funcionalidad. **El contrato multiplataforma es `docs/spec/`.**

---

## Qué leer — por niveles, no todo

**Siempre:** este archivo + `context/CURRENT_PHASE.md` (una pantalla: qué está abierto y qué bloquea).

**Según la tarea** — solo la fila que aplica:

| Si la tarea… | Lee además |
|---|---|
| toca UI (componente, sección, página, estilos) | `context/DESIGN_RULES.md`, y `COLORS.md` / `DESIGN_TOKENS.md` / `TYPOGRAPHY.md` solo si toca color, espaciado o tipo |
| implementa algo del diseño | la parte de `design/HANDOFF.md` de esa pieza (no el handoff entero) |
| toca datos, auth, suscripción o API | `context/PROJECT_CONTEXT.md` › Stack + `docs/spec/api.md` |
| toca el coach, la cuenta, el reproductor o las canciones | `docs/spec/motor-de-ritmo.md` |
| toca combinaciones o el repaso | `docs/spec/combinaciones.md` o `docs/spec/srs.md` |
| cambia qué hace una pantalla | la fila de esa pantalla en `docs/spec/pantallas.md` |
| abre o cierra una unidad | skill `git-flow` + `context/GIT_STATE.md` |
| llega con un prompt de orquestador | **solo** lo que el prompt cite: ya trae rutas, líneas y decisiones |

**Buscar, no leer:** `DECISIONS_INDEX.md`, `CONTENT_CHECKLIST.md`, inventarios, `PHASE_LOG/`,
`decisions/`, `plans/pendientes.md`. Se hace `grep` por la palabra o el ID:

```bash
grep -n "dorado\|FSRS" context/DECISIONS_INDEX.md   # ¿ya se decidió algo sobre esto? No lo re-litigues
grep -n "Button" context/COMPONENTS_INVENTORY.md     # ¿existe ya?
```

Detalle y presupuestos de tamaño: `reference/TOKEN-ECONOMY.md` del kit.

---

## Stack

- Next.js 16 (App Router) + React 19 + React Compiler + **TypeScript** estricto
- **Librería de componentes:** shadcn/ui · **Estilos:** Tailwind v4 — uno solo
- **bun** para todo — nunca npm, yarn ni pnpm · Biome para lint y formato
- Supabase: Postgres + RLS, Auth, Storage, Edge Functions · Vercel · Pagos: placeholder (v1)
- Tokens en `design/tokens.json` · textos de UI en `messages/es.json`

```bash
bun install
bun run build
bun run typecheck            # next typegen + tsc --noEmit
bun run lint
bun run test:related         # mientras trabajas: solo los tests afectados (grafo de imports)
bun run test                 # antes del PR: toda la suite (CI la corre siempre)
bun run shots                # capturas para el PR (node + Playwright, ver scripts/)
bun run shots:publish        # las sube a la rama pr-shots e imprime el markdown
```

**Servidor de desarrollo:** lo levanta César. Excepción solo si él la autoriza para una tanda
(cada agente el suyo, en segundo plano, en su puerto). Build, typecheck, lint y tests sí se
corren sin preguntar.

**Scripts con Playwright se corren con `node`, no con `bun`:** en Windows, Playwright bajo
Bun se cuelga al lanzar Chromium.

**Documentación:** Context7 antes de usar la API de cualquier librería. Next 16 cambia APIs:
leer `node_modules/next/dist/docs/` antes de escribir código de Next.

---

## Cómo se trabaja aquí

Una unidad a la vez (un componente, una sección, una pantalla, un flujo, un fix acotado):
algo que se revisa en dos minutos. Una unidad = una rama = un PR.

```
[git-flow: abrir]  →  implementar  →  test:related  →  [a11y]  →  [seo si aplica]
   →  build + typecheck + lint + test  →  capturas (si cambió la UI)
   →  actualizar docs/spec si cambió comportamiento
   →  podar context/  →  [git-flow: cerrar → PR]
```

- **Modo `pr`:** en tu rama puedes commitear y empujar sin pedir permiso — la aprobación de
  César es la revisión del PR. **Nunca** push a `main`, nunca `gh pr merge`, nunca auto-merge.
- Nada destructivo: ni `reset --hard`, ni `push --force`, ni reescribir historia, ni borrar ramas.

### Qué va al repo y qué es local

En git: `context/PROJECT_CONTEXT.md`, `DESIGN_RULES.md`, `COLORS.md`, `DESIGN_TOKENS.md`,
`TYPOGRAPHY.md`, `DECISIONS_INDEX.md`, `decisions/`, `docs/spec/`, `design/`.
Local (gitignored): `context/CURRENT_PHASE.md`, `CONTENT_CHECKLIST.md`, `PAGE_INVENTORY.md`,
`SECTION_INVENTORY.md`, `COMPONENTS_INVENTORY.md`, `PHASE_LOG/`, `plans/`, `.env*`.
Un worktree nuevo **no** los tiene: se leen en la carpeta principal
(`C:\Users\Admin\Documents\Work\melao`). Un subagente en worktree puede no tener permiso de
escritura ahí: entonces los devuelve en su informe y el orquestador los copia.

### Puertas de calidad

| Skill / agente | Cuándo |
|---|---|
| `a11y` | Siempre que se toque UI, antes de pedir revisión |
| `seo` | Init del repo · cierre de sección con contenido · cierre de página (solo público) |
| `git-flow` | Al abrir y al cerrar cada unidad |
| `orchestrate` | Llega una lista de varias cosas a la vez |
| `design-qa` / `functional-qa` | Al cerrar una página / un flujo completo |

---

## Reglas no negociables

- **Cero valores mágicos.** Todo color, espaciado, radio y tamaño sale de los tokens.
- **Cero secretos en el código.** Variables de entorno, `.env.example` sin valores reales.
- **Cero contenido inventado.** Placeholder marcado + fila en `context/CONTENT_CHECKLIST.md`.
- **Cero lorem ipsum.** Placeholder realista, en español, con la longitud del texto final.
- **WCAG 2.1 AA** mínimo: 4.5:1 texto, foco visible, ningún estado solo por color, sin
  scroll horizontal a 320 px. Objetivos táctiles ≥ 48 px.
- **La librería del proyecto antes que reimplementar** un primitivo.
- **Backend-first (D003):** ninguna regla de negocio solo en Next.js (ni Server Actions ni
  componentes). Va a Postgres/RLS o a Edge Functions; el core de dominio es TS puro en
  `supabase/functions/_shared/core/`, con tests y vectores en `docs/spec/vectors/`.
- **Todo cambio de comportamiento actualiza `docs/spec/` en el mismo PR.**
- **El dorado `#B8913A` es decorativo en claro** (2.94:1): texto dorado = gold.700/800 (D002).
- **Ningún audio sin licencia registrada** en la canción (D009).
- **Un estilo de baile nuevo es configuración + contenido**, nunca código de motor (D022).

## Cuándo parar y preguntar

- Falta un dato del handoff → se pregunta, no se estima del mockup.
- Decisión visual nueva → 3 opciones con ventaja y desventaja real, y se espera.
  (Un worker en segundo plano no puede esperar: elige lo conservador y lo explica en el PR.)
- Algo rompe una regla de accesibilidad → gana la regla, se escala.
- Problema en código ya cerrado → se reporta, no se arregla dentro de la unidad actual.
- Archivo sin uso → se señala, **no se borra**.

---

## Contexto del proyecto

**Público:** alumnos de salsa y merengue que practican solos en casa · **Acción principal:**
completar una práctica con el coach · **Tono:** elegante, sereno, cálido, preciso ·
**Idioma:** español (es-419), precios en USD

**Particularidades:**
- La pantalla de práctica va siempre en modo escenario (negro), en ambos temas: se lee a 2 m.
- El coach programa clips contra el reloj de audio, nunca con timers de UI (±20 ms).
- César es profesor y admin (único). Rol `teacher` reservado para después.
- La consultoría (chat + videos + corrección) es v2: se diseña ya, se construye después.
