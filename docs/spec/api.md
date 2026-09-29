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
- **Contraseña (D075):** mínimo 8 caracteres, al menos una letra y un dígito ASCII
  (Supabase › Auth › Email: longitud 8 + "letters and digits"). La UI solo refleja la regla.
- **Entrar:** `signInWithPassword` o `signInWithOAuth({ provider: "google" })`.
- **Recuperar:** `resetPasswordForEmail(email, redirectTo = callback?next=/restablecer)`; el
  aviso es el mismo exista o no la cuenta. **Restablecer:** `updateUser({ password })` con la
  sesión de recuperación.
- **Vuelta (web `/auth/callback`):** recibe `code` (PKCE: Google, confirmación y
  recuperación) o `token_hash` + `type` (plantillas de correo con token) y guarda la sesión;
  luego redirige a `next`. Errores → `/entrar?error=<motivo>` (o `/recuperar?error=…` si
  venía de recuperar). Motivos estables, compartidos por las tres plataformas:
  `enlace-vencido` · `otro-navegador` (PKCE sin verificador: el correo ya quedó confirmado) ·
  `sin-codigo` · `google` · `acceso`. Las nativas usan deep link al mismo flujo.
- **`next`:** solo rutas internas (`/…`, nunca `//`, `\`, esquemas ni las propias
  pantallas de auth); cualquier otra cosa cae en Inicio (`/app`). Sin open redirect.
- **Rutas protegidas:** todo `/app/**` exige sesión; `/admin/**` además `app_role = admin`,
  leído de `profiles` con la sesión del usuario (RLS), nunca de metadatos del cliente. El
  proxy web hace el chequeo optimista (redirige a `/entrar?next=…`) y cada página lo repite
  junto a los datos.
- **Cerrar sesión:** `signOut({ scope: "local" })` (solo este dispositivo); web: `POST
  /auth/salir` → `/entrar`.
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

Consultas típicas del cliente:
- "Para hoy" = `srs_cards` con `due_at ≤ ahora`.
- "Los que más cuestan" = `srs_cards` por `stability` ascendente.
- Siguiente lección = la primera sin fila en `lesson_progress`, en orden de unidad y posición.

Funciones (alumno y admin; anónimo no):
- `public.song_popularity()` → `(song_id, sessions_30d, percentile)`: sesiones de los últimos
  30 días, de todos los alumnos, solo canciones visibles.
- `public.step_popularity(style)` → `(step_id, appearances_30d, percentile)`: apariciones en
  sesiones de los últimos 30 días, solo pasos visibles del estilo. Alimenta el peso
  `popular(1 + percentil)` de `combinaciones.md`.

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
| 403 | sin suscripción activa | `no_active_subscription` |
| 404 | no existe (o no es del alumno) | `plan_not_found` · `user_not_found` · `session_not_found` · `lesson_not_found` · `step_not_found` |
| 405 | método distinto de `POST` | `method_not_allowed` |
| 409 | choca con el estado actual | `subscription_exists` |
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

**Variables** (las inyecta Supabase al desplegar; no se configuran a mano): `SUPABASE_URL` y
la clave secreta, de `SUPABASE_SECRET_KEYS` (JSON, clave `default`) o, si no está, de la
heredada `SUPABASE_SERVICE_ROLE_KEY`. Nunca en un cliente.

**Estructura (D052).** Por función: `handler.ts` (lógica, recibe sus puertos: auth, datos,
reloj; se prueba con bun), `supabase.ts` (el puerto de datos con supabase-js) e `index.ts`
(arma el cliente y llama a `Deno.serve`). Compartido en `_shared/`: `http.ts`, `auth.ts`,
`client.ts`, `validate.ts`, `sql-errors.ts`, `runtime.ts`. Las dependencias usan el mismo
especificador en Deno (`deno.json`) y en bun (`package.json`), con la misma versión.

### `plan-session`
Entrada: `{ styleId, songId, mode: "lesson"|"free", lessonId?, stepFilters?, seed? }`
Salida: `{ sessionId, phrasesAvailable, plan: [{ stepId, startPhrase, phrases }], unplaced: [stepId], timeline: [evento] }`
Reglas: `motor-de-ritmo.md` y `combinaciones.md`. Registra la sesión en `practice_sessions`.

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
| Posiciones | salsa: `guapea` (inicial), `cerrada`, `abierta` · merengue: `cerrada` (inicial), `abierta` |
| Pasos | 20 de casino y 11 de merengue, publicados; pasan `validateCatalog`. Base: `guapea`, `basico-cerrada` (salsa) · `basico`, `basico-abierta` (merengue) |
| Canciones | 5 pistas de prueba **sin audio ni licencia, sin publicar** (D009), con rejilla de 2–3 anclas y `dance_end_ms` |
| Curso | uno por estilo, publicado: 2 unidades × 3 lecciones, con pasos en orden y canción de práctica |

No siembra usuarios, suscripciones ni datos de alumno (los `plans` vienen de la migración).
Test: `tests/unit/db-seed.test.ts`.
