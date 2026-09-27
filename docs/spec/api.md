# API — backend (Supabase)

> **Esqueleto del arranque.** Tablas y funciones previstas; los tipos exactos, políticas RLS
> y payloads definitivos se escriben en la fase 07a junto con las migraciones. Todo cliente
> (web, Android, iOS) usa este mismo contrato.

## Acceso

- Auth: Supabase Auth (email + contraseña, Google; Apple antes de iOS).
- **RLS en todas las tablas.** Contenido publicado: la vitrina (nombres, estructura del curso,
  catálogo) para cualquier alumno con cuenta; los medios, la práctica y el repaso solo con
  suscripción activa (D036); todo para `admin`. Datos del alumno: solo su dueño. Escritura
  de contenido: `admin`.
- `subscriptions`: el cliente **no** puede escribirla; solo la Edge Function
  `activate-subscription` (y, en el futuro, los webhooks de la pasarela).
- Storage privado con URLs firmadas de corta duración: `step-videos`, `songs`,
  `voice-clips` (v2: `coaching-uploads`).

## Tablas previstas

| Grupo | Tablas |
|---|---|
| Usuarios | `profiles` (app_role `student\|teacher\|admin`, rol de baile `leader\|follower`, estilo por defecto, tema, ajustes del coach) · `audio_latency` (latencia medida por dispositivo de audio) |
| Estilos y pasos | `dance_styles` · `positions` · `steps` · `step_prerequisites` · `step_videos` (rol `leader\|follower\|both`) |
| Canciones | `songs` (audio, duración, bpm, `beat_grid`, `dance_start`/`dance_end`, dificultad, licencia) · `song_styles` |
| Curso | `courses` · `course_units` · `lessons` · `lesson_steps` · `lesson_progress` |
| Repaso y práctica | `user_steps` (estado, favorito, campos FSRS) · `step_reviews` · `user_song_favorites` · `practice_sessions` |
| Suscripción | `plans` · `subscriptions` (provider `placeholder\|stripe\|google_play\|app_store`) |
| v2 | `coaching_threads` · `coaching_messages` · `coaching_submissions` · `coaching_annotations` |

## Esquema implementado

Migraciones en `supabase/migrations/` (probadas con PGlite, D037). Precios en centavos de USD.
En las tablas de acceso: **L** = leer, **C** = crear, **E** = editar, **B** = borrar.

### Usuarios y suscripción (`20260926200000_usuarios_y_suscripcion.sql`)

| Tabla | Campos | Anónimo | Alumno | Admin |
|---|---|---|---|---|
| `profiles` | `id` (= usuario de Auth) · `display_name` · `app_role` (`student\|teacher\|admin`) · `dance_role` (`leader\|follower`, null hasta el onboarding) · `theme` (`system\|light\|dark`) · `coach_voice_volume` (0–100) · `coach_spoken_count` · `onboarded_at` | — | L y E del suyo (todo menos `app_role`) | L y E de todos; `app_role` solo con `set_app_role` |
| `audio_latency` | `user_id` · `platform` (`web\|android\|ios`) · `device_key` · `device_label` · `offset_ms` (−200…1000) · `sd_ms` · `taps` · `measured_at`; único por (usuario, plataforma, dispositivo) | — | L C E B de los suyos | igual que alumno |
| `plans` | `slug` · `name` · `price_cents` · `currency` · `billing_interval` · `includes_coaching` · `is_active` · `sort_order` | L de activos | L de activos | L de todos, C, E |
| `subscriptions` | `user_id` · `plan_id` · `status` (`active\|past_due\|canceled\|expired`) · `provider` (`placeholder\|stripe\|google_play\|app_store`) · `provider_ref` · `current_period_start/end` · `canceled_at`; una vigente (`active`/`past_due`) por alumno | — | L de la suya | L de todas |

Nadie escribe `subscriptions` desde un cliente: solo Edge Functions con la clave de servicio
(D015).

- El perfil lo crea la base al registrarse el usuario (nombre tomado de Google si viene).
- `public.set_app_role(target, new_role)`: solo un admin; es la única vía para cambiar `app_role`.
- `public.has_active_subscription()`: `true` si el usuario tiene una suscripción `active` con
  el periodo vigente. Es la regla de acceso al contenido (D036) y los clientes la pueden
  llamar para decidir si muestran el candado.
- Planes iniciales: `basico` (2000, US$20/mes) y `consultoria` (4000, US$40/mes, con consultoría).

### Contenido (`20260927120000_contenido.sql`)

Acceso común a todas estas tablas:

| | Anónimo | Alumno (con o sin suscripción) | Admin |
|---|---|---|---|
| Filas | — | L de lo **visible** (la vitrina, D036) | L de todo, C, E, B |

"Visible" = publicado y dentro de un estilo publicado; en canciones, además, licencia no
vencida; en el curso, curso y estilo publicados.

| Tabla | Campos |
|---|---|
| `dance_styles` | `slug` · `name` · `beats_per_phrase` · `spoken_beats` · `call_beat` · `call_span_beats` · `lead_in_phrases` (motor-de-ritmo §1) · `has_roles` · `difficulty_bpm_bands` (tope de BPM por nivel, ascendente; PENDIENTE) · `start_position_id` · `published` · `sort_order` |
| `positions` | `style_id` · `slug` · `name` |
| `steps` | `style_id` · `slug` (nombra el clip `step.<slug>`) · `name` · `description` · `beat_notes` (`[{beat, note}]`) · `category` (`base\|vuelta\|entrada\|salida\|figura\|variacion\|libre`) · `difficulty` (1–5) · `start_position_id` · `end_position_id` · `phrases` · `can_start` · `can_end` · `repeatable` · `variation_of` · `voice_clip_path` · `published` · `sort_order` |
| `step_prerequisites` | `step_id` · `requires_step_id` |
| `step_videos` | `step_id` · `role` (`leader\|follower\|both`; un paso libre usa `both`) · `video_path` · `poster_path` · `duration_ms` · `aspect` (`16:9\|4:5\|9:16`) |
| `songs` | `title` · `artist` · `audio_path` · `duration_ms` · `bpm` (informativo) · `beat_grid` (`[{beat, tMs}]`, motor-de-ritmo §2) · `dance_end_ms` · `difficulty_override` · licencia: `license_source`, `license_notes`, `license_document_path`, `license_expires_at` · `published` |
| `song_styles` | `song_id` · `style_id` |
| `courses` | `style_id` (uno por estilo) · `title` · `description` · `published` |
| `course_units` | `course_id` · `position` · `title` |
| `lessons` | `unit_id` · `position` · `title` · `intro` · `practice_song_id` · `practice_phrases` · `final_song_id` |
| `lesson_steps` | `lesson_id` · `step_id` · `position` |

Reglas que impone la base:
- Las posiciones de un paso, su variación y la posición inicial del estilo son del **mismo
  estilo**. Un estilo publicado necesita posición inicial.
- `spoken_beats` ⊆ 1…`beats_per_phrase`; el anuncio (`call_beat` + `call_span_beats`) cabe en
  la frase.
- **Una canción no se publica** sin audio, duración, fin de baile, rejilla (≥ 2 anclas), fuente
  y documento de licencia (D009). Con la licencia vencida deja de verse sin despublicarla.
- `profiles.default_style_id`: el estilo con el que abre la app (D023); lo edita el alumno.

**Storage** (buckets privados, URLs firmadas de corta duración):

| Bucket | Leer | Escribir |
|---|---|---|
| `step-videos` · `songs` · `voice-clips` | alumno con suscripción activa, admin | admin |
| `song-licenses` | admin | admin |

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
