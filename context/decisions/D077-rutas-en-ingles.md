# D077 · Producto · Las URLs (rutas, query params y sus valores) van en inglés; los textos visibles, en español · Implementado

**Decisión:** toda URL de la app está en inglés, kebab-case y corta: segmentos de ruta,
nombres de parámetros de query y sus valores (incluidos los motivos de error del callback de
auth). Los textos que ve el alumno siguen en español (es-419). Es el mismo contrato para los
deep links de Android/iOS; `docs/spec/pantallas.md` nombra cada pantalla con su ruta. Las
decisiones anteriores que citan rutas en español (p. ej. D074 con `/bienvenida`) se leen con
esta tabla. Sin redirecciones de las rutas viejas: la app no está publicada.
**Por qué:** pedido de César ("entrar sería login, registrar register"). URLs en inglés son
las que esperan las plataformas nativas y las herramientas, y no llevan tildes ni eñes que
codificar.
**Alternativa descartada:** mantener las rutas viejas con redirección 308 a las nuevas: no hay
usuarios ni enlaces publicados que proteger, y duplicaría rutas en el proxy.

| Antes | Ahora |
|---|---|
| `/entrar` | `/login` |
| `/registro` | `/register` |
| `/recuperar` | `/forgot-password` |
| `/restablecer` | `/reset-password` |
| `/auth/salir` | `/auth/logout` |
| `/auth/callback` | (igual) |
| `/bienvenida` | `/welcome` |
| `/planes` | `/plans` |
| `/checkout` | (igual) |
| `/legal/terminos`, `/legal/privacidad` | `/legal/terms`, `/legal/privacy` |
| `/app/curso` | `/app/course` |
| `/app/curso/leccion/[id]` (lección, pantalla completa) | `/app/lessons/[id]` |
| `/app/practicar` | `/app/practice` |
| `/app/practicar/canciones` | `/app/practice/songs` |
| `/app/practicar/sesion` | `/app/practice/session` |
| `/app/practicar/resultado` | `/app/practice/result` |
| `/app/pasos`, `/app/pasos/[slug]` | `/app/steps`, `/app/steps/[slug]` |
| `/app/progreso` | `/app/progress` |
| `/app/perfil` | `/app/profile` |
| calibrar audífonos | `/app/profile/calibration` |
| `/admin/estilos` · `pasos` · `canciones` · `analizador` · `camino` · `usuarios` | `/admin/styles` · `steps` · `songs` · `rhythm-analyzer` · `course` · `users` |
| consultoría v2 (alumno, envío, bandeja del admin) | `/app/consulting`, `/app/consulting/submissions/[id]`, `/admin/consulting` (propuesta, aún sin pantalla) |
| muestras `/primitivos`, `/indicadores`, `/escenario` | `/primitives`, `/indicators`, `/stage` |
| `/layouts/pantalla-completa`, `/layouts/publico`, `/layouts/escenario` | `/layouts/fullscreen`, `/layouts/public`, `/layouts/stage` |
| `?estado=` (muestra `/stage`): `reproduciendo`, `anuncio`, `se-repite`, `preparando`, `bloqueado`, `pausada`, `pantalla`, `sin-voz`, `salir`, `nombre-largo`, `terminado` | `?state=`: `playing`, `announcement`, `repeat`, `preparing`, `blocked`, `paused`, `screen-off`, `no-voice`, `exit`, `long-name`, `ended` |
| `?activo=<último segmento>` (muestras de layout) | `?active=<último segmento>` (`course`, `practice`…) |
| `?cabecera=cuenta` | `?header=account` |
| `?error=` del callback: `enlace-vencido`, `sin-codigo`, `otro-navegador`, `google`, `acceso` | `link-expired`, `missing-code`, `other-browser`, `google`, `access-failed` |
| `/tokens`, `/spike/audio`, `/app`, `/admin`, `/layouts`, `/layouts/app`, `/layouts/admin`, `?next=` | (igual) |

Fuera del alcance: los `id` de ancla de las secciones de las muestras (`/indicators#progreso`,
`/tokens#escenario`) y los identificadores de código (nombres de componentes y funciones).
