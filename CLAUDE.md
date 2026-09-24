@AGENTS.md

# {{NOMBRE_DEL_PROYECTO}}

> Copia este archivo a la raíz del proyecto como `CLAUDE.md` y llena los `{{...}}`.
> Se carga solo en cada sesión: por eso es corto (**≤ 8 KB**) y funciona como **mapa**, no
> como manual. Lo largo vive en `context/` y se lee solo cuando la tarea lo pide.
> Borra este recuadro al copiarlo.

{{DESCRIPCIÓN_EN_UNA_LÍNEA}}

**Tipo:** {{landing | e-commerce | corporativo | dashboard | blog | app}} · **Cliente:** {{...}}
**Track de fases:** {{Landing | Sitio | Producto}} · **Modo git:** {{pr | local}} (ver `context/GIT_STATE.md`)

---

## Qué leer — por niveles, no todo

**Siempre:** este archivo + `context/CURRENT_PHASE.md` (una pantalla: qué está abierto y qué bloquea).

**Según la tarea** — solo la fila que aplica:

| Si la tarea… | Lee además |
|---|---|
| toca UI (componente, sección, página, estilos) | `context/DESIGN_RULES.md`, y `COLORS.md` / `DESIGN_TOKENS.md` / `TYPOGRAPHY.md` solo si toca color, espaciado o tipo |
| implementa algo del diseño | la parte de `design/HANDOFF.md` de esa pieza (no el handoff entero) |
| toca datos, auth, pagos o API | `context/PROJECT_CONTEXT.md` › Stack y servicios |
| abre o cierra una unidad | skill `git-flow` + `context/GIT_STATE.md` |
| llega con un prompt de orquestador | **solo** lo que el prompt cite: ya trae rutas, líneas y decisiones |

**Buscar, no leer:** `DECISIONS_INDEX.md`, `CONTENT_CHECKLIST.md`, inventarios, `PHASE_LOG/`,
`decisions/`. Se hace `grep` por la palabra o el ID y se abre solo lo que sale:

```bash
grep -n "modal\|ranking" context/DECISIONS_INDEX.md   # ¿ya se decidió algo sobre esto? No lo re-litigues
grep -n "Button" context/COMPONENTS_INVENTORY.md       # ¿existe ya?
```

Detalle y presupuestos de tamaño: `reference/TOKEN-ECONOMY.md` del kit (resumen abajo).

---

## Stack

- {{Next.js (App Router) | Astro | Vite + React}} + **TypeScript** estricto
- **Librería de componentes:** {{shadcn/ui | Hero UI | MUI}} · **Estilos:** {{Tailwind | sx de MUI}} — uno solo
- **bun** para todo — nunca npm, yarn ni pnpm
- {{Base de datos / ORM}} · {{Auth}} · {{Pagos}}

```bash
bun install
bun run build
bunx tsc --noEmit            # o el typecheck del framework
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

**Documentación:** Context7 antes de usar la API de cualquier librería.

---

## Cómo se trabaja aquí

Una unidad a la vez (un componente, una sección, una pantalla, un flujo, un fix acotado):
algo que se revisa en dos minutos. Una unidad = una rama = {{un PR | un merge local}}.

```
[git-flow: abrir]  →  implementar  →  test:related  →  [a11y]  →  [seo si aplica]
   →  build + typecheck + lint + test  →  capturas (si cambió la UI)
   →  podar context/  →  [git-flow: cerrar → PR (o pausa + merge local)]
```

- **Modo `pr`:** en tu rama puedes commitear y empujar sin pedir permiso — la aprobación de
  César es la revisión del PR. **Nunca** push a `main`, nunca `gh pr merge`, nunca auto-merge.
- **Modo `local`:** nada se commitea sin aprobación explícita de César (pausa de `git-flow`).
- Nada destructivo: ni `reset --hard`, ni `push --force`, ni reescribir historia, ni borrar ramas.

### Qué va al repo y qué es local

En git: {{los documentos fijos de context/: PROJECT_CONTEXT, DESIGN_RULES, COLORS, DESIGN_TOKENS,
TYPOGRAPHY, DECISIONS_INDEX, decisions/}}.
Local (gitignored): {{CURRENT_PHASE, CONTENT_CHECKLIST, inventarios, PHASE_LOG/, plans/, .env}}.
Un worktree nuevo **no** los tiene: se leen en la carpeta principal
(`{{RUTA_ABSOLUTA_DEL_REPO}}`). Un subagente en worktree puede no tener permiso de escritura
ahí: entonces los devuelve en su informe y el orquestador los copia.

### Puertas de calidad

| Skill / agente | Cuándo |
|---|---|
| `a11y` | Siempre que se toque UI, antes de pedir revisión |
| `seo` | Init del repo · cierre de sección con contenido · cierre de página |
| `git-flow` | Al abrir y al cerrar cada unidad |
| `orchestrate` | Llega una lista de varias cosas a la vez |
| `design-qa` / `functional-qa` | Al cerrar una página / un flujo completo |

---

## Reglas no negociables

- **Cero valores mágicos.** Todo color, espaciado, radio y tamaño sale de los tokens.
- **Cero secretos en el código.** Variables de entorno, `.env.example` sin valores reales.
- **Cero contenido inventado.** Placeholder marcado + fila en `context/CONTENT_CHECKLIST.md`.
- **Cero lorem ipsum.** Placeholder realista, en {{español}}, con la longitud del texto final.
- **WCAG 2.1 AA** mínimo: 4.5:1 texto, foco visible, ningún estado solo por color, sin
  scroll horizontal a 320 px.
- **La librería del proyecto antes que reimplementar** un primitivo.
- {{Reglas propias del proyecto: dónde vive la persistencia, qué capa toca el estado, etc.}}

## Cuándo parar y preguntar

- Falta un dato del handoff → se pregunta, no se estima del mockup.
- Decisión visual nueva → 3 opciones con ventaja y desventaja real, y se espera.
  (Un worker en segundo plano no puede esperar: elige lo conservador y lo explica en el PR.)
- Algo rompe una regla de accesibilidad → gana la regla, se escala.
- Problema en código ya cerrado → se reporta, no se arregla dentro de la unidad actual.
- Archivo sin uso → se señala, **no se borra**.

---

## Contexto del proyecto

**Público:** {{...}} · **Acción principal:** {{...}} · **Tono:** {{...}} · **Idioma:** {{...}}

**Particularidades:**
- {{ej. "el service worker cachea agresivo: desregistrarlo y limpiar cachés tras cada cambio en dev"}}
