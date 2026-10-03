# API — backend (Supabase)

> **Esqueleto del arranque.** Tablas y funciones previstas; los tipos exactos, políticas RLS
> y payloads definitivos se escriben en la fase 07a junto con las migraciones. Todo cliente
> (web, Android, iOS) usa este mismo contrato.

## Acceso

- Auth: Supabase Auth (email + contraseña, Google; Apple antes de iOS). Detalle abajo, en
  **Flujo de autenticación**.
- **RLS en todas las tablas.** Contenido publicado: la vitrina (nombres, estructura del curso,
  catálogo) para cualquier alumno con cuenta; los medios, la práctica y el repaso solo con
  suscripción activa (D036); todo para `admin`. Datos del alumno: solo su dueño. Escritura
  de contenido: `admin`.
- `subscriptions`: el cliente **no** puede escribirla; solo la Edge Function
  `activate-subscription` (y, en el futuro, los webhooks de la pasarela).
- Storage privado con URLs firmadas de corta duración: `step-videos`, `songs`,
  `voice-clips` (v2: `coaching-uploads`).

### Flujo de autenticación

Lo implementa cada cliente con el SDK de Supabase (web: `@supabase/ssr`, sesión en cookies).
Ninguna regla vive solo en el cliente: la contraseña la valida Supabase y los permisos, RLS.

- **Registro:** `signUp(email, password, data: { full_name })`. El trigger
  `on_auth_user_created` crea `profiles` con `display_name` = `full_name` (o `name`, que
  manda Google). Si el proyecto exige confirmar el correo, no hay sesión hasta abrir el enlace;
  con la confirmación activa, un correo ya registrado vuelve como usuario **sin identidades**
  (se trata como "correo en uso").
- **Contraseña (D075):** mínimo 8 caracteres, con al menos una minúscula, una mayúscula (ASCII),
  un dígito y un símbolo de `` !@#$%^&*()_+-=[]{};'\:"|<>?,./`~ `` (Supabase › Auth › Email:
  longitud 8 + "Lowercase, uppercase letters, digits and symbols"). La UI solo refleja la regla.
- **Error del correo en los formularios (D100):** el de formato ("le falta la @ o el dominio")
  aparece tras 600 ms sin teclear, al salir del campo o al enviar; nunca mientras se escribe.
  Quitarlo es inmediato en cuanto el valor es válido o se vacía. "Escribe tu correo" solo al
  enviar. Igual en Entrar, Registro y Recuperar.
- **Correos (D078):** confirmación, recuperación y cambio de correo en español, en `supabase/templates/` (el
  proyecto real los recibe pegados en Supabase › Auth › Emails). El enlace es
  `{{ .ConfirmationURL }}` y termina en `/auth/callback`.
- **Entrar:** `signInWithPassword` o `signInWithOAuth({ provider: "google" })`.
- **Recuperar:** `resetPasswordForEmail(email, redirectTo = callback?next=/reset-password)`; el
  aviso es el mismo exista o no la cuenta. Es neutro: no afirma el envío ("Revisa tu correo: si
  {correo} tiene una cuenta, te llegará un enlace…", D102). **Restablecer (D106):** Edge Function
  `change-password` `{ password }` con la sesión de recuperación; la nueva cumple D075 y no es
  ninguna de las **últimas 3** (la actual + 2 anteriores) → si no, 422 `password_reused`. Nunca
  `updateUser({ password })` directo: salta el historial (Supabase no deja bloquearlo; el
  trigger igual registra el cambio). Detalle en § Edge Functions › `change-password`.
- **Vuelta (web `/auth/callback`):** recibe `code` (PKCE: Google, confirmación y
  recuperación) o `token_hash` + `type` (plantillas de correo con token) y guarda la sesión;
  luego redirige a `next`. Errores → `/login?error=<motivo>` (o `/forgot-password?error=…` si
  venía de recuperar). Motivos estables, compartidos por las tres plataformas:
  `link-expired` · `other-browser-signup` (PKCE sin verificador en un enlace de confirmación:
  el correo ya quedó confirmado, basta con entrar; va a `/login`) · `other-browser-recovery`
  (PKCE sin verificador en un enlace de recuperación: hay que pedir otro y abrirlo en el mismo
  navegador; va a `/forgot-password`) · `missing-code` · `google` · `access-failed`. El tipo de
  enlace sale de `type=recovery` o de `next=/reset-password`; lo demás cuenta como confirmación
  (D101). `other-browser` queda como alias de `other-browser-signup` para los enlaces ya
  enviados. Las nativas usan deep link al mismo flujo.
- **Cambio de correo (Perfil, D134):** `updateUser({ email }, emailRedirectTo = callback?type=email_change)`
  con "Secure email change" (Supabase › Auth › Email: llega un enlace al correo actual y otro al
  nuevo; el cambio aplica al confirmar los dos). Mientras tanto `user.new_email` trae el pendiente.
  La vuelta termina siempre en Perfil `/app/profile?email=<resultado>`: `changed` (con `code` o
  `token_hash` confirmado) · `confirm-other` (vuelve sin código y con `message`: falta abrir el
  otro enlace) · `link-expired` · `other-browser` (PKCE sin verificador: Supabase ya aplicó el
  cambio, falta la sesión) · `access-failed`. Errores de `updateUser`: los de la tabla general, salvo
  correo en uso ("usa otro", sin mandar a entrar) y `email_address_not_authorized` (el SMTP por
  defecto solo envía a direcciones autorizadas). Lógica pura en `lib/auth/email-change.ts`.
- **`next`:** solo rutas internas (`/…`, nunca `//`, `\`, esquemas ni las propias
  pantallas de auth); cualquier otra cosa cae en Inicio (`/app`). Sin open redirect.
- **Rutas protegidas:** todo `/app/**` exige sesión; `/admin/**` además `app_role = admin`,
  leído de `profiles` con la sesión del usuario (RLS), nunca de metadatos del cliente. El
  proxy web hace el chequeo optimista (redirige a `/login?next=…`) y cada página lo repite
  junto a los datos.
- **Cerrar sesión:** `signOut({ scope: "local" })` (solo este dispositivo); web: `POST
  /auth/logout` → `/login`.
- **Errores de Supabase → mensaje:** tabla en `lib/auth/errors.ts` (credenciales, correo sin
  confirmar, correo en uso, contraseña débil o repetida, límite de intentos, enlace vencido,
  sin conexión; el resto, genérico). Las nativas usan la misma tabla por `code`.

## Tablas previstas

| Grupo | Tablas |
|---|---|
| Usuarios | `profiles` (app_role `student\|teacher\|admin`, rol de baile `leader\|follower`, estilo por defecto, tema, ajustes del coach) · `audio_latency` (latencia medida por dispositivo de audio) |
| Estilos y pasos | `dance_styles` · `positions` · `steps` · `step_prerequisites` · `step_videos` (rol `leader\|follower\|both`) |
| Canciones | `songs` (audio, duración, bpm, `beat_grid`, `dance_start`/`dance_end`, dificultad, licencia) · `song_styles` |
| Curso | `courses` · `course_units` · `lessons` · `lesson_steps` · `lesson_progress` |
| Repaso y práctica | `user_steps` (estado, favorito) · `srs_cards` (FSRS, D038) · `step_reviews` · `user_song_favorites` · `practice_sessions` · `practice_session_steps` · `lesson_progress` |
| Suscripción | `plans` · `subscriptions` (provider `placeholder\|stripe\|google_play\|app_store`) |
| v2 | `coaching_threads` · `coaching_messages` · `coaching_submissions` · `coaching_annotations` |

## Esquema implementado

Migraciones en `supabase/migrations/` (probadas con PGlite, D037). Precios en centavos de USD.

**Tipos TS:** `supabase/functions/_shared/database.types.ts`, generado con `bun run db:types`
(Supabase CLI contra el proyecto remoto; no se edita a mano). Lo importan la web y las Edge
Functions. Toda migración nueva se aplica y regenera los tipos en el mismo PR:
`tests/unit/db-tipos.test.ts` compara tablas, columnas, nulabilidad, enums y funciones del
archivo contra las migraciones y falla si divergen. Android e iOS generan sus modelos desde
este mismo esquema (o sus enums de `Constants`).
En las tablas de acceso: **L** = leer, **C** = crear, **E** = editar, **B** = borrar.

### Usuarios y suscripción (`20260926200000_usuarios_y_suscripcion.sql`)

| Tabla | Campos | Anónimo | Alumno | Admin |
|---|---|---|---|---|
| `profiles` | `id` (= usuario de Auth) · `display_name` · `app_role` (`student\|teacher\|admin`) · `dance_role` (`leader\|follower`, null hasta el onboarding) · `theme` (`system\|light\|dark`) · `coach_voice_volume` (0–100) · `coach_spoken_count` · `onboarded_at` | — | L del suyo; E de `display_name`, `dance_role`, `theme`, `coach_voice_volume`, `coach_spoken_count` y `default_style_id` | L de todos, E de las mismas columnas; `app_role` solo con `set_app_role` |
| `audio_latency` | `user_id` · `platform` (`web\|android\|ios`) · `device_key` · `device_label` · `offset_ms` (−200…1000) · `sd_ms` · `taps` · `measured_at`; único por (usuario, plataforma, dispositivo) | — | L C E B de los suyos | igual que alumno |
| `plans` | `slug` · `name` · `price_cents` · `currency` · `billing_interval` · `includes_coaching` · `is_active` · `sort_order` | L de activos | L de activos | L de todos, C, E |
| `subscriptions` | `user_id` · `plan_id` · `status` (`active\|past_due\|canceled\|expired`) · `provider` (`placeholder\|stripe\|google_play\|app_store`) · `provider_ref` · `current_period_start/end` · `canceled_at`; una vigente (`active`/`past_due`) por alumno | — | L de la suya | L de todas |

Nadie escribe `subscriptions` desde un cliente: solo Edge Functions con la clave de servicio
(D015).

- El perfil lo crea la base al registrarse el usuario (nombre tomado de Google si viene).
- `public.set_app_role(target, new_role)`: solo un admin; es la única vía para cambiar `app_role`.
- `public.complete_onboarding(p_style_ids, p_dance_role, p_level)` (alumno; anónimo no):
  cierra la Bienvenida en una transacción. Exige sesión, ≥ 1 estilo y que todos estén
  publicados (si no, error `22023`; sin sesión, `42501`). Reemplaza `user_styles`, pone
  `dance_role` y `experience_level`, conserva `default_style_id` si sigue entre los elegidos
  (si no, el primero por `sort_order`) y `onboarded_at = now()`. Idempotente. Es la única vía
  para escribir `user_styles`, `experience_level` y `onboarded_at` (D080–D083; `onboarded_at`
  sin permiso de columna desde `20260930100000_onboarded_at_grant.sql`). Los clientes desvían a
  Bienvenida mientras `onboarded_at` sea null.
- `public.has_active_subscription()`: `true` si el usuario tiene una suscripción `active` con
  el periodo vigente. Es la regla de acceso al contenido (D036) y los clientes la pueden
  llamar para decidir si muestran el candado.
- Planes iniciales: `basico` (2000, US$20/mes) y `consultoria` (4000, US$40/mes, con consultoría).

### Bienvenida (`20260929200000_onboarding.sql`)

| Tabla / columna | Campos | Anónimo | Alumno | Admin |
|---|---|---|---|---|
| `profiles.experience_level` | `beginner|knows_steps`, null hasta el onboarding | — | L del suyo; se escribe solo con `complete_onboarding` | L de todos |
| `user_styles` | `user_id` · `style_id` · `created_at`; único por (alumno, estilo) | — | L de los suyos; se escribe solo con `complete_onboarding` | L de todos |

### Contenido (`20260927120000_contenido.sql`)

Acceso común a todas estas tablas:

| | Anónimo | Alumno (con o sin suscripción) | Admin |
|---|---|---|---|
| Filas | — | L de lo **visible** (la vitrina, D036) | L de todo, C, E, B |

"Visible" = publicado y dentro de un estilo publicado; en canciones, además, licencia no
vencida; en el curso, curso y estilo publicados.

| Tabla | Campos |
|---|---|
| `dance_styles` | `slug` · `name` · `beats_per_phrase` · `spoken_beats` · `call_beat` · `call_span_beats` · `lead_in_phrases` (motor-de-ritmo §1) · `has_roles` · `difficulty_bpm_bands` (tope de BPM por nivel, ascendente; hasta 4 topes → niveles 1–5; null o vacío = canciones sin dificultad salvo override; provisionales en el seed, D137) · `start_position_id` · `published` · `sort_order` |
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

Límites por bucket (`20261003120000_admin_steps.sql`, D150): **50 MB** por archivo y tipos fijos
(sin transcodificar en v1). El cliente valida lo mismo antes de subir y manda siempre el tipo
canónico de la extensión.

| Bucket | Tipos (extensión → tipo) |
|---|---|
| `step-videos` | mp4 → `video/mp4` · webm → `video/webm` |
| `songs` · `voice-clips` | mp3 → `audio/mpeg` · m4a → `audio/mp4` · wav → `audio/wav` |
| `song-licenses` | pdf → `application/pdf` · jpg → `image/jpeg` · png → `image/png` |

Nombres de objeto (D150): uno nuevo en cada subida, nunca se reescribe (sin caché vieja); el
anterior se borra después de apuntar la fila al nuevo. Videos de un paso:
`step-videos/<step_id>/<rol>-<marca>.<ext>`; clip de voz del paso (`step.<slug>`):
`voice-clips/steps/<step_id>-<marca>.<ext>`.

### Admin · Pasos (`20261003120000_admin_steps.sql`)

Solo admin (`private.is_admin()`); para el resto, ninguna fila o `42501`. Las escrituras siguen
pasando por la RLS de contenido. Las reglas valen para la API (`anon`, `authenticated`,
`service_role`); el seed y las migraciones quedan fuera.

- **Video completo** (D149): un video `both`, o uno `leader` y uno `follower`
  (`private.step_videos_complete(step_id)`). **Publicar** un paso (insert publicado o
  false → true) lo exige; un paso publicado no puede quedarse sin video completo (borrar un video
  o cambiarle el rol o el paso). Los ya publicados no se revalidan en otros cambios.
- **Borrar** (D152): solo borradores que ninguna lección usa; un publicado se despublica antes.
- **Prerequisitos** (D151): del mismo estilo y sin círculo directo (A → B → A).
- Errores propios: `MS001` video incompleto · `MS002` prerequisito en círculo · `MS003`
  prerequisito de otro estilo · `MS004` borrar un publicado · `MS005` borrar un paso en una lección.

| Función | Devuelve |
|---|---|
| `admin_steps(p_style_id)` | Todos los pasos del estilo por `sort_order` y nombre: `id` · `slug` · `name` · `category` · `difficulty` · `published` · `sort_order` · `videos_complete` · `has_voice_clip` · `lesson_count` |
| `admin_step_issues(p_step_id)` | Motivos que bloquean publicar, en orden: `missing_video_leader` · `missing_video_follower` (estilo con roles) o `missing_video_both` (paso libre o estilo sin roles); `{}` = se puede publicar |
| `admin_save_step(p_step_id, p_style_id, p_step, p_prerequisites)` | Crea (`p_step_id` null, sin publicar) o edita el paso con sus prerequisitos en una transacción y devuelve el id. `p_step`: los campos editables (sin `published` ni medios); `p_prerequisites` reemplaza la lista (D153) |

Lo demás va directo por RLS: `steps.published` (publicar y despublicar), `delete from steps`,
`step_videos` (reemplazar = update de `video_path`, `duration_ms` y `aspect` de la fila del rol,
nunca del rol; si no hay fila, insert) y `steps.voice_clip_path`.

### Datos del alumno (`20260927180000_progreso.sql`)

Cada alumno lee **solo lo suyo**; el admin lee todo; anónimo, nada. Las reglas de negocio
(FSRS, estado de los pasos, sesiones, progreso) las escriben las Edge Functions (D003, D013),
que exigen suscripción activa. El cliente solo escribe lo marcado.

| Tabla | Campos | El cliente puede |
|---|---|---|
| `user_steps` | `user_id` · `step_id` · `status` (`unknown\|learning\|known`) · `favorite` | crear su fila y cambiar `favorite` (pasos visibles) |
| `srs_cards` | `user_id` · `step_id` · `role` · `state` (`new\|learning\|review\|relearning`) · `stability` · `difficulty` (0–10) · `due_at` · `last_review_at` · `reps` · `lapses` | — |
| `step_reviews` | `user_id` · `step_id` · `role` · `rating` (1–4) · `context` (`lesson\|practice\|catalog`) · `session_id` · `lesson_id` · `reviewed_at` · `due_after`; único por (sesión, paso, rol) | — |
| `practice_sessions` | `user_id` · `style_id` · `song_id` · `mode` (`lesson\|free`) · `lesson_id` · `seed` · `filters` · `phrases_available` · `plan` · `created_at` · `completed_at` | poner `completed_at` en las suyas |
| `practice_session_steps` | `session_id` · `step_id` · `phrases` (un paso distinto por sesión) | — |
| `lesson_progress` | `user_id` · `lesson_id` · `completed_at` | — |
| `user_song_favorites` | `user_id` · `song_id` | agregar y quitar (canciones visibles) |

Consultas del cliente: las que llevan reglas van por funciones SQL (abajo), no se rearman en
cada cliente (D003).
- "Para hoy" = `due_steps(style)`.
- "Lo que más te cuesta" = `hardest_steps(style)` (D093).
- Camino y siguiente lección = `course_path(style)`: la actual es la primera sin fila en
  `lesson_progress`, en orden de unidad y posición.

Funciones (alumno y admin; anónimo no):
- `public.song_popularity()` → `(song_id, sessions_30d, percentile)`: sesiones de los últimos
  30 días, de todos los alumnos, solo canciones visibles.
- `public.step_popularity(style)` → `(step_id, appearances_30d, percentile)`: apariciones en
  sesiones de los últimos 30 días, solo pasos visibles del estilo. Alimenta el peso
  `popular(1 + percentil)` de `combinaciones.md`.

Inicio y Curso (`20260930120000_course_path.sql`): `security invoker` (RLS decide lo visible),
el alumno sale de `auth.uid()`. Las tarjetas que cuentan son las del rol del perfil, o `leader`
si el estilo no tiene roles (D051).

| Función | Devuelve |
|---|---|
| `public.course_path(p_style_id)` | una fila por lección del curso **publicado** del estilo, en orden: `course_id, unit_id, unit_position, unit_title, lesson_id, lesson_position, lesson_number` (1…N en el curso), `lesson_title, step_count, status, lesson_count`. `status` (D092): `completed` (tiene `lesson_progress`; se puede repetir) · `current` (la primera no completada) · `available` (desbloqueada, no completada ni actual: solo con huecos) · `locked`. Sin curso publicado: ninguna fila |
| `private.lesson_unlocked(p_user, p_lesson)` | la regla de desbloqueo lineal: primera del curso, o la anterior o ella misma completadas (la misma de `ef_plan_session_state`) |
| `public.style_progress()` | estilos publicados en orden de catálogo: `style_id, name, has_roles, chosen` (en `user_styles`), `has_course, lesson_count, completed_count` |
| `public.due_steps(p_style_id)` | `step_id, slug, name, due_at` de las tarjetas con `due_at ≤ now()`, las más atrasadas primero |
| `public.hardest_steps(p_style_id, p_limit = 3)` | `step_id, slug, name, difficulty` (del paso, 1–5), `last_rating, last_reviewed_at, lapses`: tarjetas cuya última calificación fue 1–2 o con `lapses > 0`, por última calificación ↑, `lapses` ↓, dificultad FSRS ↓, más reciente primero (D093). Límite máx. 20 |

Progreso (`20261002130000_progress.sql`): `security invoker`; cuentan solo los datos de
`auth.uid()` (el admin, que por RLS lee los de todos, ve aquí los suyos). Mismo rol de tarjeta
que arriba (D051).

| Función | Devuelve |
|---|---|
| `public.review_forecast(p_style_id, p_days = 7, p_tz = 'UTC')` | una fila por **día de calendario en la zona `p_tz`** (IANA; el cliente manda la del dispositivo, `Intl…timeZone` / `TimeZone.current` / `ZoneId.systemDefault()`), de hoy a hoy + `p_days` − 1, también los vacíos: `day` (date), `due_count` (tarjetas del rol en pasos publicados del estilo que vencen ese día; **hoy incluye las ya vencidas**). `p_days` se acota a 1…14. Zona desconocida → error `22023` (D130) |
| `public.step_status_counts(p_style_id)` | una fila: `unknown_count, learning_count, known_count, total` sobre los pasos **publicados** del estilo según `user_steps.status` (sin fila = no lo sé). Ceros si el estilo no tiene pasos (D131) |

Sesiones recientes (Progreso, D132): lectura directa de `practice_sessions` con
`user_id = auth.uid()` (filtro explícito: RLS deja al admin leer las de todos), orden
`created_at` ↓, límite 5, con `dance_styles(name)`, `songs(title)` (null si ya no es visible)
y `lessons(title)`.

Marca de fin de una práctica (D146–D147): el cliente pone `practice_sessions.completed_at`
(grant de columna, RLS: solo las suyas) en la práctica libre y en la de la Lección, **al acabar
la canción** o al tocar **Terminar / Continuar después de haber sonado** (la X, o Continuar sin
haber empezado, no la marcan). Idempotente:
`update practice_sessions set completed_at = <ahora del dispositivo> where id = <sessionId> and completed_at is null`.
Si el reloj del dispositivo va atrasado y choca con `check (completed_at >= created_at)`
(`23514`), se lee `created_at` y se usa el mayor de los dos. Si falla, se reintenta una vez y
se deja, sin aviso y sin bloquear la navegación. Web: `lib/stage/completion.ts`.

Estilo por defecto: el alumno escribe `profiles.default_style_id` directo (grant de columna,
RLS: su fila); el cliente filtra por su `id`.

Perfil (`20261002140000_profile.sql`): las preferencias (`display_name`, `dance_role`,
`default_style_id`, `theme`, `coach_voice_volume`, `coach_spoken_count`) se escriben directo,
una a la vez al cambiarlas (grant de columna, RLS: su fila); la latencia se lee de
`audio_latency` (la web más reciente, D124). `theme` manda al cargar la app con sesión (D136).

| Función | Devuelve |
|---|---|
| `public.my_subscription()` | `security invoker`, de `auth.uid()` (también el admin, solo la suya). A lo sumo una fila: la vigente o, si no hay, la de período más reciente: `plan_name, price_cents, currency, billing_interval` (null si el plan ya no es legible: inactivo), `status, current_period_end, canceled_at`, `state` (`active` = la condición de `has_active_subscription()` · `past_due` · `canceled` · `expired`, que incluye `active` con el período vencido). Sin suscripción, ninguna fila (D135) |

Calibrar audífonos (`20261002170000_calibration.sql`, D142–D144): la pantalla lee los ajustes
propios de `audio_latency` (`user_id = auth.uid()`, `platform`, orden `measured_at` ↓) y guarda
con una función; las reglas de la medición están en el core (`calibration.ts`).

| Función | Devuelve |
|---|---|
| `public.save_audio_latency(p_platform, p_device_key, p_device_label, p_offset_ms, p_sd_ms = null, p_taps = null)` | `security invoker`, siempre la fila de `auth.uid()` (también el admin). Upsert por (alumno, plataforma, `device_key`) con `measured_at = now()` también al repetir (la sesión usa la más reciente, D124). `p_offset_ms` fuera de −200…300 → error `22023` (el rango del ajuste, más angosto que el check de la tabla); sin sesión → `42501`. Devuelve la fila guardada |

Práctica libre (`20261001130000_practice_songs.sql`): `security invoker`; los favoritos son
siempre los de `auth.uid()` (aunque un admin lea los de todos por RLS).

| Función | Devuelve |
|---|---|
| `public.practice_songs(p_style)` | una fila por canción **visible** del estilo (publicada con licencia vigente; un admin ve también las sin publicar), por título: `song_id, title, artist, bpm, duration_ms, dance_end_ms, beat_grid, difficulty` (1–5 o null), `favorite` (de quien llama), `sessions_30d, popularity` (percentil 0–1, de `song_popularity()`), `ready` (rejilla ≥ 2 anclas y `dance_end_ms`: lo que `plan-session` exige). La usan el configurador y Canciones; el modo de canción (D117) se aplica sobre esta lista |
| `private.song_difficulty(override, bpm, bands)` | `difficulty_override` si la hay; si no, por `dance_styles.difficulty_bpm_bands`: el primer tope con BPM ≤ tope (nivel 1…), por encima del último el siguiente nivel (máx. 5); sin bandas o sin BPM, null |

Catálogo de pasos (`20261002120000_step_catalog.sql`, D127): `security invoker`; estado,
favorito y tarjeta son siempre los de `auth.uid()` (aunque un admin lea los de todos por RLS).

| Función | Devuelve |
|---|---|
| `public.step_catalog(p_style_id)` | una fila por paso **publicado** del estilo (también para el admin), por categoría en el orden del enum (`base, vuelta, entrada, salida, figura, variacion, libre`) y dentro por `sort_order` y nombre (D128): `step_id, slug, name, category, difficulty` (1–5), `status` (`unknown` sin fila en `user_steps`), `favorite` (false sin fila), `due_at` (la tarjeta del rol del perfil, o `leader` si el estilo no tiene roles; null sin tarjeta). La usa el catálogo `/app/steps`; búsqueda y filtros, en el cliente |

Detalle de un paso (`20261002160000_step_detail.sql`, D138–D140): `security invoker`; estado,
favorito, tarjeta e historial son siempre los de `auth.uid()` (aunque un admin lea los de todos
por RLS). Cambiar el estado: `review-steps` con `context: "catalog"` y `status` (abajo).

| Función | Devuelve |
|---|---|
| `public.step_detail(p_style_id, p_slug)` | a lo sumo una fila: el paso **publicado** de un estilo publicado con ese slug (también para el admin); si el slug se repite, el de `p_style_id` y, si no lo tiene, el del primer estilo por `sort_order`. `step_id, style_id, slug, name, description` (null), `category, difficulty` (1–5), `phrases`, `beat_notes` (jsonb `[{ beat, note }]`), `free` (`category = 'libre'` o estilo sin roles: un video, sin segmentado, D016), `start_position, end_position` (nombres), `videos` (jsonb `[{ role, duration_ms, aspect, video_path, poster_path }]`, `[]` sin videos), `role` (el de la tarjeta: `dance_role` del perfil, `leader` si el estilo no tiene roles, null si el perfil no tiene), `status` (`unknown` sin fila), `favorite`, `due_at` (tarjeta de `role`; null sin tarjeta), `related` (jsonb `[{ step_id, slug, name, category, relation }]`, D139: `prerequisite` = sus prerequisitos, `base` = el paso del que es variación, `variation` = sus variaciones; solo publicados del mismo estilo, un paso una vez con la primera relación en ese orden, dentro por `sort_order` y nombre), `history` (jsonb `[{ reviewed_at, rating, context, role }]`, D140: los últimos 10 `step_reviews` propios del paso, todos los roles, del más reciente). Sin fila → 404 |

Favorito de un paso desde el cliente (D129): `update user_steps set favorite` de la fila propia;
si no había fila y se marca, `insert (user_id, step_id, favorite)`; si el insert choca (23505,
otra pestaña), `update` otra vez. Sin upsert: su `do update` reescribiría `user_id` y `step_id`,
que no tienen grant de update. Desmarcar sin fila no escribe nada.

## Edge Functions

Código en `supabase/functions/` (Deno en Supabase). Contrato común a todas:

**Petición.** `POST` con cuerpo JSON y `Authorization: Bearer <access_token del alumno>`.
El alumno sale **siempre** del JWT (`auth.getUser(jwt)`), nunca de un campo del cuerpo.
CORS abierto (`*`, sin cookies); el preflight `OPTIONS` responde 204.

**Errores.** Una sola forma: `{ "error": { "code": "<código>", "message": "<texto para la UI>" } }`.

| HTTP | Cuándo | Códigos |
|---|---|---|
| 400 | entrada inválida | `invalid_json` · `invalid_input` (el mensaje trae la ruta del campo) · `duplicate_step` · `role_required` · `session_lesson_mismatch` · `invalid_role` |
| 401 | sin sesión o JWT inválido | `unauthorized` |
| 403 | sin suscripción activa · lección bloqueada | `no_active_subscription` · `lesson_locked` |
| 404 | no existe (o no es del alumno, o no la ve) | `plan_not_found` · `user_not_found` · `session_not_found` · `lesson_not_found` · `step_not_found` · `style_not_found` · `song_not_found` |
| 405 | método distinto de `POST` | `method_not_allowed` |
| 409 | choca con el estado actual | `subscription_exists` · `style_not_ready` · `song_not_ready` · `song_too_short` · `no_steps` · `no_plan` |
| 422 | la contraseña no se acepta (`change-password`) | `weak_password` (no cumple D075) · `password_reused` (una de las últimas 3) |
| 500 | cualquier otro fallo (se registra; sin detalles al cliente) | `internal` |

Una sesión de otro alumno responde 404, igual que una inexistente: no se revela.

**Escrituras atómicas (D050).** supabase-js no tiene transacciones: cada función escribe en
**una** llamada a una función SQL (`public.ef_*`, `security definer`, ejecutable solo por
`service_role`; migración `20260929120000_edge_functions.sql`). Las reglas que protegen datos
(suscripción, dueño de la sesión, idempotencia) se comprueban ahí, no solo en TS.

| Función SQL | La usa | Hace |
|---|---|---|
| `ef_activate_subscription(p_user, p_plan_slug)` | `activate-subscription` | crea o devuelve la suscripción |
| `ef_review_state(p_user, p_step_ids)` | `review-steps` | lee suscripción, rol del perfil, pasos (`hasRoles`, estado) y tarjetas |
| `ef_review_steps(p_user, p_payload)` | `review-steps` | escribe repasos, tarjetas, estado y progreso en una transacción |
| `ef_plan_session_state(p_user, p_style, p_song, p_lesson?)` | `plan-session` | lee suscripción, admin, estilo, canción, lección (desbloqueo, pasos, anteriores) y pasos del estilo con estado, favorito, tarjeta y popularidad (migración `20260929180000_plan_session.sql`) |
| `ef_plan_session(p_user, p_payload)` | `plan-session` | registra `practice_sessions` + `practice_session_steps` en una transacción |
| `ef_password_recently_used(p_user, p_candidate)` | `change-password` | `true` si la candidata es la contraseña actual o una de las 2 anteriores; puente a `private.password_recently_used` (D108, migración `20260930160000_password_history.sql`) |

**Variables** (las inyecta Supabase al desplegar; no se configuran a mano): `SUPABASE_URL` y
la clave secreta, de `SUPABASE_SECRET_KEYS` (JSON, clave `default`) o, si no está, de la
heredada `SUPABASE_SERVICE_ROLE_KEY`. Nunca en un cliente.

**Estructura (D052).** Por función: `handler.ts` (lógica, recibe sus puertos: auth, datos,
reloj; se prueba con bun), `supabase.ts` (el puerto de datos con supabase-js) e `index.ts`
(arma el cliente y llama a `Deno.serve`). Compartido en `_shared/`: `http.ts`, `auth.ts`,
`client.ts`, `validate.ts`, `sql-errors.ts`, `runtime.ts`; reglas puras en `_shared/core/`
(p. ej. `password.ts`, D107). Las dependencias usan el mismo
especificador en Deno (`deno.json`) y en bun (`package.json`), con la misma versión. Al
desplegar, Supabase empaqueta cada función con el `deno.json` **de su carpeta** (el global de
`supabase/functions/` solo vale en local): cada función trae una copia con los mismos imports
(lo vigila `tests/unit/ef-deno-json.test.ts`).

### `plan-session`
Entrada: `{ styleId, songId, mode: "lesson"|"free", lessonId?, focusStepId?, stepFilters?, seed? }`
- `stepFilters` (solo `free`): `{ minDifficulty?, maxDifficulty? (1–5), favoritesOnly?, includeLearning? (por defecto true), order? }`.
  `order`: criterio de los pasos, `"review"` (por defecto: según repaso) | `"random"` | `"popular"` | `"difficulty"`
  (`combinaciones.md` § Criterio, D115); otro valor → 400 `invalid_input` en `stepFilters.order`.
- `focusStepId` (solo `lesson`): mini práctica de ese paso de la lección.
- `seed`: entero 0–4294967295 (uint32). Si no viene, la genera el servidor (D064).

Salida: `{ sessionId, seed, phrasesAvailable, plan: [{ stepId, startPhrase, phrases }], unplaced: [stepId], timeline: [evento] }`
— `seed` es la que se usó (guardada en `practice_sessions.seed`): con la misma entrada y los
mismos datos da el mismo plan y la misma línea de tiempo.

Reglas: `motor-de-ritmo.md` y `combinaciones.md` (D063–D066). Exige suscripción activa.
- **Visibilidad (D063).** Estilo, canción y lección se ven como con RLS: el alumno solo lo
  publicado (canción con licencia vigente); el admin también lo no publicado (p. ej. las
  canciones del seed, sin audio). Lo que no ve → 404. La canción tiene que ser del estilo
  (`song_styles`) y la lección, de un curso del estilo. Lección bloqueada (la anterior del
  curso sin completar) → 403 `lesson_locked`, salvo el admin.
- **Canción.** Sin rejilla válida o sin `dance_end_ms` → 409 `song_not_ready`. `N` y
  `startPhrase` salen de `phraseWindow` (motor-de-ritmo §3); con `N = 0` → 409
  `song_too_short`. Estilo sin posición inicial → 409 `style_not_ready`.
- **Pasos y targets (D065).** Pasos visibles del estilo (publicados; el admin, todos), en
  orden de catálogo (`sort_order`, `slug`). `baseSteps` = base con misma posición de
  inicio y fin.
  - `free`: pasos en `known` (y `learning` salvo `includeLearning: false`) que cumplen los
    filtros; ninguno → 409 `no_steps`. Con `order: "review"` (o sin `order`), targets = los
    vencidos (`due_at ≤ ahora`), del más atrasado al menos, como mucho `N`; con `random`,
    `popular` o `difficulty`, sin targets (D115).
  - `lesson`: pasos de la lección, de las lecciones anteriores del curso y los `known`;
    targets = pasos de la lección en su orden.
  - `lesson` + `focusStepId`: ese paso y los de las lecciones anteriores (para llegar a su
    posición de entrada); target = ese paso; `N = min(N, practice_phrases)`.
  - Pesos: `due` (tarjeta vencida), `difficulty` (FSRS, si ya tuvo un repaso), `favorite`,
    `popularity` (`step_popularity`). Tarjeta = la del `dance_role` del perfil (estilo sin
    roles: `leader`; perfil sin rol: la más urgente y la más difícil de los dos roles).
    Con `order: "difficulty"` cada paso lleva además `catalogDifficulty` (la de `steps`, 1–5)
    para los que todavía no tienen repaso. `PlanInput.order` = el criterio (`lesson`: `review`).
- Sin plan posible → 409 `no_plan`. En los errores no se registra nada.
- **Registro.** Una llamada atómica a `ef_plan_session`: `practice_sessions` (`seed`,
  `filters` = `stepFilters` tal como llegó, con su `order` si vino (ausente = `review`), más `focusStepId`, `phrases_available` = `N`, `plan`) y un
  `practice_session_steps` por paso distinto con la suma de sus frases. La línea de tiempo
  no se guarda: se recalcula del plan y la rejilla.

### `review-steps`
Entrada: `{ sessionId?, lessonId?, context: "lesson"|"practice"|"catalog", reviews?: [{ stepId, role?, rating: 1-4, reviewedAt }], status?: [{ stepId, status: "unknown"|"learning"|"known", role? }] }`
Salida: `{ cards: [{ stepId, role, dueAt, state }] }` — las tarjetas actuales de todos los pasos
de la petición (un paso en `unknown` no tiene).

Reglas (`srs.md`, D051). Exige suscripción activa.
- Al menos un elemento entre `reviews` y `status`; como mucho 100 en cada una. Un paso no se
  repite en `status` ni aparece en las dos listas; un (paso, rol) no se repite en `reviews`.
- `reviewedAt`: ISO 8601 con zona. Se acota a [último repaso de la tarjeta, ahora del
  servidor]: un reloj adelantado no programa en el futuro ni uno atrasado retrocede la tarjeta.
- **Rol.** Estilo sin roles (`has_roles = false`): una sola tarjeta por paso, con rol
  `leader` (el enum `dance_role` no tiene "ambos"). Con roles: `reviews` exige `role`;
  `status` sin `role` usa el `dance_role` del perfil (sin ninguno → 400 `role_required`).
- **Idempotencia.** `context` `lesson` o `practice` con `reviews` exige `sessionId`; un repaso
  se guarda una vez por `(sessionId, stepId, role)` y la tarjeta solo se actualiza si el
  repaso entró (reenviar, aun con otra nota, no cambia nada). `context: "catalog"` no lleva
  sesión: sus repasos no son idempotentes, pero "me lo sé" sobre un paso que ya está en
  `known` no hace nada.
- Un repaso deja el paso en `learning` en el catálogo si estaba en `unknown`.
- `status`: `known` = repaso Good (sobre la tarjeta que haya, o una nueva) y paso en `known`;
  `learning` = tarjeta nueva si no había (una existente no se reinicia); `unknown` = se borran
  las tarjetas del paso (todos los roles) y el historial de `step_reviews` queda.
- `context: "lesson"` exige `lessonId`; con `sessionId`, la sesión tiene que ser de esa
  lección (`session_lesson_mismatch`). Registra `lesson_progress` (desbloquea la siguiente)
  cuando hay repasos y la sesión es la **práctica final**: su canción es `final_song_id` de
  la lección, o la lección no fija una.

### `change-password`
Entrada: `{ password }` · Salida: `{ ok: true }`. No exige suscripción: vale cualquier sesión del
alumno, también la de recuperación (D106–D108).
- `password`: texto de 1 a 72 bytes (bcrypt solo mira 72) → si no, 400 `invalid_input`.
- No cumple D075 (`_shared/core/password.ts`, vectores `password-reglas.json`) → 422
  `weak_password`, sin tocar la base.
- Es la actual o una de las 2 anteriores (`ef_password_recently_used`: `crypt` de pgcrypto
  contra los hashes de Auth) → 422 `password_reused`.
- Si no: `auth.admin.updateUserById(uid, { password })`. Si Auth la rechaza por débil → 422
  `weak_password`; cualquier otro fallo → 500. La sesión actual sigue valiendo.
- **Historial.** `private.password_history (user_id, hash, created_at)`, sin acceso para ningún
  rol de la API. Lo llena el trigger `on_auth_user_password_changed` (`after update of
  encrypted_password on auth.users`): guarda el hash anterior si había uno (una cuenta solo de
  Google no tiene) y conserva los 2 más recientes. Registra cualquier cambio (función, panel,
  `updateUser`); borrar la cuenta borra su historial.
- La contraseña nunca se registra ni vuelve en la respuesta. Clientes: mensaje por `code` con la
  tabla de `lib/auth/errors.ts`; 401 → "tu sesión terminó".

### `activate-subscription`
Entrada: `{ planSlug }`
Salida: `{ subscription: { plan, status, currentPeriodEnd, priceCents, currency, billingInterval } }`
Reglas (D015, D049): v1 = proveedor `placeholder`, sin cobro. Precio y período salen de
`plans` (activo), nunca del cliente; período de un mes o un año según `billing_interval`.
- Sin suscripción vigente: crea una `active`.
- Con una vigente del **mismo** plan: la devuelve tal cual (idempotente; no la renueva).
- Con una vigente de **otro** plan: 409 `subscription_exists` (el cambio de plan llega con la
  pasarela real).
- Una `active`/`past_due` con el período vencido se marca `expired` y se crea otra.

## Lecturas directas (SDK + RLS)

Catálogo de pasos, canciones, curso y progreso se leen con el SDK de Supabase respetando RLS;
las vistas de popularidad y "más difíciles" se exponen como vistas o funciones SQL (07a).

## Datos de ejemplo (seed)

`supabase/seed.sql` siembra un catálogo **placeholder** para desarrollo y para las primeras
pruebas (D053–D055); César corrige nombres, dificultades, frases, posiciones, canciones y el
orden del curso. Lo aplica `supabase db reset` y, a mano, el proyecto real. Es idempotente
(UUID fijos, `on conflict (clave) do nothing`): una segunda corrida no cambia ni pisa nada.

| Qué | Contenido |
|---|---|
| Estilos | `salsa-casino` y `merengue`, publicados, con los valores del core (`style.ts`) |
| Bandas de dificultad | **propuesta** (D137): casino `{170,185,200,215}`, merengue `{125,140,155,170}`. Solo se ponen si el estilo no tiene bandas (null o vacías): no pisan las editadas |
| Posiciones | salsa: `guapea` (inicial), `cerrada`, `abierta` · merengue: `cerrada` (inicial), `abierta` |
| Pasos | 20 de casino y 11 de merengue, publicados; pasan `validateCatalog`. Base: `guapea`, `basico-cerrada` (salsa) · `basico`, `basico-abierta` (merengue) |
| Canciones | 5 pistas de prueba **sin audio ni licencia, sin publicar** (D009), con rejilla de 2–3 anclas y `dance_end_ms` |
| Curso | uno por estilo, publicado: 2 unidades × 3 lecciones, con pasos en orden y canción de práctica |

No siembra usuarios, suscripciones ni datos de alumno (los `plans` vienen de la migración).
Test: `tests/unit/db-seed.test.ts`.
