# Pantallas

Neutral a la plataforma: propósito, bloques en orden vertical, acciones y estados de cada
pantalla. El diseño visual de cada una está en `design/HANDOFF.md`. Cada pantalla lleva su ruta
entre paréntesis: es la URL web y el deep link de Android/iOS, igual en las tres plataformas
(en inglés, kebab-case; los textos visibles van en español, D077).

**Navegación de la app:** barra inferior con 5 destinos — Inicio · Curso · Practicar · Pasos ·
Perfil (en pantallas ≥ 1024 px, navegación lateral). **Progreso** no ocupa un destino de la
barra: se abre desde Inicio ("Ver progreso") y desde Perfil; en la navegación lateral (≥ 1024 px)
es el ítem 6 (D028). La sesión de práctica y la lección ocupan la pantalla completa, sin barra.
Destino activo: el de camino más largo que es prefijo de la ruta actual, por segmentos (en una
ruta sin destino propio en la barra, como Progreso, queda activo Inicio); se marca con peso y
filete o fondo, nunca solo con color (D062).

**Estados comunes a toda pantalla con datos:** cargando (esqueleto por bloque) · vacío ·
error con reintento · sin conexión · sin suscripción activa (lleva a Planes).

## Público
| Pantalla | Bloques en orden | Acciones |
|---|---|---|
| Landing (`/`) | Hero · Cómo funciona · El coach (demo de la cuenta) · Repaso inteligente · Estilos · Planes · Preguntas frecuentes · Footer | Empieza (→ Registro), Ver planes |
| Planes (`/plans`) | Una card por plan activo de `plans` (por `sort_order`): nombre, precio + período ("al mes" / "al año", D084), 5 filas incluido / no incluido según `includes_coaching`. Con sesión: correo en el header y "Tu plan" en la card de la suscripción vigente (`active` con el período en curso). Sin planes activos: aviso | Elegir plan (→ `/checkout?plan=<slug>`; un invitado pasa por Entrar con `next`) · en el plan vigente: Ir a Inicio |
| Checkout (`/checkout?plan=<slug>`) | Exige sesión; sin `plan` o con uno inexistente o inactivo → Planes. Resumen (plan, precio / período, renovación mensual o anual, cancelación, "Total hoy US$0") · Aviso "El pago está en integración" · Casilla de términos y privacidad (obligatoria) · Activar plan. Si ese plan ya es el vigente: "Tu plan … está *activo*" | Activar → `activate-subscription` con la sesión del alumno (D086). Estados: activando · activo ("Tu plan … está *activo*" → Inicio, que desvía a Bienvenida si falta) · 409 `subscription_exists` (otro plan vigente, D049: aviso + Ir a Inicio) · 401 (sesión vencida: aviso + Entrar con `next`) · 404 `plan_not_found` (aviso + Ver planes) · error o sin conexión (aviso + Intentar de nuevo) |
| Legal (`/legal/terms`, `/legal/privacy`) | Título · Última actualización · Aviso "Texto provisional" (mientras sea borrador) · Secciones numeradas · Enlace al otro documento | — (enlazadas desde el footer público y el registro) |

## Auth y onboarding
| Pantalla | Bloques | Estados |
|---|---|---|
| Entrar (`/login`) | Google · "o con tu correo" · email, contraseña (+ "¿Olvidaste tu contraseña?") · Entrar · enlace a registro | error de credenciales, correo sin confirmar, límite de intentos, sin conexión, error del enlace/Google (llega del callback), enviando |
| Registro (`/register`) | Google · "o con tu correo" · nombre, email, contraseña con requisitos visibles (8+, minúscula, mayúscula, número y símbolo) · Crear cuenta (deshabilitado hasta cumplir, con el motivo en texto) · aviso de aceptación de términos y privacidad (vale también para Google, D074) · enlace a entrar | email en uso, contraseña débil, enviando, **revisa tu correo** (si el proyecto exige confirmar) |
| Recuperar (`/forgot-password`) | Email → aviso "si hay una cuenta, te enviamos un enlace" (igual exista o no la cuenta) | enviando, enlace vencido / abierto en otro navegador (llega del callback) |
| Restablecer (`/reset-password`) | Nueva contraseña con requisitos → Guardar → Inicio | sin sesión de recuperación = enlace vencido (→ pedir otro), enviando (campos deshabilitados + botón cargando), misma contraseña |
| Bienvenida (`/welcome`) | Logo + "Paso n de 3" + barra de 3 segmentos · 1 Estilo(s): los publicados, uno o varios (D082) → 2 Rol (líder/seguidor, uno para todos; se pide siempre, D080) → 3 Nivel (desde cero / ya sé pasos) · Atrás / Siguiente (deshabilitado hasta elegir, con el motivo en texto) · Empezar → `complete_onboarding` → Inicio (también "ya sé pasos" mientras no haya catálogo, D083). Exige sesión; con el onboarding hecho, a Inicio. Preselecciona lo que ya tenga el perfil. El foco va al título en cada paso | guardando, error al guardar (banner), estilo que dejó de estar publicado, estilos sin cargar |

**Flujo de acceso (todas las plataformas):** mismos proveedores (correo + contraseña y Google) y
mismos estados. Tras entrar o registrarse con sesión, al destino pedido (`next`, solo rutas
internas) o a Inicio; quien no hizo la Bienvenida (`profiles.onboarded_at` null) sale de
cualquier pantalla de la app a Bienvenida (D081). Con sesión, Entrar y Registro llevan
directo a Inicio. Sin sesión, cualquier pantalla de la app o del admin lleva a Entrar y vuelve
después a la pantalla pedida. Admin sin rol `admin`: "no encontrado" (D073). Cerrar sesión:
desde Inicio (provisional) y, cuando exista, Perfil. Contrato en `docs/spec/api.md` § Acceso.

## App
| Pantalla | Bloques en orden | Estados propios |
|---|---|---|
| Inicio (`/app`) | Fecha (zona del dispositivo) + "Hola, {nombre}" + chip de estilo → Sheet "Elige tu estilo" (estilos publicados, "Líder · n de N lecciones"; elegir escribe `profiles.default_style_id`; flechas cambian sin cerrar, clic cierra) · **Para hoy** (`due_steps`: N vencidos, "unos N min" = N, mínimo 3, hasta 3 nombres → Repasar `/app/practice?mode=review`) · **Continuar** (`course_path`: "Lección n de N", título, LessonProgress = lecciones completadas de la unidad actual → `/app/lessons/[id]`) · Práctica rápida (→ `/app/practice`) · **Lo que más te cuesta** (`hardest_steps`, 3 filas: nombre, "Última vez: Difícil · hace 2 días", dificultad → `/app/steps/[slug]`; "Ver progreso" → `/app/progress`) · Cerrar sesión al pie (hasta que exista Perfil). Estilo actual: `default_style_id`, si no el primero elegido, si no el primero publicado | primer día (Para hoy invita a la lección 1); sin repasos; curso terminado (→ Curso); estilo sin curso publicado; sin suscripción (Para hoy y Práctica rápida → "Activa tu plan" `/plans`, lo demás se ve); lo que más cuesta vacío |
| Curso (`/app/course`) | **Título = selector de estilo** (eyebrow "Tu curso · cambiar estilo", nombre del estilo actual, mismo Sheet "Elige tu estilo" de Inicio; mismo estilo actual que Inicio) · **Camino** (`course_path`): por unidad, cabecera ("Unidad n", título, "x de y" completadas) y un PathNode por lección con su estado (bloqueada · disponible · actual · completada, D092; la bloqueada sin acción) → `/app/lessons/[id]` · **Nodo de repaso** solo si `due_steps` trae vencidos: "N pasos vencen hoy · Unos N min", antes de la lección actual (con el curso terminado, al final) → Repasar `/app/practice?mode=review` · Acciones de la fila actual y del repaso: botón circular de 48 con ícono y nombre accesible ("Continuar lección 3: Enchufla", "Repasar: 6 pasos vencen hoy") por debajo de 1024 px, botón con texto desde 1024 | estilo sin curso publicado ("{estilo} todavía no tiene curso", el título sigue cambiando de estilo); sin estilos publicados; sin suscripción (el camino y las lecciones se ven; aviso "Activa tu plan" y el repaso lleva a `/plans`, D036); curso terminado (aviso + todas completadas, se pueden repetir); primer día ("Empezar" en vez de "Continuar") |
| Lección (`/app/lessons/[id]`) | Pantalla completa sin navegación; barra en todas las etapas: X (confirma salir → Curso; en el resumen sale sin preguntar) · LessonProgress "n / 6". **1 Intro:** "Lección n", título, "N pasos (nuevos si ninguno tiene tarjeta) · unos m minutos" (m = videos del rol + por paso una mini práctica de (entrada + `practice_phrases`) frases al BPM de la canción de práctica + la canción final hasta `dance_end_ms`, hacia arriba; sin alguna canción visible, se omite — D097), pasos numerados, Cómo va, Empezar. **2 Video del paso** (por paso): "Lección n · Paso i de N", segmentado de rol (no en paso libre ni estilo sin roles; por defecto el del perfil), marco con "Video en preparación" (placeholder), "Por tiempos" con `beat_notes`, Practicar este paso. **3 Mini práctica** (por paso): `plan-session` `{ mode: lesson, lessonId, focusStepId, songId = practice_song_id ?? final_song_id }` → escenario (motor falso sin audio mientras las canciones no tengan licencia, D009) con la barra de la lección en oscuro y Continuar. **4 Práctica final:** igual con `songId = final_song_id ?? practice_song_id`; se guarda su `sessionId`. **5 Calificación:** 1–4 por paso sin intervalos (D099); los que no vencen (tarjeta del rol con `due_at` > ahora) dicen "No vence hoy" y se pueden saltar; Terminar exige todos calificados o saltados y al menos uno calificado → `review-steps` `{ context: lesson, sessionId (final), lessonId, reviews }` (los saltados no van; rol del perfil si el estilo tiene roles). **6 Resumen:** "Al repaso" con la fecha de regreso de cada paso (`cards[].dueAt` de la respuesta; el saltado, la suya) por día de calendario del dispositivo, card de la siguiente lección (la siguiente de `course_path`) o "Terminaste todas las lecciones", Volver al curso | inexistente o no visible (404); **bloqueada** (`course_path` = `locked`): "Esta lección se abre al terminar la anterior" + Volver al curso (D098); **práctica que no arranca** (D098): canción no visible o sin preparar (`song_not_found`, `song_not_ready`, `song_too_short`, `style_not_ready`, `no_plan`) → "Práctica disponible pronto" (en la mini, "Seguir sin practicar"; la lección no se completa sin la final); `no_active_subscription` → Ver planes; `lesson_locked` → Volver al curso; sin conexión o error → Reintentar; error al calificar → aviso y reintentar; salir a mitad (confirmar); video que no carga (hoy, siempre en preparación) |
| Práctica · configurador (`/app/practice`) | Estilo · Canción (modo: elegir, dificultad, aleatoria, populares, favoritas) · Pasos (dificultad, aleatorio, favoritos, populares, según repaso, incluir "aprendiendo") · "Caben N figuras" · Empezar | sin pasos conocidos (→ Catálogo) |
| Práctica · canciones (`/app/practice/songs`) | Búsqueda · Filtros (dificultad, estilo) · Lista: título, artista, BPM, duración, dificultad, favorito | sin resultados; sin favoritas |
| Práctica · sesión, escenario (`/app/practice/session`) | Cabecera (estilo, BPM, salir) · Paso actual · **Cuenta grande** · Paso siguiente · Fila de tiempos · Próximos pasos · Progreso y tiempo · Controles (pausa, reiniciar, voz) | preparando audio; pausado; audio bloqueado (tocar para iniciar); pantalla sin Wake Lock |
| Práctica · resultado (`/app/practice/result`) | Calificación 1–4 por paso distinto · Resumen (duración, pasos) · Otra vez / Terminar | — |
| Pasos, catálogo (`/app/steps`) | Búsqueda · Filtros (categoría, estado) · Lista por categoría: nombre, dificultad, estado (no lo sé · aprendiendo · me lo sé), favorito, próximo repaso | sin resultados |
| Paso, detalle (`/app/steps/[slug]`) | Video (selector de rol si aplica) · Descripción por tiempos · Entrada → salida · Duración · Estado y favorito · Variaciones · Prerequisitos · Historial | paso libre (sin selector de rol) |
| Progreso (`/app/progress`) | Más difíciles · Repasos próximos 7 días · Lecciones completadas · Sesiones recientes | sin datos aún |
| Perfil (`/app/profile`) | Cuenta · Rol · Estilo por defecto · Coach (volumen, cuenta hablada, calibrar latencia) · Tema · Suscripción · Cerrar sesión | — |
| Calibrar audífonos (`/app/profile/calibration`) | Antes de empezar → tocar a oído con 12 clics (4 de práctica) → resultado en ms → probar / guardar · ajuste fino ±10 ms (−300 a +300) | toques irregulares (desvío > 40 ms); sin audífonos Bluetooth (altavoz: no hace falta) |

## Admin (solo `admin`, tablet y escritorio)

**Navegación del admin:** Resumen · Estilos · Pasos · Canciones · Analizador de ritmo · Camino ·
Usuarios, y al pie "Ver como alumno". Con etiquetas desde 1280 px; debajo, riel solo de íconos
cuyo nombre se muestra al enfocar o al pasar el puntero (D062).

| Pantalla | Bloques |
|---|---|
| Resumen (`/admin`) | Contadores de contenido publicado y pendiente, avisos (canciones sin licencia, pasos sin video) |
| Estilos (`/admin/styles`) | Cuenta hablada, anticipación, bandas de BPM, posición inicial, posiciones |
| Pasos (`/admin/steps`) | Lista con filtros · Editor: datos, posiciones, categoría, dificultad, duración, videos por rol, clip de voz, variaciones, prerequisitos, publicar |
| Canciones (`/admin/songs`; analizador de ritmo: `/admin/rhythm-analyzer`) | Lista · Editor: subida, datos, licencia, **analizador de ritmo** (onda, BPM detectado, marcar "1", anclas, inicio y fin de baile, previsualizar con la cuenta), publicar |
| Camino (`/admin/course`) | Constructor del camino (unidades, lecciones, orden) · Editor de lección (pasos, canción y frases de mini práctica, canción final) |
| Usuarios (`/admin/users`) | Lista con plan y estado de suscripción (solo lectura) |

## Sistema
Pantallas de estado (D109–D111): página entera sin navegación, logo arriba, contenido centrado
en vertical. Copy provisional (CONTENT_CHECKLIST filas 61–62). La cuenta `1 2 3 4 5 6 7 ·` es
decorativa (oculta a lectores de pantalla); el mensaje lo dan el eyebrow y el título.

| Pantalla | Bloques en orden | Acciones y estados |
|---|---|---|
| No encontrada (cualquier ruta inexistente, y cada recurso inexistente o sin permiso: lección, admin sin rol) | Logo (enlace al inicio) · cuenta con el 4 grande · filete · "Error 404" · título · texto · acciones. Desde 1024 px, dos columnas: cuenta \| texto | Con sesión: "Ir al inicio" (`/app`) y "Ver mi curso" (`/app/course`). Sin sesión: "Ir al inicio" (`/`) y "Entrar" (`/login`). Estado HTTP 404, no indexable |
| Error inesperado | Logo · cuenta "desacompasada" (sin el 4) · filete · "Error 500" · título · texto · "Código" con el identificador del error (solo si existe) · acciones | "Reintentar" (vuelve a pedir y pintar la pantalla que falló) · "Ir al inicio" (`/`). Si el dispositivo no tiene red en ese momento, muestra **Sin conexión** en su lugar, y cambia en vivo al volver la red |
| Sin conexión | Logo · ícono wifi tachado · filete · título · texto · aviso "si estabas en una práctica…" | Solo "Reintentar". Una copia sin conexión de la app (service worker) queda pendiente (D110) |
| Mantenimiento (cualquier ruta mientras dure) | Logo sin enlace · "Un momento…" · filete · título · texto · "Volvemos aproximadamente" + fecha y hora en la zona del dispositivo (solo si hay hora estimada) | Sin acciones. Estado HTTP 503 con `Retry-After` si hay hora; los enlaces de correo de auth siguen funcionando. En web: `MAINTENANCE_MODE=1` y `MAINTENANCE_UNTIL` (ISO) en el servidor; sin el modo, `/maintenance` es 404 |

**Indexación y compartir (D088):** se indexan solo las pantallas públicas (`/`, `/plans`,
`/login`, `/register`, `/legal/*`); la app, el admin, auth, Bienvenida y Checkout no. Un enlace
compartido muestra la imagen de marca (1200 × 630, D087). La app instalada (PWA en web) abre en
Inicio (`/app`) con el nombre "Melao"; en Android/iOS el ícono es la misma baldosa con la M.

## Consultoría (v2)
| Pantalla | Bloques |
|---|---|
| Consultoría, alumno (`/app/consulting`) | Conversación con el profesor · Enviar mensaje · Subir video de avance |
| Envío, alumno (`/app/consulting/submissions/[id]`) | Video · Nota del profesor · Correcciones con marca de tiempo |
| Bandeja, admin (`/admin/consulting`) | Alumnos con envíos pendientes · Corregir: video + notas por tiempo + nota final |
