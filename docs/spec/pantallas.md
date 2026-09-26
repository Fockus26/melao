# Pantallas

Neutral a la plataforma: propósito, bloques en orden vertical, acciones y estados de cada
pantalla. El diseño visual de cada una está en `design/HANDOFF.md`; las rutas web entre
paréntesis son solo referencia.

**Navegación de la app:** barra inferior con 5 destinos — Inicio · Curso · Practicar · Pasos ·
Perfil (en pantallas ≥ 1024 px, navegación lateral). **Progreso** no ocupa un destino de la
barra: se abre desde Inicio ("Ver progreso") y desde Perfil; en la navegación lateral (≥ 1024 px)
es el ítem 6 (D028). La sesión de práctica y la lección ocupan la pantalla completa, sin barra.

**Estados comunes a toda pantalla con datos:** cargando (esqueleto por bloque) · vacío ·
error con reintento · sin conexión · sin suscripción activa (lleva a Planes).

## Público
| Pantalla | Bloques en orden | Acciones |
|---|---|---|
| Landing (`/`) | Hero · Cómo funciona · El coach (demo de la cuenta) · Repaso inteligente · Estilos · Planes · Preguntas frecuentes · Footer | Empieza (→ Registro), Ver planes |
| Planes (`/planes`) | Comparativa Básico / Consultoría | Elegir plan (→ Checkout) |
| Checkout (`/checkout`) | Resumen del plan y precio · Aviso "pago en integración: hoy se activa por $0" · Activar | Activar (servidor) → Bienvenida o Inicio |
| Legal (`/legal/…`) | Texto | — |

## Auth y onboarding
| Pantalla | Bloques | Estados |
|---|---|---|
| Entrar | Email, contraseña, "¿Olvidaste tu contraseña?", Google, enlace a registro | error de credenciales, enviando |
| Registro | Nombre, email, contraseña (requisitos visibles), Google, aceptar términos | email en uso, contraseña débil |
| Recuperar / Restablecer | Email → aviso de correo enviado · nueva contraseña | enlace vencido |
| Bienvenida | 1 Estilo(s) → 2 Rol (líder/seguidor, uno para todos) → 3 Nivel (desde cero / ya sé pasos) | — |

## App
| Pantalla | Bloques en orden | Estados propios |
|---|---|---|
| Inicio | Saludo · **Para hoy** (N pasos vencidos → Repasar) · Continuar lección · Práctica rápida · Pasos que más te cuestan | sin repasos pendientes; primer día (sin datos) |
| Curso | Selector de estilo · Camino: unidades con nodos de lección (bloqueada · disponible · actual · completada) · Nodo de repaso | curso sin publicar |
| Lección | Intro (título, pasos que se aprenden) → por paso: video del rol + descripción por tiempos → mini práctica (escenario) → práctica final (escenario) → calificación 1–4 por paso → resumen (pasos añadidos al repaso, siguiente lección) | video que no carga; salir a mitad (confirmar) |
| Práctica · configurador | Estilo · Canción (modo: elegir, dificultad, aleatoria, populares, favoritas) · Pasos (dificultad, aleatorio, favoritos, populares, según repaso, incluir "aprendiendo") · "Caben N figuras" · Empezar | sin pasos conocidos (→ Catálogo) |
| Práctica · canciones | Búsqueda · Filtros (dificultad, estilo) · Lista: título, artista, BPM, duración, dificultad, favorito | sin resultados; sin favoritas |
| Práctica · sesión (escenario) | Cabecera (estilo, BPM, salir) · Paso actual · **Cuenta grande** · Paso siguiente · Fila de tiempos · Próximos pasos · Progreso y tiempo · Controles (pausa, reiniciar, voz) | preparando audio; pausado; audio bloqueado (tocar para iniciar); pantalla sin Wake Lock |
| Práctica · resultado | Calificación 1–4 por paso distinto · Resumen (duración, pasos) · Otra vez / Terminar | — |
| Pasos (catálogo) | Búsqueda · Filtros (categoría, estado) · Lista por categoría: nombre, dificultad, estado (no lo sé · aprendiendo · me lo sé), favorito, próximo repaso | sin resultados |
| Paso (detalle) | Video (selector de rol si aplica) · Descripción por tiempos · Entrada → salida · Duración · Estado y favorito · Variaciones · Prerequisitos · Historial | paso libre (sin selector de rol) |
| Progreso | Más difíciles · Repasos próximos 7 días · Lecciones completadas · Sesiones recientes | sin datos aún |
| Perfil | Cuenta · Rol · Estilo por defecto · Coach (volumen, cuenta hablada, calibrar latencia) · Tema · Suscripción · Cerrar sesión | — |
| Calibrar audífonos | Antes de empezar → tocar a oído con 12 clics (4 de práctica) → resultado en ms → probar / guardar · ajuste fino ±10 ms (−300 a +300) | toques irregulares (desvío > 40 ms); sin audífonos Bluetooth (altavoz: no hace falta) |

## Admin (solo `admin`, tablet y escritorio)
| Pantalla | Bloques |
|---|---|
| Resumen | Contadores de contenido publicado y pendiente, avisos (canciones sin licencia, pasos sin video) |
| Estilo | Cuenta hablada, anticipación, bandas de BPM, posición inicial, posiciones |
| Pasos | Lista con filtros · Editor: datos, posiciones, categoría, dificultad, duración, videos por rol, clip de voz, variaciones, prerequisitos, publicar |
| Canciones | Lista · Editor: subida, datos, licencia, **analizador de ritmo** (onda, BPM detectado, marcar "1", anclas, inicio y fin de baile, previsualizar con la cuenta), publicar |
| Cursos | Constructor del camino (unidades, lecciones, orden) · Editor de lección (pasos, canción y frases de mini práctica, canción final) |
| Usuarios | Lista con plan y estado de suscripción (solo lectura) |

## Sistema
404 · error inesperado · sin conexión.

## Consultoría (v2)
| Pantalla | Bloques |
|---|---|
| Consultoría (alumno) | Conversación con el profesor · Enviar mensaje · Subir video de avance |
| Envío (alumno) | Video · Nota del profesor · Correcciones con marca de tiempo |
| Bandeja (admin) | Alumnos con envíos pendientes · Corregir: video + notas por tiempo + nota final |
