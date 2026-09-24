# API — backend (Supabase)

> **Esqueleto del arranque.** Tablas y funciones previstas; los tipos exactos, políticas RLS
> y payloads definitivos se escriben en la fase 07a junto con las migraciones. Todo cliente
> (web, Android, iOS) usa este mismo contrato.

## Acceso

- Auth: Supabase Auth (email + contraseña, Google; Apple antes de iOS).
- **RLS en todas las tablas.** Contenido publicado: lectura para alumnos con suscripción
  activa y para `admin`. Datos del alumno: solo su dueño. Escritura de contenido: `admin`.
- `subscriptions`: el cliente **no** puede escribirla; solo la Edge Function
  `activate-subscription` (y, en el futuro, los webhooks de la pasarela).
- Storage privado con URLs firmadas de corta duración: `step-videos`, `songs`,
  `voice-clips` (v2: `coaching-uploads`).

## Tablas previstas

| Grupo | Tablas |
|---|---|
| Usuarios | `profiles` (app_role `student\|teacher\|admin`, tema, ajustes del coach) · `user_style_prefs` (rol por estilo) |
| Estilos y pasos | `dance_styles` · `positions` · `steps` · `step_prerequisites` · `step_videos` (rol `leader\|follower\|both`) |
| Canciones | `songs` (audio, duración, bpm, `beat_grid`, `dance_start`/`dance_end`, dificultad, licencia) · `song_styles` |
| Curso | `courses` · `course_units` · `lessons` · `lesson_steps` · `lesson_progress` |
| Repaso y práctica | `user_steps` (estado, favorito, campos FSRS) · `step_reviews` · `user_song_favorites` · `practice_sessions` |
| Suscripción | `plans` · `subscriptions` (provider `placeholder\|stripe\|google_play\|app_store`) |
| v2 | `coaching_threads` · `coaching_messages` · `coaching_submissions` · `coaching_annotations` |

## Edge Functions

### `plan-session`
Entrada: `{ styleId, songId, mode: "lesson"|"free", lessonId?, stepFilters?, seed? }`
Salida: `{ sessionId, phrasesAvailable, plan: [{ stepId, startPhrase, phrases }], unplaced: [stepId], timeline: [evento] }`
Reglas: `motor-de-ritmo.md` y `combinaciones.md`. Registra la sesión en `practice_sessions`.

### `review-steps`
Entrada: `{ sessionId?, context: "lesson"|"practice"|"catalog", reviews: [{ stepId, role, rating: 1-4, reviewedAt }] }`
Salida: `{ cards: [{ stepId, role, dueAt, state }] }`
Reglas: `srs.md`. Idempotente por `(sessionId, stepId, role)`.

### `activate-subscription`
Entrada: `{ planSlug }`
Salida: `{ subscription: { plan, status, currentPeriodEnd } }`
Reglas: v1 = proveedor `placeholder`, monto $0. El precio mostrado sale de `plans`, nunca del
cliente.

## Lecturas directas (SDK + RLS)

Catálogo de pasos, canciones, curso y progreso se leen con el SDK de Supabase respetando RLS;
las vistas de popularidad y "más difíciles" se exponen como vistas o funciones SQL (07a).
