# Melao · Handoff de diseño

Dirección: **Salón editorial, variante Gala**, con el escenario de práctica en layout **Compás**.
Logo: **C1 · Modulada**.
Lienzo con todas las pantallas (solo el diseño final, sin variantes):
https://claude.ai/artifact/7WuxhQ5GhY3u1p9VgfmjNv (páginas *Marca y sistema · Público · App del
alumno · Estados · Admin · Consultoría*). Cada mesa tiene arriba un selector **Claro / Oscuro**. En
*App del alumno*, las mesas marcadas "interactivo" (curso, video del paso, sesión) son prototipos
con interacción real: hover, transiciones y cuenta en vivo.

Los tokens legibles por máquina están en `design/tokens.json` (W3C Design Tokens). Los nombres
de esta sección son idénticos a los de ese archivo.

---

## 1. Tokens

### 1.1 Color — claro (`color.light`) y oscuro (`color.dark`)

Ratios calculados con la fórmula de WCAG 2.1. La columna *mockup* es el nombre de la variable
CSS que usan las mesas del lienzo (por si se inspecciona el código).

| Token | Light | Dark | Mockup | Uso | Ratios verificados (light · dark) |
|---|---|---|---|---|---|
| `bg` | #FFFFFF | #0E0E0E | `--bg` | fondo de página | — |
| `surface` | #FAF8F4 | #161616 | `--surface` | cards, barra inferior, lateral | — |
| `surface-sunken` | #F3EFE6 | #1E1E1E | `--sunken` | marco de video, skeleton de bloques, chips de metadato | — |
| `text` | #111111 | #F4F2ED | `--text` | texto principal | bg 18.88 · surface 17.80 · sunken 16.46 · tint 15.75 — dark: 17.25 · 16.17 · 14.90 · 13.80 |
| `text-secondary` | #5A5A5A | #B3AEA4 | `--text2` | texto de apoyo | 6.90 · 6.50 · 6.01 · tint 5.75 — dark ≥ 6.99 |
| `text-muted` | #686868 | #948F85 | `--muted` | metadatos, bloqueado, placeholder | 5.57 · 5.25 · 4.86 · tint 4.65 · hover 4.98 — dark ≥ 4.80 (D024) |
| `primary` | #111111 | #D6B25E | `--primary` | CTA, segmentado activo, calificación elegida | — |
| `on-primary` | #FFFFFF | #111111 | `--onPrimary` | texto sobre primary | 18.88 · dark 9.34 |
| `primary-hover` | #2E2E2E | #E2C57A | `--primaryHover` | hover de primary | con on-primary 13.58 · dark 11.24 |
| `gold-500` | #B8913A | #B8913A | `--gold` | **solo decorativo**: filete de 48×1 px, borde del paso siguiente | 2.94 sobre blanco: nunca texto ni gráfico que informe |
| `gold-600` | #A07D2C | #D6B25E | `--gold6` | gráfico informativo: progreso, anillo del nodo actual, indicador activo de nav, barras de dificultad | 3.84 · 3.62 · 3.35 · tint 3.21 — dark ≥ 7.64 |
| `gold-700` | #80621C | #D6B25E | `--goldText` | texto dorado (eyebrow, numeración 01/02/03, "1 2 3") | bg 5.70 · surface 5.38 · sunken 4.97 · tint 4.76 · hover 5.10 — dark ≥ 7.64 (D024) |
| `gold-800` | = gold-700 | = gold-700 | `--goldText8` | alias de gold-700; se mantiene para no romper referencias (D024) | — |
| `gold-tint` | #F3EAD3 | #2A2413 | `--tint` | fondo de seleccionado (fila actual, chip activo, nav lateral activa) | text 15.75 · text-secondary 5.75 — dark 13.80 · 6.99 |
| `divider` | #E7E2D8 | #2A2A2A | `--divider` | separadores (decorativo, no informa) | — |
| `border-input` | #858585 | #6E6E6E | `--border` | bordes de inputs, chips, botón contorno, ticks de tiempo en el analizador | 3.69 · 3.48 · 3.22 · 3.08 — dark ≥ 3.03 |
| `hover` | #F5F2EB | #1C1C1C | `--hover` | fondo hover de filas, botones contorno e ícono | text 16.89 · dark 15.23 |
| `focus-ring` | #111111 | #D6B25E | `--focus` | anillo de foco | 18.88 · dark 9.55 |
| `scrim` | rgba(17,17,17,.4) | rgba(0,0,0,.6) | `--scrim` | velo de sheet y diálogo | — |
| `success` | #1C7644 | #4CC38A | `--success` | éxito + ícono | 5.64 · 5.32 · 4.91 · tint 4.70 · success-bg 4.96 — dark ≥ 6.97 (D024) |
| `warning` | #8A5300 | #E5A93B | `--warning` | aviso + ícono | ≥ 5.28 — dark ≥ 7.40 |
| `error` | #B42318 | #F07167 | `--error` | error + ícono, borde de input inválido | ≥ 5.49 — dark ≥ 5.34 |
| `info` | #1D5FA6 | #6CA8F0 | `--info` | información | ≥ 5.41 — dark ≥ 6.25 |
| `success-bg` | #E8F3EC | #12261B | `--successBg` | banner de éxito | text 16.60 · success 4.70 — dark 14.23 · 7.19 |
| `warning-bg` | #F8EFE0 | #2A2112 | `--warningBg` | banner de aviso | text 16.56 · warning 5.55 — dark 14.17 · 7.60 |
| `error-bg` | #FBECEA | #2B1614 | `--errorBg` | banner de error, hover del botón peligro | text 16.44 · error 5.73 — dark 15.29 · 5.92 |
| `skeleton` | #EFEBE3 | #1E1E1E | `--skel` | bloques de carga | — |

### 1.2 Color — escenario (`color.stage`), idéntico en claro y oscuro

| Token | Valor | Uso | Ratio sobre #0B0B0B |
|---|---|---|---|
| `bg` | #0B0B0B | fondo de práctica | — |
| `count` | #FFFFFF | número grande, tiempo activo | 19.68 |
| `current` | #F4F2ED | paso actual | 17.59 |
| `next` | #D6B25E | paso siguiente | 9.74 |
| `beat-inactive` | #8A8A8A | tiempos inactivos; el punto (·) del número grande en los tiempos 4 y 8 | 5.70 |
| `label` | #8A8A8A | AHORA / SIGUIENTE | 5.70 |
| `secondary` | #B3AEA4 | estilo · BPM, tiempo, "Luego:" | 8.91 |
| `track` | #2A2A2A | riel de progreso (decorativo) | — |
| `progress` | #D6B25E | progreso de la canción | 9.74 |
| `panel` | #161616 | diálogos sobre el escenario | next 8.95 · secondary 8.19 |
| `control-border` | #6E6E6E | borde de reiniciar / voz | 3.86 |
| `rule` | #B8913A | filete 48×1 px entre cuenta y siguiente | decorativo |
| `button` / `on-button` | #FFFFFF / #0B0B0B | botón pausa | 19.68 |
| `button-hover` | #E6E3DC | hover del botón pausa | on-button 15.36 |
| `warning-bg` / `warning` | #2A2112 / #E5A93B | aviso "la pantalla puede apagarse" | current 14.17 |

### 1.3 Tipografía (`typography`)

Fuentes: **Fraunces** (Google Fonts, ejes opsz 9–144, pesos 400/500, cursiva 400) y **Geist**
(400/500/600). Serif solo en titulares: `display-xl`, `display`, `h1`, `h2`, el wordmark y los
nombres de estilo en las opciones de estilo. Nunca en botones, controles, cifras ni cuenta.

| Token | Familia | Tamaño / interlineado | Peso | Tracking | Notas |
|---|---|---|---|---|---|
| `display-xl` | Fraunces | 64 / 68 | 400 | −0.02em | solo landing y 404 en ≥ 1024 |
| `display` | Fraunces | 40 / 44 | 400 | −0.015em | título de pantalla (Curso, Pasos, Practicar…) y hero móvil (40/46) |
| `h1` | Fraunces | 32 / 38 | 400 | −0.01em | títulos de flujo (¿Cómo te fue?, Entrar) |
| `h2` | Fraunces | 24 / 30 | 400 | 0 | secciones; unidad del camino a 22/28 |
| `h3` | Geist | 20 / 26 | 600 | 0 | |
| `h4` | Geist | 16 / 24 | 600 | 0 | nombre de paso en listas |
| `h5` | Geist | 14 / 20 | 600 | 0 | encabezados de tabla admin |
| `h6` | Geist | 12 / 16 | 600 | 0.14em, mayúsculas | = `eyebrow` |
| `body` | Geist | 16 / 24 | 400 | 0 | |
| `small` | Geist | 14 / 20 | 400 | 0 | |
| `caption` | Geist | 12 / 16 | 400 | 0 | mínimo absoluto: 12 px |
| `eyebrow` | Geist | 12 / 16 | 600 | 0.14em, mayúsculas | color `gold-700` |
| `overline` | Geist | 12 / 16 | 400 | 0.14em, mayúsculas | color `text-secondary` |
| `button` / `button-lg` | Geist | 15 / 20 · 16 / 20 | 600 | 0 | |
| `numeric-xl` | Geist | 48 / 52 | 500 | −0.02em | cifras tabulares (Para hoy, 24 figuras) |
| `numeric-lg` | Geist | 32 / 36 | 500 | 0 | cifras tabulares (progreso, BPM admin 36/40) |
| `stage-count` | Geist | 160 / 150 | 500 | −0.04em | tabulares; caja fija de 120 px alineada a la izquierda (Compás); 144/136 en la landing |
| `stage-next` | Geist | 32 / 38 | 500 | 0 | 30/36 si comparte fila |
| `stage-current` | Geist | 22 / 28 | 500 | 0 | |
| `stage-beat` | Geist | 22 / 28 | 400 (activo 600) | 0 | tabulares |
| `stage-label` | Geist | 12 / 16 | 400 | 0.16em, mayúsculas | |

`font-variant-numeric: tabular-nums` en todo número que cambia: cuenta, BPM, tiempos, contadores,
duraciones, porcentajes.

### 1.4 Espaciado (`spacing`), radios, sombras, movimiento, z-index

- **Espaciado**: base 4 px. Tokens `0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,30,32` = n × 4 px (igual
  que la escala de Tailwind). Los valores en uso: 4, 6*, 8, 12, 14*, 16, 20, 24, 28, 32, 40, 48, 64,
  80, 120, 128. *6 y 14 aparecen solo como gap interno de chips y listas; redondéalos a 4/8 y 12/16 si
  usas utilidades estrictas.
- **Radios** (`radius`): `sm` 8 px (inputs, chips, etiquetas sobre video) · `md` 12 px (cards,
  botones, marco de video, banners, filas activas) · `lg` 20 px (sheets y diálogos) · `pill` 999 px
  (segmentados, nodos, switch, pills). El marco del teléfono (28 px) es del lienzo, no se implementa.
- **Sombras** (`shadow`), solo en elevación: `sheet` 0 −12 32 rgba(0,0,0,.18) · `modal` 0 16 40
  rgba(0,0,0,.22) · `drag` 0 8 24 rgba(0,0,0,.18) (fila arrastrada en el constructor). Ninguna sombra
  decorativa en cards.
- **Movimiento** (`motion`): `duration-press` 120 ms · `duration-hover` 160 ms · `duration-move`
  240 ms · `duration-enter` 320 ms · `duration-pulse` 1600 ms. Curvas: `ease-standard`
  cubic-bezier(.2,0,0,1) · `ease-exit` cubic-bezier(.4,0,1,1) · `ease-linear`.
- **z-index** (`zIndex`): base 0 · nav 10 · popover 20 · scrim 40 · sheet 50 · dialog 60 · toast 70.

---

## 2. Componentes

Todos los objetivos táctiles miden ≥ 48 × 48 px. Foco: `outline: 2px solid focus-ring;
outline-offset: 2px` en `:focus-visible`, en todos los interactivos. El foco se ve igual en
claro y oscuro (cambia solo el color del token).

### Button — shadcn `Button`
- **Anatomía**: [ícono 18 px opcional] + etiqueta. Gap 8 px.
- **Variantes**: `primary` (bg primary, texto on-primary) · `outline` (transparente, borde 1 px
  border-input) · `quiet` (enlace: subrayado 1 px `gold-500`, offset 5 px, padding lateral 8 px) ·
  `danger` (borde y texto `error`).
- **Tamaños**: `md` alto 48, padding 0 20, texto `button` · `lg` alto 56, padding 0 24, texto
  `button-lg` · ancho completo con `w-full` en móvil para el CTA principal de cada pantalla.
- **Estados**: reposo · hover (primary → primary-hover; outline → bg hover + borde text; quiet →
  subrayado pasa a text; danger → bg error-bg) · foco (anillo) · activo (`scale(.98)`, 120 ms) ·
  cargando (spinner 20 px, borde 2 px currentColor con un lado transparente, giro 800 ms lineal;
  texto en gerundio "Guardando…"; `aria-busy="true"`; ancho fijo para que no salte) ·
  deshabilitado (bg surface-sunken, texto text-muted, sin borde, cursor not-allowed; si hay razón,
  se muestra en texto con `aria-describedby`).
- **Radio**: 12 px. **Accesibilidad**: `<button>` o `<a>` según navegue; nombre = texto visible.

### IconButton — shadcn `Button` size `icon`
48 × 48, radio pill, ícono 24 (18 en filas densas). Hover bg `hover`. Siempre con `aria-label`.
En escenario: variante `stage-outline` (borde 1 px control-border, 56 × 56) y `stage-primary`
(bg button, 80 × 80 en vertical, 56 en horizontal).

### Input / Textarea — shadcn `Input`, `Textarea`, `Label`
- **Anatomía**: label (small 500, arriba, gap 6) + campo + ayuda o error (13/18).
- **Medidas**: alto 48, padding 0 14, radio 8, borde 1 px border-input, texto 16 px (evita el zoom
  de iOS). Con ícono a la izquierda: padding-left 48, ícono 24 en x = 14.
- **Estados**: reposo · hover (borde text) · foco (borde text + sombra interior 0 0 0 1px text; no
  anillo externo) · relleno · error (borde + sombra 1 px `error`, mensaje con ícono alerta 18 y texto;
  `aria-invalid`, `aria-describedby`) · éxito (borde `success`, mensaje con check) · deshabilitado
  (bg sunken, texto muted, borde divider) · enviando (deshabilitado + spinner 14 en la ayuda).
- **Contraseña**: botón ojo 48 × 48 dentro del campo, a la derecha, `aria-label="Mostrar contraseña"`.
- **Requisitos de contraseña** (registro): lista bajo el campo, cada ítem con ícono check (cumplido,
  color success) o × (pendiente, text-secondary). Nunca solo color.

### SearchField — a medida sobre shadcn `Input`
- **Anatomía**: ícono de lupa 24 (text-secondary) + input sin caja + acción "Borrar" (solo con texto).
- **Medidas**: alto 52, gap 12, **solo línea inferior** de 1 px border-input (3.08–3.69:1); texto 17 px;
  sin radio ni fondo. Placeholder en text-muted.
- **Estados**: reposo · hover (línea en text) · foco (línea de 2 px en text, vía `box-shadow 0 1px 0 0`;
  sin anillo externo) · con texto (aparece "Borrar", botón quiet 14/600 con subrayado gold-500, 48 de
  alto, `aria-label="Borrar búsqueda"`).
- **Importante**: ocultar el botón nativo de limpiar de `type="search"`
  (`::-webkit-search-cancel-button { appearance: none }`). Contenedor con `role="search"` y label
  visualmente oculto.

### Select (dropdown) — shadcn `Select`
Mismo cuerpo que Input con chevron 18 a la derecha. En móvil abre un `Sheet` con opciones de 56 px.

### Chip (filtro / opción) — shadcn `Toggle` (o `ToggleGroup`)
Alto visual 40, zona táctil 48 (pseudo-elemento de 4 px arriba y abajo), padding 0 14, radio 8,
borde 1 px border-input, texto 14/500. **Activo**: bg gold-tint, borde gold-600, texto 600 y check
18 delante. Hover bg `hover`. `aria-pressed` (filtro) o `role="radio"` (elección única). Las filas de
chips hacen `flex-wrap`, nunca scroll horizontal.

### SegmentedControl — shadcn `ToggleGroup type="single"` o `Tabs`
Contenedor pill con borde 1 px border-input y padding 4; segmentos de 40 de alto (48 total). Activo:
bg primary, texto on-primary 600 y check 18 (líder/seguidor, estilo). Transición de color 200 ms.
En el prototipo, el indicador activo se desliza (`translateX`, 240 ms, ease-standard).
`role="radiogroup"` + `role="radio"` + `aria-checked`.

### Switch — shadcn `Switch`
52 × 32, pastilla 24. Apagado: bg sunken, borde border-input, pastilla text-secondary. Encendido: bg
primary, pastilla on-primary, desplazada 20 px (200 ms). Siempre dentro de un `<label>` de ≥ 56 de
alto con el texto a la izquierda.

### Slider — shadcn `Slider`
Riel 4 px divider, relleno gold-600, pulgar 24 con borde 2 px text sobre bg. Valor en texto al lado
de la etiqueta ("3 de 5 · Media"). `aria-valuetext`.

### Card
bg surface, borde 1 px divider, radio 12, padding 20 (16 en filas compactas). Sin sombra. Variante
`selected`: bg gold-tint, borde gold-600.

### Banner (aviso en línea) — shadcn `Alert`
Padding 12 14, radio 12, gap 12, ícono 24 a la izquierda en el color del estado, texto 14/20 en
`text`. Variantes: info (bg sunken), éxito, aviso, error (bg `*-bg`). Error usa `role="alert"`,
los demás `role="status"`. Puede llevar un botón outline a la derecha (admin).

### Pill (estado) — shadcn `Badge`
Alto 24, padding 0 10, radio pill, texto 12/600, borde 1 px. Variantes: neutro (borde divider,
texto text) · ok (success) · aviso (warning) · error (error). Siempre texto; ícono opcional.

### Indicadores propios (sin equivalente en shadcn; componentes a medida)
- **Difficulty**: 5 barras de 4 px de ancho, alturas 6/8/10/12/14 px, gap 2, radio 1. Llenas
  gold-600, vacías divider. Siempre acompañado de texto ("Dificultad 3" / "Media").
- **StepStatus**: círculo 12 px, borde 1.5 px text. *No lo sé* = vacío; *Aprendiendo* = medio
  relleno (izquierda); *Me lo sé* = lleno. Siempre con la etiqueta.
- **PathNode** (camino): 48 × 48. Completada: círculo lleno text con check en bg. Actual: anillo
  2 px gold-600 sobre bg con número 18/600, la fila entera con bg gold-tint, radio 12, y botón
  "Continuar". Disponible: anillo 1.5 px border-input con número. Bloqueada: anillo 1.5 px
  **discontinuo** border-input + candado 18 en text-muted; texto en text-muted. Repaso: cuadrado
  radio 12 con borde 1.5 px gold-600 e ícono de repetir. La segunda línea dice el estado en texto
  ("Lección 3 · Actual").
- **LessonProgress**: 6 segmentos de 3 px de alto, gap 4, completados gold-600, pendientes divider,
  más "2 / 6" en texto. `role="progressbar"`.
- **RatingButtons** (Anki): grilla de **2 × 2 por debajo de 768 px** y de 4 columnas desde 768, gap 8, cada botón min-height 64, padding 8 6, radio 12,
  borde 1 px border-input; etiqueta 14/600 + intervalo en caption ("< 1 día", "1 día", "3 días",
  "8 días"). Seleccionado: bg primary, texto on-primary. Orden fijo: Muy difícil · Difícil · Bien ·
  Fácil. `role="radiogroup"` por paso, dentro de un `<fieldset>` con `<legend>` = nombre del paso.
  Sin rojo ni verde: el significado lo da el texto.

### BottomNav
Alto 80, bg surface, borde superior 1 px divider. 5 destinos iguales: ícono 24 + etiqueta 12/16,
gap 4. Inactivo text-muted; hover text; activo text 600 + filete gold-600 de 24 × 2 px pegado al
borde superior. `<nav aria-label="Principal">`, `aria-current="page"`. Visible < 1024 px.

### SideNav (≥ 1024 px)
Ancho 248, bg surface, borde derecho divider, padding 24 16. Logo 28 + wordmark 22 arriba con 32 de
aire. Ítems 48 de alto, radio 12, padding 0 12, gap 12, texto 15. Activo: bg gold-tint, text 600.
Abajo, card "Tu plan · Básico · activo".

### AdminNav
1440: 232 de ancho con etiquetas. 1024: riel de 72 solo con íconos (cada ítem con `aria-label`; el
nombre no depende de hover). Ítems: Resumen, Estilos, Pasos, Canciones, Analizador de ritmo, Camino,
Usuarios, y abajo "Ver como alumno".

### Sheet — shadcn `Sheet side="bottom"`
Radio 20 arriba, bg bg, sombra `sheet`, asa 36 × 4 divider centrada, título h2 + botón cerrar 48.
Entra `translateY(100%) → 0` en 320 ms ease-standard; sale en 240 ms ease-exit. Scrim a opacidad 1
en 240 ms. Foco atrapado; Esc cierra; el foco vuelve al disparador. Usado en: selector de estilo
(título del curso), selects en móvil.

### Dialog de confirmación — shadcn `AlertDialog`
Card radio 20, padding 24, gap 12, título h2 (h1 en escenario no), texto small/15, botones apilados
de 52: primero la acción segura (primary: "Seguir en la lección" / "Seguir bailando"), después la
destructiva (outline). Entra con opacidad 0 → 1 y `scale(.96) → 1` en 200 ms. En escenario: bg
stage.panel, borde divider oscuro.

### Skeleton — shadcn `Skeleton`
bg skeleton, radio 8 (12 si imita botón), pulso de opacidad 1 → .55 → 1 en 1600 ms. Un skeleton por
sección con la forma real del contenido; nunca un spinner global.

### Stage (escenario) — componente a medida
Ver §3 "Sesión". Piezas: StageHeader, CurrentStep, Count, BeatRow, NextStep, UpcomingList,
ProgressBar, StageControls. No reutilizar el Button de la app: tiene su propio tema fijo.

### Iconos
Trazo 1.75 px, puntas y uniones redondeadas, caja 24 (18 pequeño, 32 grande). Set: **Lucide**
(equivalentes: home, route, metronome→`drum`/`timer` a elegir, list, user, check, lock, repeat, x,
chevron-*, play, pause, search, heart, music, clock, volume-2, rotate-ccw, wifi-off,
triangle-alert, info, plus, pencil, upload, grip-vertical, settings, users, bar-chart, audio-waveform,
mail, eye, log-out, send, video, message-square, sun, moon, smartphone, calendar, file-text,
headphones, arrow-right, shuffle, anchor, hand/pointer, refresh-cw). Play y pausa van rellenos.

---

## 3. Secciones y pantallas (orden de la §6 del brief)

Convenciones: *móvil* = < 768 px, diseñado en 390; *tablet* 768–1023; *escritorio* ≥ 1024,
diseñado en 1440. En la app, el contenido vive en una columna centrada de **máx. 800 px** con
padding 48 en escritorio y 24/20 en móvil. Entre secciones de una pantalla de app: 32 px. Entre
secciones de la landing: 80 px (móvil) / 128 px (escritorio).

### Landing `/` (P-Landing)
- **Header**: alto 72, padding lateral 24 / 120. Logo 28 + wordmark 22. Móvil: solo "Entrar"
  (quiet). Escritorio: enlaces Cómo funciona · Planes · Preguntas centrados + Entrar + Empieza
  (primary md).
- **Hero**: grilla 1 col (móvil) / 2 col gap 64 (escritorio). Izquierda: eyebrow, titular
  display 40/46 (móvil) o display-xl 64/68, CTA primary lg (máx. 320) + quiet "Ver planes" (en
  columna en móvil, en fila en escritorio). Derecha (debajo en móvil): **demo de la cuenta** entre
  filete gold-500 arriba y divider abajo: "Ahora · Guapea", fila `1 2 3 · 5 6 7 ·` en 32 px con el 5
  subrayado gold-600 2 px (offset 10), y a la derecha "Siguiente · Enchufla" en gold-700. La demo empieza
  **en pausa** en el 5 y se reproduce con el botón "Escuchar un ejemplo" (outline, ícono play/pausa,
  `aria-pressed`): avanza a 150 BPM con un clic de metrónomo por tiempo generado con Web Audio (1320 Hz en
  el 1, 880 Hz en el resto, 60 ms; silencio en 4 y 8), los pasos rotan Guapea → Enchufla → Dile que sí →
  Exhibe → Sombrero y el siguiente aparece en el 5 (fade + 6 px, 200 ms). Un subrayado dorado de 20 × 2
  se desliza bajo el tiempo activo (140 ms).
- **Cómo funciona**: overline + lista de 3 (1 col / 3 col, gap 32): filete divider arriba, "01"
  gold-700 14/600, título h2, 1 línea body text-secondary.
- **El coach**: banda de escenario a ancho completo (padding 80 vertical). 1 col / 2 col: texto
  (eyebrow dorado, h2 de 32/38 o 40/44 en blanco, body secondary) + demo en **layout Compás** (máx. 420:
  fila Ahora / "Ejemplo · 150 BPM", cuenta 144/136 alineada a la izquierda con el siguiente al lado tras
  un filete dorado vertical, tira de 8 tiempos con barras) que comparte estado con la del hero, y botón blanco lg "Reproducir el ejemplo" / "Pausar" (mín. 220 de ancho) con la
  nota "Suena un clic en cada tiempo; en la app, la voz del coach".
- **Repaso inteligente**: 1 / 2 col: texto + los 4 RatingButtons (decorativos, `aria-hidden`), "Bien"
  seleccionado.
- **Estilos**: 1 / 3 col, cards; la tercera "Próximamente" con borde discontinuo.
- **Planes** (propuesta B, elegida): grilla de 3 columnas iguales, gap 32 (= 4 + 4 + 4 de 12), que llena
  los 1200 px. Columna 1: eyebrow, h2 40/44, filete, 1 párrafo, nota de USD. Columnas 2 y 3: card
  Básico (botón outline) y Consultoría (borde gold-600, pill "Con profesor", botón primary); padding
  32, precio 56 tabular, alto mínimo 460, 3 filas de 48 con check. Móvil: todo apilado, padding 24,
  precio 40, sin alto mínimo. Precio de Consultoría: US$40 (D029).
- **Preguntas**: 1 / 2 col (título a la izquierda). `details/summary` de 64 px con chevron que gira
  180° abierto. Primera abierta.
- **Footer**: padding 40 / 48, borde superior. Logo 24, enlaces legales (quiet sin subrayado hasta
  hover), © en tabulares. Columna en móvil, fila en escritorio.
- **Contenido**: todo el texto es placeholder realista; precios reales pendientes (§9).

### Planes `/planes` y Checkout `/checkout` (P-Planes)
- Header con logo y correo de la sesión. Columna máx. 960, padding 48 24.
- **Planes**: display + subtítulo; 1 / 2 col. Cada card: nombre h2, precio numeric 40/44 + "al mes",
  tabla de 5 filas de 44 con check (incluido) o guion (no incluido) + texto oculto "Incluido / No
  incluido", CTA lg a ancho completo.
- **Checkout**: quiet "← Planes"; h1; 1 / 2 col gap 24. Izquierda: card Resumen (plan, precio,
  2 condiciones, divider, "Total hoy US$0" en 28/600). Derecha: banner info "El pago está en
  integración…", checkbox de términos (24, obligatorio), CTA "Activar plan".
- **Activado**: columna 560, check en círculo con borde success, display "Tu plan Básico está
  *activo*", CTA abajo.

### Auth `/entrar` `/registro` `/recuperar` `/restablecer` (P-Auth)
Columna máx. 440, padding 32 24, gap 24. h1 + filete. Google (outline lg con "G") arriba en entrar,
separador "o con tu correo". Formularios con gap 16 y CTA lg. Estados diseñados: foco, rechazo
(banner error `role="alert"` + campo en error), registro con validación en vivo y CTA
deshabilitado hasta cumplir, recuperar enviado (banner éxito), restablecer enviando (campos
deshabilitados + botón cargando). Escritorio: igual, centrado, sin panel lateral.

### Bienvenida `/bienvenida` (P-Bienvenida)
Columna máx. 560. Barra de 3 segmentos + "Paso n de 3". Título display. 1) Estilos: cards de 88
tipo checkbox (seleccionada: tint + borde gold-600 + casilla primary con check); Bachata
deshabilitada con borde discontinuo y candado. 2) Rol: **uno para todos los estilos** (D023), dos
cards radio de 96 (Líder / Seguidor con una línea de descripción). 3) Nivel:
2 cards radio de 96. Botonera: "Atrás" (outline, 120) + principal. El CTA queda abajo (flex-grow).

### Inicio `/app` (App-Inicio)
Columna: encabezado (overline con fecha + h1 "Hola, {nombre}" a la izquierda; chip "Salsa casino ▾"
a la derecha que abre el Sheet de estilo). Grilla 1 / 2 col gap 16: card **Para hoy** (eyebrow,
tiempo estimado, numeric-xl + "pasos por repasar", 1 línea de nombres, botón primary) y card
**Continuar** (lección n de 40, nombre h2, LessonProgress, botón). Card **Práctica rápida** en fila
(ícono 48 en sunken, texto, botón outline). **Lo que más te cuesta**: h2 + quiet "Ver progreso",
filete, lista de filas de 64 (nombre, "Última vez: Difícil · hace 2 días", Difficulty, chevron).

### Curso `/app/curso` (App-Curso + prototipo A2-Curso)
- **Selector de estilo = el título**: botón sin borde con eyebrow "Tu curso · cambiar estilo",
  display "Salsa *casino*" y un círculo de 32 con chevron; debajo filete gold-500 de 48 que se
  alarga a 96 en hover (240 ms). Abre Sheet "Elige tu estilo" (filas de 80: nombre en Fraunces 22,
  "Líder · 8 de 40 lecciones", indicador radio 28; próximo estilo deshabilitado). Alternativa en el
  prototipo (Tweaks → pestañas): pestañas de texto con indicador gold-600 que se desliza.
- **Camino**: por unidad, cabecera (overline "Unidad 1", h2 22/28, "3 de 5" a la derecha, borde
  inferior divider) y lista de PathNodes en filas de 64 (72 el repaso). La fila actual sale 12 px
  a los lados (margen negativo) con bg tint. El nodo de repaso aparece **solo si hay pasos
  vencidos**, intercalado antes de la lección actual.
- **Acciones de fila en móvil = íconos de 48**: "Continuar" es un botón circular primary con chevron a
  la derecha (`aria-label="Continuar lección 3: Enchufla"`) y "Repasar" un botón circular outline con el
  ícono de repetir (`aria-label="Repasar: 6 pasos vencen hoy"`). Desde 1024 px vuelven a ser botones
  con texto.
- Escritorio: misma columna de 800; no se convierte en zigzag.

### Lección (App-Leccion + prototipo A2-Leccion), pantalla completa, sin nav
Barra superior en todas las etapas: X 48 (pide confirmación), LessonProgress, "n / 6".
1) Intro: eyebrow, display con el nombre, "2 pasos nuevos · unos 8 minutos", lista numerada de pasos
(64), "Cómo va" en 1 párrafo, CTA Empezar. 2) Video del paso: eyebrow "Lección 3 · Paso 1 de 2", h1,
segmentado de rol (no aparece en pasos libres), marco de video 300 alto (móvil) radio 12 en sunken
con play 72 primary, duración y rol en etiquetas bg sobre el video, "Por tiempos" con filete
gold-500 y filas "1 2 3" en gold-700 + descripción; CTA "Practicar este paso". 3) Mini práctica y
4) práctica final: el escenario (abajo) con la barra de la lección en su versión oscura. 5)
Calificación: h1 "¿Cómo te fue?", un RatingButtons por paso; los no vencidos llevan "No vence hoy"
y "Saltar este paso". 6) Resumen: check en círculo gold-600, eyebrow, display, "Al repaso" con fecha
de regreso por paso, card de siguiente lección, CTA + "Volver al curso". Escritorio: columna de 640.

### Practicar · configurador `/app/practicar` (App-Practicar)
display + filete. 1 / 2 col gap 32: izquierda los grupos (fieldset + legend eyebrow): Estilo
(segmentado), Canción (chips de modo + card de la canción elegida con "Cambiar"), Pasos (chips de
criterio, slider de dificultad máxima, switch "Incluir aprendiendo"). Derecha (abajo en móvil):
card Resumen (numeric-xl "24 figuras de 8 tiempos", 3 datos en tabulares, CTA lg Empezar).

### Practicar · canciones (App-Canciones)
Volver + h1, búsqueda con ícono, chips de dificultad + favoritas, contador, lista con filas: título
(máx. 2 líneas, clamp), artista (1 línea), "184 BPM · 4:05 · ▮▮▯ Media", corazón 48 (`aria-pressed`,
relleno gold-600 cuando es favorita).

### Sesión — escenario `/app/practicar/sesion` (A2-Sesion, E-Sesion) · layout **Compás**
Fondo stage.bg a pantalla completa, en ambos temas. **Vertical 390**, padding 12 20 28:
1. Cabecera: X 48 a la izquierda (confirmación) · "Salsa casino · 184 BPM".
2. Chips de estado (En pausa · Cuenta en silencio · aviso de pantalla), alto reservado 28–32 para
   que nada salte.
3. Fila **Ahora**: stage-label + paso actual (stage-current) a la izquierda, "frase 2 de 2" (small,
   secondary, tabulares) a la derecha; borde inferior 1 px #2A2A2A, padding-bottom 12.
4. Fila de **cuenta + siguiente** (margin-top 16, alineada abajo, gap 16): cuenta 160/150, −0.04em,
   caja fija de 120 px de ancho **alineada a la izquierda** (en 4 y 8 muestra "·" en beat-inactive).
   A su derecha, columna con **filete vertical 1 px `rule`** y padding-left 16: "SIGUIENTE" → "SIGUIENTE
   · EN EL 1" desde el anuncio (tiempo 5 de la última frase), nombre del paso siguiente 30/36 en
   `next`, filete dorado 2 px que crece de 0 a 48 en 240 ms, y "entra en el 1". Si el paso se repite:
   "SE REPITE" + "solo cuenta, sin nombrarlo", sin filete. Nombres largos parten línea (hasta 3).
5. **Tira de tiempos** (margin-top 28): grilla de 8 columnas, gap 6; cada celda = número 22/28 +
   barra debajo (4 px #2A2A2A; los puntos 8 px de ancho). Activa: número blanco 600 y barra blanca de
   8 px de alto. Forma + color, nunca solo color.
6. "DESPUÉS" + "A → B → C" (body, secondary).
7. Progreso (4 px, radio 2) + tiempos 1:42 / 4:05.
8. Controles (gap 12): Reiniciar 56 × 56 radio 12 · **Pausa** botón blanco ancho completo de 56 con
   ícono + texto · Voz 56 × 56 (toggle `aria-pressed`).
**Horizontal 844 × 390** (padding 12 24 16): cabecera (X + estilo · BPM a la izquierda; "Ahora ·
Guapea · frase 2 de 2" a la derecha) · fila central: cuenta 160 (120 px) + columna siguiente (340 px,
nombre 32/38) + controles 56 × 56 radio 12 a la derecha · tira de tiempos 20/26 · progreso con tiempos
en la misma fila.
**Mini práctica y práctica final** de la lección usan el mismo layout con la barra de etapas arriba.
**Estados**: preparando audio (spinner 40 dorado + porcentaje), audio bloqueado (botón circular de
160 "Toca para empezar"), pausada (chip + botón muestra play y "Reanudar"), pantalla no puede
mantenerse encendida (chip de aviso), salir a mitad (AlertDialog), 32 caracteres a 220 BPM (el
nombre parte línea; la cuenta no se mueve).

### Práctica · resultado (App-Resultado)
Columna 640. X arriba a la derecha. Eyebrow, h1 con la canción, 3 datos en fila con bordes
superior e inferior. Calificación por paso (vencidos obligatorios, "y 5 más que no vencen hoy ·
Mostrarlos"). Botonera 2 col: "Otra vez" (outline) · "Guardar" (primary, deshabilitado con motivo
visible si falta un obligatorio).

### Pasos · catálogo (App-Pasos) y detalle (App-Paso)
Catálogo: display + contador, filete, búsqueda, chips Categoría y Estado (con StepStatus), grupos
por categoría con cabecera overline + contador, filas: nombre h4, línea de metadatos que hace wrap
(StepStatus, Difficulty + texto, "Repaso en 9 días") y corazón 48. Soporta 1 y 80 pasos (grupos
colapsan solo por scroll; sin paginación).
Detalle: barra con volver y favorito; eyebrow categoría, display nombre, dificultad y duración. 1 / 2
col: izquierda segmentado de rol + video 280 + nota de pasos libres; derecha Tu estado (3 chips de
48 en grilla), Por tiempos, Posición (dos cards con flecha), Relacionados (chips que enlazan),
Historial (filas de 44 + próximo repaso).

### Progreso (App-Progreso)
display, grilla 1 / 2 de cards (lecciones con barra; pasos por estado con 3 cifras). **Próximos
repasos**: 7 barras (máx. 40 de ancho, radio 4 4 0 0) con el número encima y el día debajo; días
sin repasos a 2 px en divider; "Hoy" en 600; `role="img"` con aria-label que enumera. Lo que más te
cuesta (con "Practicar estos"). Sesiones recientes (filas de 64).

### Perfil (App-Perfil)
display. Cuenta: avatar 56 con iniciales, gap 12, nombre que hace wrap (probado con 40 caracteres),
correo con elipsis y **botón de ícono 48 con lápiz** y borde border-input (`aria-label="Editar nombre y
correo"`), sin texto "Editar" para que no se apriete en 390. **Tu baile** (D023): Rol (segmentado
Líder/Seguidor a ancho completo + ayuda "Ves los videos de tu rol en todos los estilos…") y "Estilo con
el que abre la app" (segmentado mientras haya 2 estilos; con 3 o más pasa a una fila que abre el Sheet de
estilos). Coach (slider de volumen, switch de cuenta hablada, card de latencia con Calibrar). Tema
(segmentado Sistema/Claro/Oscuro + nota de que la práctica siempre va en negro). Suscripción (card con
plan, pill Activo, renovación, CTA a Consultoría). Cerrar sesión (outline, ancho completo).

### Calibrar audífonos (App-Calibracion), pantalla completa desde Perfil
Columna de 390 con padding 12 24 24; arriba cerrar 48 y "n de 3".
1. **Antes de empezar**: eyebrow, display, filete, 1 párrafo; lista de 3 filas de 64 (audífonos
   detectados con estado "Listo" en success + ícono, subir volumen, tocar por oído); "Tarda unos 20
   segundos"; CTA Empezar.
2. **Escucha y toca**: h1 + instrucción; botón circular de 248 (bg surface, borde border-input, ícono de
   toque 32 + "Toca aquí"; hover borde text, activo `scale(.97)`). **Sin ninguna señal visual del clic**:
   la medición es a oído. Debajo, 12 puntos de 10 px (borde gold-600, llenos al tocar; `role="progressbar"`)
   y "Toque n de 12 · los 4 primeros son de práctica"; quiet "Empezar de nuevo". El motor pone 12 clics
   a 100 BPM en el reloj de audio y compara cada toque con su clic.
3. **Resultado**: "+180 ms" en 64/68 tabulares, consistencia con ícono ("Toques parejos · desvío 14 ms"),
   gráfico de 56 de alto con la línea del clic, los 8 toques medidos (puntos gold-600) y la línea del
   promedio (2 px text), con aria-label que lo resume. Acciones: "Probar con la cuenta" (outline lg),
   "Guardar ajuste" (primary lg), "Repetir" y "Ajuste fino" (quiet).
4. **Ajuste fino**: valor grande con −/+ de 56 (pasos de 10 ms) y slider de −300 a +300 con marca en 0;
   card de prueba con play; CTA "Guardar +190 ms".
5. **Toques irregulares** (desvío > 40 ms): banner de aviso con el desvío, 3 consejos, Repetir / Ajustar a
   mano.
6. **Sin audífonos**: con el altavoz no hace falta; lista de ajustes guardados por dispositivo; Listo /
   Calibrar igual.

### Admin (1440 y 1024)
Contenido sin columna máxima (ancho completo menos nav), padding 32 40 / 24 28. Encabezado: overline
+ h1 a la izquierda, acciones a la derecha.
- **Resumen**: 4 stats (4 col / 2 col), luego Avisos y Pendientes en 2 col / 1 col.
- **Analizador de ritmo** (alta fidelidad): vista general (120 barras, zonas fuera de baile
  sombreadas, recuadro de la zona ampliada, anclas en gold-600) · forma de onda ampliada de 200 alto
  con: ticks de tiempo (1 px border-input), "1" de cada frase (3 px gold-600 + etiqueta "1 · f34" en
  tint), ancla discontinua con etiqueta "1:42.3 · 188 BPM", cabezal (2 px error), regla de tiempo
  abajo; leyenda textual de cada marca; zoom ±; "Reproducir con la cuenta" + cuenta en vivo
  subrayada · Tempo y el "1" (BPM detectado, confianza, toques, botón grande de 72 "Toca al ritmo…"
  con barra espaciadora) · Anclas (tabla editable) + inicio/fin de baile + frases que caben. A
  1024 los dos paneles inferiores se apilan.
- **Constructor del camino** (alta fidelidad): 2 col (400 + resto) / 1 col. Árbol de unidades con
  asa de arrastre 40 en cada fila (y en cada unidad), número, nombre, pill de estado. Durante el
  arrastre: fila elevada (sombra `drag`, −10 px, −0.6°) y hueco discontinuo gold-600 donde caerá.
  Editor: título, pasos ordenables con entrada → salida, validación de que la secuencia se puede
  bailar (texto con check), mini práctica por paso (canción + frases con stepper), canción final y
  fragmento.
- **Pasos** y **Canciones**: patrón **lista + editor** (400 + resto / 1 col). Lista: búsqueda,
  chips de filtro con contador, filas de 56 con pill; la seleccionada en tint con `aria-current`.
  Editor en card: grilla de 2 col de campos, secciones separadas por divider, botonera abajo a la
  derecha con el motivo de bloqueo en texto rojo con ícono antes del botón deshabilitado.
- **Estilo**: columna 880; cards por tema (cuenta hablada como 8 chips toggle, anticipación con 2
  selects + switch de "si se repite", bandas de BPM en tabla, posiciones como chips con contador).
- **Usuarios**: solo lectura, búsqueda + chips, tabla con roles ARIA (columna Alta se oculta a 1024),
  paginación.

### Sistema (E-Sistema)
404, error inesperado (con código de referencia en tabulares), sin conexión. Columna 640, eyebrow +
display (display-xl en escritorio) + filete + texto + acciones.

### Estados (E-Estados)
Primer día, sin repasos hoy, cargando (skeleton por sección con la forma real), sin conexión (banner
de aviso arriba; lo no disponible dice por qué), sin suscripción (card con candado y "Ver planes";
lecciones bloqueadas con "Requiere plan"), búsqueda sin resultados, sin favoritas, curso sin
publicar, video que no carga (en el marco, con Reintentar).

### Consultoría (fase 2, C-Consultoria)
Chat (burbujas: profesor en surface con borde, alumno en tint; radio 12 con una esquina de 4; video
como card con estado "Corregido · 3 notas"; composer con botón de video, textarea, enviar primary).
Envío corregido (video, marcas numeradas sobre la barra, lista de correcciones con marca de tiempo,
nota final). Bandeja del profesor a 1440: 3 columnas 320 · video · 360 (notas por tiempo, "Añadir en
0:21", nota final, Enviar corrección).

---

## 4. Grid y layout global

| Breakpoint | Contexto | Contenedor | Columnas / gutter | Padding lateral | Navegación |
|---|---|---|---|---|---|
| 360–767 | app | 100 % | 1 col; grillas internas 1 col | 20 (app) · 24 (landing, flujos) | barra inferior 80 |
| 768–1023 | app | columna máx. 640 centrada | 1 col; grillas de cards 2 col gap 16 | 32 | barra inferior 80 |
| ≥ 1024 | app | lateral 248 + columna máx. 800 centrada en el resto | 2 col gap 16–32 donde se indica | 48 | lateral |
| 360–767 | landing | 100 % | 1 col | 24 | header 72 |
| ≥ 1024 | landing | 100 %, contenido máx. 1200 | 2–3 col, gap 32–64 | 120 (1440) · 64 (1024) | header 72 |
| ≥ 1024 | admin | nav 232 (≥ 1280) o riel 72 (1024–1279) + ancho completo | lista + editor 400 / resto | 40 · 28 | lateral |
| 1920 | todo | igual que 1440: la app no se estira; la landing centra 1200 | | | |

Ritmo vertical: 32 entre secciones de app, 24 entre bloques de un formulario, 16 entre campos,
80/128 entre secciones de landing. Sin scroll horizontal a 320: todas las filas de chips y
metadatos hacen wrap; nombres largos parten línea o hacen elipsis donde se indica.

---

## 5. Assets

| Asset | Formato | Tamaños | Fuente |
|---|---|---|---|
| Logo C1 (baldosa) | SVG | viewBox 48, versión normal y **reforzada para 16 px** (astas 7, diagonales 5,5, radio 10) | mesa *Marca · logo C1* |
| Lockup horizontal / vertical | SVG | marca + "Melao" Fraunces 500 −1 % | mesa *Marca* (el wordmark se convierte a contornos al exportar) |
| Favicon | ICO + SVG | 16, 32, 48 | versión reforzada |
| Íconos de app | PNG | iOS 1024 (sin transparencia, la máscara la pone el sistema); Android adaptativo 108 dp (primer plano: la M blanca en zona segura de 66 dp; fondo #111111) | mesa *Marca* |
| Open Graph | PNG 1200 × 630 | fondo #0B0B0B, cuenta y "Enchufla" en dorado, wordmark | por diseñar con el copy real |
| Íconos | SVG vía `lucide-react` | 24 / 18 / 32, trazo 1.75 | Lucide |
| Fuentes | WOFF2 vía `next/font/google` | Fraunces (opsz, 400, 500, 400 italic), Geist (400, 500, 600) | Google Fonts |
| Pósteres de video | JPG/WebP 16:9 y 4:5, 1280 px lado mayor | neutros, fotograma del paso | pendiente (César) |
| Clips de voz del coach | MP3/OGG por paso, ≤ 0,7 s | deben caber en los tiempos 5–6 | pendiente |
| Ilustraciones | — | no hay: la marca es tipográfica | — |

---

## 6. Movimiento

| Qué | Duración | Curva | Con `prefers-reduced-motion` |
|---|---|---|---|
| Hover de color/fondo/borde | 160 ms | ease-standard | sin transición (cambio inmediato) |
| Botón presionado `scale(.98)` | 120 ms | ease-standard | sin escala |
| Segmentado / pestañas: indicador que se desliza | 240 ms | ease-standard | salta |
| Filete del selector de estilo 48 → 96 px en hover | 240 ms | ease-standard | sin animación |
| Sheet entra / sale | 320 / 240 ms | standard / exit | aparece sin desplazamiento |
| Scrim | 240 ms | ease-standard | inmediato |
| Diálogo `scale(.96) → 1` + opacidad | 200 ms | ease-standard | solo aparece |
| Anuncio del siguiente (hero): opacidad + 6 px | 200 ms | ease-standard | visible fijo; demo detenida en el 5 |
| Filete de anuncio en escenario 0 → 48 px | 240 ms | ease-standard | aparece completo |
| Barra de progreso del video / canción | 300 ms–1 s | linear | salta |
| Skeleton pulso | 1600 ms infinito | ease-in-out | sin pulso |
| Spinner | 800 ms infinito | linear | sin giro (queda el texto "Guardando…") |
| **Cuenta del escenario** | cambio instantáneo de número, **sin** transición, sin flash, sin pulso de fondo | — | igual |

La cuenta la programa el reloj de audio (±20 ms), nunca un timer de UI; la UI solo pinta el estado.

---

## 7. Orden de implementación

1. **Tokens** → `design/tokens.json` a variables CSS (`:root` + `.dark`) y `@theme` de Tailwind v4;
   fuentes con `next/font`. (sin dependencias)
2. **Primitivos shadcn** con los tokens: Button, IconButton, Input, Label, Textarea, Select, Switch,
   Slider, Toggle/ToggleGroup, Tabs, Badge, Alert, Card, Skeleton, Sheet, AlertDialog. (1)
3. **Indicadores propios**: Difficulty, StepStatus, LessonProgress, PathNode, RatingButtons,
   BeatRow. (1, 2)
4. **Layout**: AppShell (BottomNav < 1024 / SideNav ≥ 1024, columna 800), FullscreenShell (lección
   y sesión), PublicShell (header/footer), AdminShell (nav 232 / riel 72). (2)
5. **Escenario** (Stage + estados + horizontal), contra un motor falso que emite tiempos; se conecta
   al motor real de `docs/spec/motor-de-ritmo.md` después. (1, 3)
6. **Pantallas de alumno**: Inicio → Curso (+ Sheet de estilo) → Lección (6 etapas) → Practicar →
   Canciones → Sesión → Resultado → Pasos → Detalle → Progreso → Perfil. (3, 4, 5)
7. **Estados transversales**: vacío, carga, error, sin conexión, sin suscripción, por pantalla. (6)
8. **Público**: Landing → Planes/Checkout → Auth → Bienvenida. (2, 4)
9. **Admin**: patrón lista + editor (Pasos, Canciones) → Estilo → Constructor del camino →
   Analizador de ritmo → Resumen → Usuarios. (2, 4)
10. **Sistema**: 404, error, sin conexión. **Consultoría** queda para fase 2.

---

## 8. Decisiones y trampas

- **Dorado en tres tonos, no uno.** gold-500 decora, gold-600 informa (gráficos ≥ 3:1), gold-700 es
  texto y pasa AA en las cinco superficies (D024). Es fácil
  "unificar" al 500 y romper AA.
- **El escenario no usa los tokens del tema.** Tiene su propia paleta fija (`color.stage`) y sus
  propios botones. No lo conviertas en `dark:` del tema: en tema claro sigue negro.
- **En 4 y 8 el número grande es un punto** (·) en gris, igual que la fila. La pantalla nunca queda vacía y la forma cambia sin destellos. Evita
  que la pantalla quede vacía o "salte" dos veces por compás.
- **El nodo actual y su fila salen 12 px del margen** (margen negativo). Es intencional: marca el
  lugar sin usar un color más.
- **El título del curso es el selector de estilo.** No lo conviertas en un `<select>` con borde:
  fue la corrección explícita de César ("más elegante"). La alternativa aprobable es la de pestañas.
- **Chips de 40 con zona táctil de 48**: la zona extra es un pseudo-elemento; no subas el chip a 48
  visibles.
- **Serif solo en titulares.** Nombres de pasos en listas, cifras, botones y la cuenta van en Geist.
  Excepción deliberada: nombres de estilo en las cards de elección (son titulares de la opción).
- **RatingButtons no usan color semántico** (nada de rojo/verde): orden fijo y texto.
- **No compartas componente entre** la fila del camino (PathNode) y la fila del catálogo: se
  parecen pero tienen estados distintos. Tampoco entre el Button de la app y los botones del
  escenario.
- **Demo del hero ≠ escenario**: la demo del hero va sobre blanco con cifras de 32 y es
  decorativa (`role="img"`). No reutilices el componente Stage ahí.
- **Tabla de usuarios con roles ARIA y no `<table>`** en el mockup por limitaciones de la
  herramienta; en código usa `<table>` real.
- **Cards sin sombra.** La jerarquía es surface + borde divider. La sombra solo existe en sheet,
  diálogo y arrastre.
- **Deshabilitado siempre explica por qué** en texto al lado (checkout, resultado, publicar en
  admin).

---

## 9. Preguntas abiertas

1. ~~**Precio de Consultoría**~~ — resuelta 2026-09-26: Consultoría US$40/mes, Básico US$20/mes (D029).
2. **Nombres y copy definitivos** (titulares, FAQ, descripciones por tiempo). Todo es placeholder;
   las longitudes ya están probadas.
3. ~~**¿Dónde vive Progreso en la navegación?**~~ — resuelta 2026-09-26 con la recomendación (D028). No está entre los 5 destinos. *Recomendación*: acceso
   desde Inicio ("Ver progreso") y desde Perfil; en escritorio, como ítem 6 del lateral si César lo
   aprueba.
4. **Imagen de Open Graph y pósteres de video**: pendientes de material real.
5. **Consultoría**: SLA de respuesta ("menos de 48 h" es placeholder) y límite de videos por mes.

Resueltas en la ronda 4: planes B · escenario en layout Compás · acciones del camino como íconos en móvil.
Resueltas en la ronda 3: 4 y 8 como punto · selector de estilo = título que abre hoja (en Practicar,
segmentado mientras haya 2 estilos) · rol único (D023) · flujo de calibración · contraste (D024).
