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
| Planes (`/plans`) | Comparativa Básico / Consultoría | Elegir plan (→ Checkout) |
| Checkout (`/checkout`) | Resumen del plan y precio · Aviso "pago en integración: hoy se activa por $0" · Activar | Activar (servidor) → Bienvenida o Inicio |
| Legal (`/legal/terms`, `/legal/privacy`) | Texto | — |

## Auth y onboarding
| Pantalla | Bloques | Estados |
|---|---|---|
| Entrar (`/login`) | Google · "o con tu correo" · email, contraseña (+ "¿Olvidaste tu contraseña?") · Entrar · enlace a registro | error de credenciales, correo sin confirmar, límite de intentos, sin conexión, error del enlace/Google (llega del callback), enviando |
| Registro (`/register`) | Google · "o con tu correo" · nombre, email, contraseña con requisitos visibles (8+, una letra, un número) · Crear cuenta (deshabilitado hasta cumplir, con el motivo en texto) · aviso de aceptación de términos y privacidad (vale también para Google, D074) · enlace a entrar | email en uso, contraseña débil, enviando, **revisa tu correo** (si el proyecto exige confirmar) |
| Recuperar (`/forgot-password`) | Email → aviso "si hay una cuenta, te enviamos un enlace" (igual exista o no la cuenta) | enviando, enlace vencido / abierto en otro navegador (llega del callback) |
| Restablecer (`/reset-password`) | Nueva contraseña con requisitos → Guardar → Inicio | sin sesión de recuperación = enlace vencido (→ pedir otro), enviando (campos deshabilitados + botón cargando), misma contraseña |

**Flujo de acceso (todas las plataformas):** mismos proveedores (correo + contraseña y Google) y
mismos estados. Tras entrar o registrarse con sesión, al destino pedido (`next`, solo rutas
internas) o a Inicio (aún no hay Bienvenida, D074). Con sesión, Entrar y Registro llevan
directo a Inicio. Sin sesión, cualquier pantalla de la app o del admin lleva a Entrar y vuelve
después a la pantalla pedida. Admin sin rol `admin`: "no encontrado" (D073). Cerrar sesión:
desde Inicio (provisional) y, cuando exista, Perfil. Contrato en `docs/spec/api.md` § Acceso.
| Bienvenida (`/welcome`) | 1 Estilo(s) → 2 Rol (líder/seguidor, uno para todos) → 3 Nivel (desde cero / ya sé pasos) | — |

## App
| Pantalla | Bloques en orden | Estados propios |
|---|---|---|
| Inicio (`/app`) | Saludo · **Para hoy** (N pasos vencidos → Repasar) · Continuar lección · Práctica rápida · Pasos que más te cuestan | sin repasos pendientes; primer día (sin datos) |
| Curso (`/app/course`) | Selector de estilo · Camino: unidades con nodos de lección (bloqueada · disponible · actual · completada) · Nodo de repaso | curso sin publicar |
| Lección (`/app/lessons/[id]`) | Intro (título, pasos que se aprenden) → por paso: video del rol + descripción por tiempos → mini práctica (escenario) → práctica final (escenario) → calificación 1–4 por paso → resumen (pasos añadidos al repaso, siguiente lección) | video que no carga; salir a mitad (confirmar) |
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
404 · error inesperado · sin conexión.

## Consultoría (v2)
| Pantalla | Bloques |
|---|---|
| Consultoría, alumno (`/app/consulting`) | Conversación con el profesor · Enviar mensaje · Subir video de avance |
| Envío, alumno (`/app/consulting/submissions/[id]`) | Video · Nota del profesor · Correcciones con marca de tiempo |
| Bandeja, admin (`/admin/consulting`) | Alumnos con envíos pendientes · Corregir: video + notas por tiempo + nota final |
