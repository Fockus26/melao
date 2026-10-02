@AGENTS.md

# Melao

App *mobile-first* de suscripción para aprender salsa casino y merengue (más estilos después):
curso en video por rol, coach por voz sincronizado con la canción y repaso espaciado (FSRS).

**Tipo:** app · **Cliente:** proyecto propio de César · **Track de fases:** Producto (07 partida en 07a/07b, D001) · **Modo git:** pr (ver `context/GIT_STATE.md`)
**Kit:** web-agent-kit `.kit-version` (`prompts/ACTUALIZAR-KIT.md` del kit) · **Despliegue:** Vercel `melao-two.vercel.app`, preview por PR

Web (Next.js) hoy; después Android (Kotlin) e iOS (Swift). **Contrato multiplataforma: `docs/spec/`.**

---

## Qué leer — por niveles, no todo

**Siempre:** este archivo + `context/CURRENT_PHASE.md`.

**Según la tarea** — solo la fila que aplica:

| Si la tarea… | Lee además |
|---|---|
| toca UI (componente, sección, página, estilos) | `context/DESIGN_RULES.md`, y `COLORS.md` / `DESIGN_TOKENS.md` / `TYPOGRAPHY.md` solo si toca color, espaciado o tipo |
| implementa algo del diseño | solo la parte de esa pieza en `design/HANDOFF.md` |
| toca datos, auth, suscripción o API | `context/PROJECT_CONTEXT.md` › Stack + `docs/spec/api.md` |
| toca el coach, la cuenta, el reproductor o las canciones | `docs/spec/motor-de-ritmo.md` |
| toca combinaciones o el repaso | `docs/spec/combinaciones.md` o `docs/spec/srs.md` |
| cambia qué hace una pantalla | la fila de esa pantalla en `docs/spec/pantallas.md` |
| abre o cierra una unidad | skill `git-flow` + `context/GIT_STATE.md` |
| llega con un prompt de orquestador | **solo** lo que el prompt cite |

**Buscar, no leer:** `decisions/` (un archivo por decisión), `CONTENT_CHECKLIST.md`,
inventarios, `PHASE_LOG/`, `plans/pendientes.md`: `grep` por la palabra o el ID
(`grep -rhi "^# D.*dorado" context/decisions/` — lo decidido no se re-litiga).

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
bun run test:related         # mientras trabajas: solo los tests afectados
bun run test                 # antes del PR: toda la suite (CI la corre siempre)
bun run a11y /ruta …         # axe claro y oscuro (BASE_URL=http://localhost:<puerto>)
bun run shots                # capturas para el PR; vacía .pr-shots/
bun run smoke:ef             # humo de las Edge Functions (lo corre César)
bun run shots:publish        # las sube a la rama pr-shots e imprime el markdown
bun run qa:local -- --port <p>  # QA contra Supabase local (abajo)
```

**Servidor de desarrollo:** lo levanta César. Excepciones: los agentes de QA (`wave-qa`,
`functional-qa`) siempre, y los workers si César lo autoriza para una tanda (cada uno en su
puerto, en segundo plano). Build, typecheck, lint y tests sí se corren sin preguntar.

**QA contra base local:** `qa:local` levanta Supabase en Docker (migraciones + seed), crea las
cuentas de `.env.test.local` (`EMAIL_TEST`, `ADMIN_EMAIL_TEST` + contraseñas) y arranca el
servidor apuntando a lo local. Nunca contra la base real.

**Scripts con Playwright: con `node`, no con `bun`** (en Windows Playwright se cuelga bajo Bun; D071).

**Documentación:** Context7 antes de usar la API de una librería; Next 16: `node_modules/next/dist/docs/`.

---

## Cómo se trabaja aquí

Una unidad a la vez (componente, sección, pantalla, flujo, fix acotado): se revisa en dos minutos. Una unidad = una rama = un PR.

```
[git-flow: abrir]  →  implementar  →  test:related  →  [a11y]  →  [seo si aplica]
   →  build + typecheck + lint + test  →  capturas (si cambió la UI)
   →  actualizar docs/spec si cambió comportamiento
   →  podar context/  →  [git-flow: cerrar → PR]
```

- **Modo `pr`:** en tu rama commiteas y empujas sin pedir permiso; César aprueba en el PR.
  **Nunca** push a `main`, nunca `gh pr merge`, nunca auto-merge.
- **Versión:** nadie toca `version` ni `CHANGELOG.md`. Cambio visible → `.changeset/<desc>.md`
  (`git-flow` §2.1.3). El PR `chore(release): versión` lo abre la Action y lo mergea César.
- Nada destructivo: ni `reset --hard`, ni `push --force`, ni reescribir historia ni borrar ramas.

### Qué va al repo y qué es local

En git: `.kit-version`, `context/PROJECT_CONTEXT.md`, `DESIGN_RULES.md`, `COLORS.md`, `DESIGN_TOKENS.md`,
`TYPOGRAPHY.md`, `decisions/`, `docs/spec/`, `design/`.
Local (gitignored): `context/CURRENT_PHASE.md`, `CONTENT_CHECKLIST.md`, `KIT_FEEDBACK.md`, `PAGE_INVENTORY.md`,
`SECTION_INVENTORY.md`, `COMPONENTS_INVENTORY.md`, `PHASE_LOG/`, `plans/`, `.env*`.
Los slots del pool (`..\melao-wt\wtN`) traen los `.env*` pero **no** `context/` local: se lee
en `C:\Users\Admin\Documents\Work\melao`. Si un subagente no puede escribir ahí, lo devuelve
en su informe y el orquestador lo copia.

### Puertas de calidad

| Skill / agente | Cuándo |
|---|---|
| `a11y` | Siempre que se toque UI, antes de pedir revisión |
| `seo` | Init del repo · cierre de sección con contenido · cierre de página (solo público) |
| `git-flow` | Al abrir y al cerrar cada unidad |
| `orchestrate` | Llega una lista, o una fase se hace en olas (una ola por sesión) |
| `wave-qa` | Lo lanza `orchestrate` con la ola mergeada, antes de cerrarla |
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
- César corrige algo hecho según el kit, lo pide dos veces, o el kit no dice qué hacer → fila
  en `context/KIT_FEEDBACK.md` (o +1 en "Veces"), sin preguntar.

---

## Contexto del proyecto

**Público:** alumnos de salsa y merengue que practican solos en casa · **Acción principal:**
completar una práctica con el coach · **Tono:** elegante, sereno, cálido, preciso ·
**Idioma:** español (es-419), precios en USD

**Particularidades:**
- La pantalla de práctica va siempre en modo escenario (negro), en ambos temas: se lee a 2 m.
- El coach programa clips contra el reloj de audio, nunca con timers de UI (±20 ms).
- César es profesor y admin (único). Rol `teacher` reservado para después.
- La consultoría (chat + videos + corrección) es v2: se diseña ya, se construye luego.
