# Brief de diseño — Melao

Eres un diseñador de producto senior. Vas a diseñar una app móvil de suscripción completa (web
mobile-first hoy; apps nativas de Android e iOS después, que reproducirán este mismo diseño)
para el proyecto descrito abajo, y además vas a entregar un documento de traspaso a desarrollo
(la sección 9 de este brief) que un desarrollador frontend usará para implementarlo sin volver
a consultarte.

## 1. El proyecto

**Qué es:** Melao es una app de suscripción para aprender y practicar salsa casino y merengue
(después se suman más estilos) desde el teléfono. Tiene un camino de lecciones en video, un
coach por voz que cuenta los tiempos de la canción real y anuncia el siguiente paso, y un
repaso espaciado que decide qué practicar según lo que a cada alumno le cuesta.
**Tipo:** dashboard/app mobile-first, con landing pública y panel de administración.
**Público:** alumnos de clases de salsa y merengue, principiantes e intermedios, que practican
solos en casa con el teléfono apoyado a 1–3 metros mientras bailan.
**Acción principal:** completar una práctica con el coach (dentro de una lección o en práctica
libre).
**Idioma / mercado:** español latinoamericano; precios en USD.

**Cómo funciona — lo que necesitas saber para diseñar con criterio:**

- **La cuenta.** La salsa se cuenta `1 2 3 · 5 6 7 ·` (el 4 y el 8 son pausas y no se dicen);
  el merengue, del 1 al 8. Una **frase** son 8 tiempos, y cada paso dura una o más frases.
- **El coach.** Anuncia el paso siguiente en el tiempo **5** de la última frase del paso
  actual: el nombre ocupa el 5–6 y la cuenta sigue en el 7. Si el paso se repite, no lo
  nombra y solo cuenta. Antes del primer paso hay una frase de cuenta de entrada.
- **La velocidad.** Las canciones van de ~120 a ~220 BPM: a 200 BPM la cuenta cambia unas 3
  veces por segundo. El número grande cambia; la pantalla nunca destella.
- **Distancia.** Mientras baila, el alumno mira el teléfono de lejos: la pantalla de práctica
  tiene que leerse a 2 metros (cuenta, paso actual, paso siguiente).
- **El repaso.** Al terminar una práctica, el alumno califica cada paso que bailó con cuatro
  botones —**Muy difícil · Difícil · Bien · Fácil**— y el sistema decide cuándo volver a
  mostrárselo (como Anki).
- **Los pasos.** Cada paso tiene categoría (base, vuelta, entrada, salida, figura, variación,
  paso libre), dificultad 1–5, duración en frases y una posición de entrada y otra de salida.
  Así las combinaciones siempre se pueden bailar. En el catálogo, cada paso tiene un estado:
  **no lo sé · aprendiendo · me lo sé**.
- **El rol.** El alumno elige por estilo si es **líder** o **seguidor** y ve el video de su
  rol. Los **pasos libres** (sin pareja) tienen un solo video y no muestran selector de rol.
- **La suscripción.** Plan **Básico** (~$20 USD/mes) y plan **Consultoría** (precio por
  definir; incluye chat con el profesor y corrección de videos del alumno). Todavía no hay
  cobro real: el checkout muestra el precio, avisa que el pago está en integración y activa
  la suscripción por $0.
- **Multiplataforma.** Este diseño se reimplementará en Kotlin (Android) y Swift (iOS). Usa
  patrones que existan en ambas plataformas (barra inferior, *sheets*, listas, segmentados) y
  no escondas información importante detrás de un *hover*.

## 2. Personalidad visual

**Dirección elegida:** "Salón editorial". Mezcla dos ideas:
- **(A) Editorial de gala:** serif en titulares, mucho blanco, filetes dorados finos.
- **(B) Estudio premium:** sans precisa en controles y datos, números grandes, progreso claro.

La pantalla de práctica pasa a un **modo escenario**: fondo negro, cuenta enorme en blanco y
paso siguiente en dorado.

**Antes de cerrar la dirección:** César vio una maqueta rápida de esta mezcla. Le gusta, pero
no le termina de convencer. Primero entrega 2–3 variantes dentro de esta dirección (ver 9.1)
para que elija; después se diseña todo con la elegida.

**Debe transmitir:** elegancia, calma, ritmo, oficio.
**NO debe parecer:**
- una app genérica de fitness (anillos de colores, gamificación ruidosa, confeti);
- un cartel folclórico recargado (art déco, ornamentos, kitsch "habanero");
- un juego infantil con mascota.

**Referencias:**
- Duolingo — específicamente por el **camino** de lecciones numeradas con desbloqueo
  progresivo y el nodo de repaso intercalado; no por su estética (colores saturados, mascota).
- Anki — por los **cuatro botones de calificación** después de cada repaso: rápidos, sin
  fricción, siempre en el mismo lugar.
- El "cantante" de una rueda de casino — el que anuncia la figura antes del 1: la pantalla de
  práctica es su equivalente visual.

## 3. Restricciones de marca

**Logo:** no existe. Diseña **3 propuestas** de monograma "M" elegante en negro, con el
wordmark "Melao". El dorado puede aparecer como acento mínimo, pero no es obligatorio. Ya se
descartaron tres ideas, así que propón algo distinto:
- una M didona con un rombo dorado;
- una M cursiva con un trazo dorado debajo;
- una M de línea fina rodeada por un arco dorado.

El logo debe leerse a 16 px (favicon) y en un ícono de app de 48 px. Entrega versiones sobre
blanco, sobre negro y monocroma.
**Colores obligatorios:** el blanco domina, el dorado es el acento y el negro acompaña. La
paleta de partida está en §4; puedes ajustar tonos siempre que se mantengan los ratios AA.
**Tipografía obligatoria:** ninguna. La propuesta de partida está en §4 y puedes sustituirla
justificando la elección.
**Otras:** la pantalla de práctica va siempre en negro, tanto en tema claro como oscuro.

## 4. Sistema visual de partida

### Paleta

Ratios calculados con la fórmula de WCAG 2.1. Si cambias un tono, recalcula y anota el ratio.

| Rol | Light | Dark | Uso |
|---|---|---|---|
| background | #FFFFFF | #0E0E0E | fondo de página |
| surface | #FAF8F4 | #161616 | cards, paneles, barra inferior |
| surface sunken | #F3EFE6 | #1E1E1E | marco de video, bloques hundidos |
| text primary | #111111 (18.9:1 sobre bg) | #F4F2ED (17.3:1) | texto principal |
| text secondary | #5A5A5A (≥ 6.0:1 en las 3 superficies) | #B3AEA4 (≥ 7.6:1) | texto de apoyo |
| text muted / placeholder | #6B6B6B (≥ 4.6:1 en las 3) | #948F85 (≥ 5.2:1) | metadatos |
| primary (botón) | #111111 con texto #FFFFFF (18.9:1) | #D6B25E con texto #111111 (9.3:1) | CTA principal, segmentado activo |
| gold 500 (decorativo) | #B8913A — 2.94:1 sobre blanco: **solo filetes y ornamentos**, nunca texto ni gráfico que informe | #B8913A | acento |
| gold 600 (gráfico informativo) | #A07D2C (3.84 / 3.62 / 3.35 sobre bg / surface / sunken) | — | progreso, nodo actual, ícono activo |
| gold 700 (texto dorado) | #8A6A1F (5.05 bg · 4.76 surface; falla sobre sunken) | #D6B25E (9.5 bg) | texto dorado |
| gold 800 (texto dorado sobre sunken o tinte) | #7A5C17 (5.43 sunken) | — | |
| gold tint (seleccionado) | #F3EAD3 (texto #111111 = 15.8) | #2A2413 (texto #F4F2ED = 13.8) | fondo de seleccionado |
| success / warning / error / info | #1E7A46 · #8A5300 · #B42318 · #1D5FA6 (≥ 4.6 en las 3 superficies) | #4CC38A · #E5A93B · #F07167 · #6CA8F0 (≥ 5.8) | estados, siempre con ícono o texto |
| border input | #858585 (≥ 3.2 en las 3) | #6E6E6E (≥ 3.3) | bordes de controles |
| divider (decorativo) | #E7E2D8 | #2A2A2A | separadores |
| focus ring | #111111, 2 px + 2 px de separación | #D6B25E | foco |
| escenario | — | fondo #0B0B0B · cuenta #FFFFFF (19.7) · siguiente #D6B25E (9.7) · tiempos inactivos #8A8A8A (5.7) | pantalla de práctica, en ambos temas |

**Dark mode:** sí, obligatorio.

### Tipografía
- **Titulares:** Fraunces (serif variable) — 400/500, cursiva 400 para acentos. Solo en
  titulares y pantallas de marca (landing, camino, título de lección).
- **Cuerpo, UI, cifras y cuenta:** Geist Sans — 400/500/600, con **cifras tabulares** en
  cuentas, BPM y duraciones.
- **Mono:** no se usa.
- **Escala de partida (mobile, base 16px):** display 40/44 · h1 32/38 · h2 24/30 · h3 20/26 ·
  body 16/24 · small 14/20 · caption 12/16. Escenario: cuenta 120–160px, paso siguiente
  28–32px, paso actual 20–22px. Nada por debajo de 12px.

### Espaciado y forma
- **Unidad base:** 4px; todo espaciado es múltiplo de esta unidad.
- **Radios:** 8px inputs y chips · 12px cards, botones y marco de video · 20px sheets y
  modales · pill para segmentados y nodos del camino.
- **Sombras:** ninguna decorativa; la jerarquía se hace con superficies y bordes finos.
  Elevación solo en sheets, popovers y modales.
- **Objetivos táctiles:** mínimo 48×48px.

## 5. Restricciones no negociables

Estas aplican a **todo** lo que diseñes. Un diseño que las incumple no se puede implementar
y hay que rehacerlo.

- **Contraste WCAG 2.1 AA.** Texto normal ≥ 4.5:1, texto grande (≥24px o ≥19px bold) ≥ 3:1,
  bordes de inputs e íconos informativos ≥ 3:1. Verifica cada par que uses y anota el ratio.
- **Ningún estado se comunica solo con color.** Error, éxito, seleccionado, activo: siempre
  color + ícono, texto o forma. (Ejemplo: el tiempo activo de la cuenta lleva color **y**
  subrayado; los nodos del camino usan forma o ícono además del dorado.)
- **Sin scroll horizontal a 320px de ancho.**
- **Estados de foco visibles y diseñados**, no el outline por defecto del navegador ni
  ausencia de él.
- **Se implementa con Tailwind + shadcn/ui (Radix).** Usa la escala de espaciado de Tailwind.
  Puedes proponer tratamientos visuales propios: el componente se escribe a medida.
- **Breakpoints objetivo:** 360 · 768 · 1024 · 1440 · 1920.
- **El dorado #B8913A es decorativo en claro.** El texto dorado usa gold 700/800 y los
  gráficos informativos, gold 600.
- **Objetivos táctiles ≥ 48px.**
- **La práctica se entiende sin audio y sin mirar.** Paso actual, paso siguiente y cuenta
  siempre visibles en pantalla, y el coach los dice en voz.
- **Nada destella.** La cuenta cambia de número sin flashes de pantalla ni pulsos de fondo;
  la animación se desactiva con `prefers-reduced-motion`.
- **Cifras tabulares** en todo número que cambia (cuenta, tiempo, BPM).
- **Nada importante depende de hover** (la app se reimplementará en nativo, sin cursor).
- **En escritorio, la app no se estira:** es una columna centrada con ancho máximo y, desde
  1024px, navegación lateral en vez de barra inferior. La landing y el panel admin sí usan
  el ancho completo.
- **Serif solo en titulares**, nunca en botones, controles, cifras ni cuenta.

## 6. Páginas y secciones

La estructura de cada pantalla está en orden vertical real.
- **App:** barra inferior con 5 destinos — Inicio · Curso · Practicar · Pasos · Perfil. La
  lección y la sesión de práctica ocupan la pantalla completa, sin barra.
- **Estados comunes a toda pantalla con datos:** cargando, vacío, error, sin conexión y sin
  suscripción.

### Landing — `/`
| # | Sección | Propósito | Contenido disponible | CTA |
|---|---|---|---|---|
| 1 | Hero | En 3 segundos: "aprende salsa con un coach que te canta los pasos" | placeholder | Empieza |
| 2 | Cómo funciona | Aprende (video) → practica (coach) → repasa (lo que te cuesta) | placeholder | — |
| 3 | El coach | Demo visual de la cuenta 1 2 3 · 5 6 7 con el paso anunciado | placeholder | — |
| 4 | Repaso inteligente | Explicar los 4 botones y que lo fácil se repite menos | placeholder | — |
| 5 | Estilos | Salsa casino y merengue; "próximamente" otros | placeholder | — |
| 6 | Planes | Básico y Consultoría, con precio | precio Básico ~$20 (por confirmar) | Elegir plan |
| 7 | Preguntas frecuentes | Dudas de pago, cancelación, nivel, roles | placeholder | — |
| 8 | Footer | Legal, contacto | placeholder | — |

### Planes — `/planes` y Checkout — `/checkout`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Comparativa | Básico vs Consultoría (qué incluye cada uno) | placeholder | Elegir |
| 2 | Checkout: resumen | Plan, precio mensual | placeholder | — |
| 3 | Checkout: aviso | "El pago está en integración: hoy tu plan se activa por $0" | placeholder | Activar plan |

### Auth — `/entrar` · `/registro` · `/recuperar` · `/restablecer`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Formulario | Email + contraseña (requisitos visibles en registro), aceptar términos en registro | placeholder | Entrar / Crear cuenta |
| 2 | Alternativa | Continuar con Google | — | Google |
| 3 | Enlaces | Olvidé mi contraseña, crear cuenta / ya tengo cuenta | — | — |

### Bienvenida (onboarding) — `/bienvenida`
| # | Paso | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Estilos | Elegir uno o varios (salsa casino, merengue) | placeholder | Siguiente |
| 2 | Rol por estilo | Líder o seguidor para cada estilo elegido | — | Siguiente |
| 3 | Nivel | "Empiezo desde cero" o "ya sé algunos pasos" (lleva al catálogo) | — | Empezar |

### Inicio — `/app`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Saludo | Nombre y estilo activo | placeholder | cambiar estilo |
| 2 | Para hoy | N pasos por repasar hoy | placeholder | Repasar |
| 3 | Continuar lección | La lección actual del camino | placeholder | Continuar |
| 4 | Práctica rápida | Canción aleatoria con mis pasos | — | Practicar |
| 5 | Lo que más te cuesta | 3–5 pasos con peor calificación | placeholder | Ver progreso |

### Curso (camino) — `/app/curso`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Selector de estilo | Cambiar de curso | — | — |
| 2 | Camino | Unidades con nodos de lección numerados: bloqueada · disponible · actual · completada | placeholder | abrir lección |
| 3 | Nodo de repaso | Aparece cuando hay pasos vencidos | — | Repasar |

### Lección — `/app/curso/leccion/[id]` (pantalla completa, flujo por pasos)
| # | Etapa | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Intro | Número y título, pasos que se aprenden, duración | placeholder | Empezar |
| 2 | Video del paso | Video del rol elegido (selector líder/seguidor si aplica) + descripción por tiempos | placeholder | Practicar este paso |
| 3 | Mini práctica | Escenario, pocas frases con este paso | — | Siguiente paso |
| 4 | Práctica final | Escenario con todos los pasos de la lección | — | — |
| 5 | Calificación | Muy difícil · Difícil · Bien · Fácil por cada paso | — | Guardar |
| 6 | Resumen | Pasos añadidos al repaso, siguiente lección | — | Continuar |
Indicador de progreso de la lección visible en todas las etapas; salir a mitad pide
confirmación.

### Práctica · configurador — `/app/practicar`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Estilo | Salsa casino / merengue | — | — |
| 2 | Canción | Modo: elegir una · por dificultad (fácil/media/difícil) · aleatoria · populares · favoritas | placeholder | Elegir canción |
| 3 | Pasos | Dificultad · aleatorio · favoritos · populares · según mi repaso · incluir "aprendiendo" | — | — |
| 4 | Resumen | "Caben 24 figuras de 8 tiempos" + duración y BPM | — | Empezar |

### Práctica · canciones — `/app/practicar/canciones`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Búsqueda y filtros | Por título/artista, dificultad, estilo | — | — |
| 2 | Lista | Título, artista, BPM, duración, dificultad (texto + forma), favorito | placeholder | elegir |

### Práctica · sesión (modo escenario) — `/app/practicar/sesion`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Cabecera | Estilo, BPM, salir | — | Salir |
| 2 | Paso actual | Qué estás bailando | — | — |
| 3 | Cuenta | El número del tiempo actual, enorme | — | — |
| 4 | Paso siguiente | Lo que viene, en dorado, visible desde el anuncio | — | — |
| 5 | Fila de tiempos | 1 2 3 · 5 6 7 · con el activo marcado (color + subrayado) | — | — |
| 6 | Próximos pasos | Lista corta de lo que sigue | — | — |
| 7 | Progreso | Barra y tiempo transcurrido / total | — | — |
| 8 | Controles | Pausa, reiniciar, voz (volumen / silenciar cuenta) | — | Pausa |
Se usa igual dentro de la lección (mini práctica y práctica final). Diseña también el
horizontal (teléfono acostado).

### Práctica · resultado — `/app/practicar/resultado`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Calificación | Los 4 botones por cada paso distinto (los no vencidos se pueden saltar) | — | Guardar |
| 2 | Resumen | Duración, pasos bailados | — | Otra vez · Terminar |

### Pasos (catálogo) — `/app/pasos` y detalle — `/app/pasos/[id]`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Búsqueda y filtros | Categoría, estado (no lo sé · aprendiendo · me lo sé) | — | — |
| 2 | Lista por categoría | Nombre, dificultad, estado, favorito, próximo repaso | placeholder | abrir |
| 3 | Detalle: video | Video del rol (sin selector en pasos libres) | placeholder | — |
| 4 | Detalle: datos | Descripción por tiempos, posición de entrada → salida, duración en frases | placeholder | — |
| 5 | Detalle: estado | Cambiar estado, favorito | — | — |
| 6 | Detalle: relaciones | Variaciones y prerequisitos | placeholder | — |
| 7 | Detalle: historial | Calificaciones pasadas y próximo repaso | — | — |

### Progreso — `/app/progreso`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Lo que más te cuesta | Pasos con peor calificación | — | Practicar estos |
| 2 | Próximos repasos | Cuántos vencen cada día de los próximos 7 | — | — |
| 3 | Lecciones | Completadas / total | — | — |
| 4 | Sesiones recientes | Fecha, canción, duración | — | — |

### Perfil — `/app/perfil`
| # | Sección | Propósito | Contenido | CTA |
|---|---|---|---|---|
| 1 | Cuenta | Nombre, email | — | Editar |
| 2 | Rol por estilo | Líder / seguidor | — | — |
| 3 | Coach | Volumen de voz, cuenta hablada sí/no, calibrar latencia (audífonos Bluetooth) | — | Calibrar |
| 4 | Tema | Sistema / claro / oscuro | — | — |
| 5 | Suscripción | Plan, estado, cambiar a Consultoría | — | Cambiar plan |
| 6 | Salir | Cerrar sesión | — | Cerrar sesión |

### Panel admin — `/admin/…` (tablet y escritorio: diseña en 1440 y 1024)
Fidelidad: **alta** en el analizador de ritmo y el constructor del camino; en el resto basta
con definir bien el patrón lista + editor y aplicarlo.
| # | Pantalla | Contenido |
|---|---|---|
| 1 | Resumen | Contenido publicado/pendiente, avisos (canciones sin licencia, pasos sin video) |
| 2 | Estilo | Cuenta hablada, anticipación del anuncio, bandas de BPM por dificultad, posiciones |
| 3 | Pasos: lista + editor | Datos, categoría, dificultad, duración, entrada/salida, videos por rol o único, clip de voz, variaciones, prerequisitos, publicar |
| 4 | Canciones: lista + editor | Subida, datos, licencia (fuente, notas, documento, vencimiento), publicar |
| 5 | **Analizador de ritmo** | Forma de onda, BPM detectado, marcar el "1" (tocar al ritmo), anclas donde la canción acelera, inicio y fin de baile, reproducir con la cuenta encima |
| 6 | **Constructor del camino** | Unidades y lecciones ordenables; editor de lección: pasos, canción y frases de la mini práctica, canción final |
| 7 | Usuarios | Lista con plan y estado de suscripción (solo lectura) |

### Sistema
404 · error inesperado · sin conexión.

### Consultoría (fase 2 — diséñala ahora con prioridad baja)
| # | Pantalla | Contenido |
|---|---|---|
| 1 | Consultoría (alumno) | Conversación con el profesor, enviar mensaje, subir video de avance |
| 2 | Envío (alumno) | Video, nota del profesor, correcciones con marca de tiempo sobre el video |
| 3 | Bandeja (profesor) | Alumnos con envíos pendientes; corregir: video + notas por tiempo + nota final |

## 7. Estados y casos que también hay que diseñar

- [x] Estados vacíos (sin repasos para hoy, sin favoritas, búsqueda sin resultados, primer día sin datos, curso sin publicar)
- [x] Estados de carga (skeletons por sección, no un spinner global; "preparando audio" antes de la sesión)
- [x] Estados de error (404, 500, fallo de red, video que no carga, formulario rechazado)
- [x] Formularios: reposo, foco, relleno, error con mensaje, éxito, deshabilitado, enviando
- [x] Botones: reposo, hover, foco, activo, cargando, deshabilitado
- [x] Navegación: barra inferior (mobile) y lateral (≥1024) con destino activo
- [x] Autenticado vs. anónimo, y autenticado **sin suscripción activa** (contenido bloqueado → planes)
- [x] Lección bloqueada, disponible, actual y completada en el camino
- [x] Sesión: pausada, audio bloqueado por el navegador ("toca para empezar"), pantalla que no puede mantenerse encendida, salir a mitad (confirmar)
- [x] Sin conexión en cualquier pantalla de la app
- [x] Tema claro y oscuro en todo; escenario igual en ambos
- [x] Contenido extremo: nombre de paso de 32 caracteres ("Dile que no con vuelta de la dama"), título de canción de 60 caracteres, catálogo de 1 y de 80 pasos, curso de 40 lecciones, canción de 90 segundos (pocas figuras) y de 7 minutos, BPM de 120 a 220, nombre de alumno de 40 caracteres

## 8. Contenido

**Contenido real disponible:** ninguno todavía (ni textos, ni videos, ni canciones, ni fotos,
ni logo).
**Pendiente:** todo va con placeholder.

Para lo pendiente, usa texto realista en español con la longitud que tendrá el contenido
final — **nunca lorem ipsum**. Un diseño validado con lorem se rompe al llegar el copy real,
y esa ruptura la paga el desarrollador.

Placeholders de referencia:
- **Pasos de salsa casino:** Guapea, Dile que no, Enchufla, Dile que sí, Exhibe, Sombrero,
  Setenta, Paso libre.
- **Pasos de merengue:** Básico, Vuelta de la dama, Paseo, Cruce, Vuelta doble.
- **Canciones:** títulos ficticios, marcados como placeholder (p. ej. "Sabor de madrugada —
  Conjunto Brisa"). BPM entre 120 y 220, duraciones de 3 a 6 minutos.
- **Videos:** marco con póster neutro y duración (0:45–2:30).

---

## 9. Entregable — OBLIGATORIO

Entrega **dos cosas**. La segunda es tan importante como la primera.

### 9.1 El diseño

**Ronda 1 — exploración (antes de todo lo demás):**
- **2–3 variantes** de la dirección de §2, cada una aplicada a 4 pantallas clave: Curso
  (camino), Lección (video del paso), Sesión (escenario) y el Hero de la landing. En 390, tema
  claro y oscuro.
- **3 propuestas de logo** (§3).

César elige una variante y un logo; después sigue la ronda 2.

**Ronda 2 — diseño completo:** todas las páginas de la sección 6 en desktop 1440 · mobile
390 (el admin en 1440 · 1024), en tema claro y oscuro, con los estados de la sección 7.

### 9.2 `HANDOFF.md` — documento de traspaso a desarrollo

Un documento en Markdown, autocontenido, escrito para un desarrollador frontend senior que
**no vio el diseño contigo y no te puede preguntar nada**. Todo lo que no esté aquí, lo va a
tener que inventar — y ahí es donde el diseño se desvía.

Estructura exacta:

**1. Tokens** — tabla completa de valores finales, con nombre de token, valor y uso:
colores (light y dark, con el ratio de contraste verificado de cada par usado), escala
tipográfica (tamaño / interlineado / peso / tracking por rol: display, h1-h6, body, small,
caption), espaciado, radios, sombras, duraciones y curvas de animación, z-index.

**2. Componentes** — uno por uno, y para cada uno:
   - Nombre, y si mapea a un componente de shadcn/ui, cuál
   - Anatomía (qué partes lo componen)
   - Variantes y tamaños
   - **Todos** los estados: reposo, hover, foco, activo, deshabilitado, cargando, error
   - Medidas concretas: padding, altura, gap, tamaño de ícono, grosor de borde
   - Comportamiento responsive
   - Notas de accesibilidad: rol, nombre accesible esperado, comportamiento de teclado

**3. Secciones** — una por una, en el orden de la sección 6, y para cada una:
   - Estructura del layout (grid o flex, columnas, gaps, ancho máximo)
   - Qué componentes usa
   - Espaciado vertical antes y después
   - **Cómo se reordena o colapsa en cada breakpoint** (esto explícito, no "es responsive")
   - Contenido: qué es texto real y qué es placeholder

**4. Grid y layout global** — ancho máximo del contenedor, número de columnas y gutters por
breakpoint, padding lateral por breakpoint, ritmo vertical entre secciones.

**5. Assets** — lista de todo lo que hay que exportar o conseguir: imágenes (con dimensiones
y formato), íconos (con el set del que salen), ilustraciones, logo en sus variantes.

**6. Movimiento** — qué anima, con qué duración y curva, y qué se apaga bajo
`prefers-reduced-motion`.

**7. Orden de implementación** — la secuencia recomendada para construirlo, de tokens a
componentes base a secciones a páginas, con las dependencias entre pasos señaladas.

**8. Decisiones y trampas** — las decisiones de diseño que tomaste y por qué (para que el
desarrollador no las "corrija" sin querer), más lo que es fácil implementar mal: qué debe
verse idéntico entre secciones, qué espaciado es intencional aunque parezca inconsistente,
qué no debe convertirse en un componente compartido aunque se parezca a otro.

**9. Preguntas abiertas** — lo que no pudiste decidir por falta de información, con tu
recomendación para cada una.

Formato de todo el handoff: valores concretos, nunca adjetivos. "24px" y no "un espacio
generoso". "#1E293B sobre #F8FAFC, ratio 14.8:1" y no "gris oscuro sobre gris claro".

### 9.3 `tokens.json` — los mismos tokens, legibles por máquina

Además del handoff, entrega los tokens finales en un archivo JSON con formato **W3C Design
Tokens** (cada token con `$value` y `$type`), agrupados en: `color.light`, `color.dark`,
`color.stage`, `typography`, `spacing`, `radius`, `shadow`, `motion`, `zIndex`. Los nombres
tienen que coincidir exactamente con los de la sección 1 del handoff. De este archivo se
generarán los estilos web y, después, los temas de Android e iOS.
