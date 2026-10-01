# Motor de ritmo y coach

El backend (Edge Function `plan-session`) calcula el plan y la **línea de tiempo**; cada
cliente (web, Android, iOS) solo reproduce la canción y dispara clips en esos tiempos
(D003). Este documento define ambos lados.

## 1. Configuración del estilo

| Campo | Salsa casino | Merengue | Qué es |
|---|---|---|---|
| `beatsPerPhrase` | 8 | 8 | tiempos por frase |
| `spokenBeats` | `[1,2,3,5,6,7]` | `[1,2,3,4,5,6,7,8]` | tiempos que el coach dice |
| `callBeat` | 5 | 5 | tiempo (1-based) de la última frase en que suena el anuncio |
| `callSpanBeats` | 2 | 2 | tiempos que ocupa el nombre (se silencian esos números) |
| `leadInPhrases` | 1 | 1 | frases de cuenta antes del primer paso |

Valores iniciales según D011; editables por estilo en el panel. Límites (los mismos `check`
de `dance_styles`): `beatsPerPhrase` 2–16; `spokenBeats` entre 1 y `beatsPerPhrase` tiempos
distintos, cada uno en `1…beatsPerPhrase`; `callBeat + callSpanBeats − 1 ≤ beatsPerPhrase`;
`callSpanBeats` 1–4; `leadInPhrases` 0–4. Core: `_shared/core/style.ts`.

## 2. Rejilla de beats de una canción

- `anchors`: lista de `{ beat: int, tMs: int }` ordenada por `beat` sin repetir, con `tMs`
  estrictamente creciente, mínimo 2.
- `beat 0` = el primer "1" en que se empieza a bailar (lo marca el admin).
- `t(b)`: interpolación lineal entre las dos anclas que rodean `b`. Fuera del rango, se
  extrapola con el periodo del segmento más cercano. En un ancla intermedia se usa el
  segmento que empieza en ella (da lo mismo: vale su `tMs`). Fórmula exacta, en doble
  precisión y sin redondear, con `a`, `c` las anclas del segmento:
  `t(b) = a.tMs + ((b − a.beat) · (c.tMs − a.tMs)) / (c.beat − a.beat)`.
- Inversa (`msToBeat`, para la UI): la misma interpolación con los ejes cambiados.
- `danceEndMs`: último instante en que se baila (lo marca el admin; por defecto, antes del
  final de la canción).
- `bpm` guardado = promedio informativo; **el motor usa la rejilla, no el BPM**.
- Core: `_shared/core/grid.ts`.

## 3. Frases disponibles

Con `B = beatsPerPhrase` y `L = leadInPhrases` (salsa y merengue: `B = 8`, `L = 1`):

- La entrada son las `L` frases justo antes del primer paso: si el plan empieza en la frase
  0, los beats `-8 … -1`. Si `t(-8) < 0` (intro demasiado corta), la frase 0 se usa como
  entrada y el primer paso empieza en la frase 1.
- En general (D039), el desplazamiento `k` es el menor entero `≥ 0` con `t(B·(k − L)) ≥ 0`: el
  plan empieza en la frase `startPhrase = k`. Con `L = 0`, `k = 0` salvo que el propio beat 0
  caiga antes del audio.
- Frases completas desde el beat 0: `M` = cantidad de frases `p ≥ 0` con
  `t(B·(p+1)) ≤ danceEndMs` (el borde cuenta).
- Frases disponibles `N = max(0, M − k)`: las frases donde van pasos, `startPhrase … startPhrase
  + N − 1`. Las que se comió la entrada no cuentan (D039).
- "Caben N figuras de 8 tiempos" en la UI = `N`.
- Core: `_shared/core/phrases.ts` (`phraseWindow` → `{ startPhrase, phrases: N }`).

## 4. Plan

Lista `[{ stepId, startPhrase, phrases }]`, contigua, que empieza en `startPhrase` (§3) y cubre
exactamente `N` frases (ver `combinaciones.md`). Para la línea de tiempo cada elemento lleva
además el `slug` del paso (`{ stepId, slug, startPhrase, phrases }`), que agrega quien arma la
sesión. `phrases ≥ 1` entero; plan vacío → línea de tiempo vacía.

## 5. Línea de tiempo

Lista de eventos ordenada por `tMs` (en el mismo beat: `stepStart`, `call`, `count`, `end`;
D041). Core: `_shared/core/timeline.ts`.

```json
{ "tMs": 12345, "beat": 36, "beatInPhrase": 5, "kind": "call", "clip": "step.enchufla", "stepId": "…" }
```

| `kind` | Cuándo | `clip` |
|---|---|---|
| `count` | cada tiempo de `spokenBeats` que no esté silenciado por un anuncio | `count.<n>` |
| `call` | en `callBeat` de la **última frase** del paso en curso, si el siguiente paso es **distinto**; para el primer paso, en la última frase de entrada (con `leadInPhrases = 0` no hay entrada ni anuncio del primer paso) | `step.<slug>` |
| `stepStart` | primer tiempo de cada elemento del plan, también si repite el paso anterior (solo UI, sin audio) | `null` |
| `end` | fin de la última frase | `null` |

Reglas:
- Un anuncio silencia los `count` de `callBeat … callBeat + callSpanBeats − 1` de esa frase
  (salsa: suena "Enchufla" en el 5–6 y la cuenta sigue en el 7).
- Paso repetido (mismo `stepId` consecutivo): **no hay anuncio**, la cuenta sigue.
- `tMs` es relativo al inicio del archivo de audio, sin compensar latencia.
- `tMs` va en **ms enteros**: `tMs = floor(t(beat) + 0.5)` (mitad hacia arriba), igual en
  todas las plataformas (D040). `beat` es entero (negativo en la entrada) y `beatInPhrase`
  es 1-based también ahí (módulo positivo: el beat `-1` es el tiempo `B`).
- `stepId`: en `count` y `stepStart`, el paso en curso (`null` en la entrada); en `call`, el
  paso que se anuncia; en `end`, `null`.

## 6. Requisitos del reproductor (cada plataforma)

- Programar los clips contra el **reloj de audio** (Web Audio `AudioContext.currentTime`;
  en nativo, el reloj del motor de audio), nunca con temporizadores de UI.
- Canción y clips en **el mismo** motor de audio (un `AudioContext`; en nativo, un solo
  motor): comparten la latencia de salida. Los clips se programan en su `tMs` **sin
  restar latencia**; tolerancia: cada clip suena a ±20 ms de su `tMs` respecto de la canción.
- La calibración del usuario (`latencyOffsetMs`, guardada por dispositivo de salida) se
  aplica **solo a lo que no sale por el audio**: la UI marca cada evento cuando la posición
  del reloj llega a `tMs + latencyOffsetMs`, y los toques del usuario se comparan contra
  `tMs + latencyOffsetMs`. Nunca se resta a los clips: con Bluetooth (~340 ms) la cuenta se
  adelantaría un tiempo entero (D032).
- Sin calibración, `latencyOffsetMs` = la latencia que reporta la plataforma
  (`outputLatency + baseLatency` en web). En altavoz basta; con Bluetooth el navegador la
  subestima (~150 ms reportados vs. ~340 ms reales en Android): el reproductor ofrece
  calibrar al detectar audífonos o si el usuario lo pide desde el Perfil.
- Calibrar: ≥ 16 toques sobre la pista sola, descartando los 2 primeros y los atípicos;
  si la desviación supera ~60 ms, se pide repetir.
- Pausa, reanudar y salir sin desfasar la cuenta. App en segundo plano (pestaña oculta) o
  audio interrumpido por el sistema (llamada, otra app) → pausa en la posición exacta del
  reloj; se reanuda a mano.
- La calibración guardada que se usa es la del alumno en esa plataforma (`audio_latency`,
  `platform`), la más reciente (D124); mientras no se distinga el dispositivo de salida, no se
  filtra por `device_key`.
- La UI (número grande, paso actual, siguiente, fila de tiempos) se actualiza con el mismo
  reloj; el tiempo activo se marca con color **y** subrayado.
- Pantalla encendida durante la sesión (Wake Lock o equivalente); se vuelve a pedir al
  regresar a la app.
- Una sola canción decodificada a la vez (una canción de 5 min ocupa ~116 MB en PCM a
  48 kHz) y se libera al salir de la sesión. Decodificar tarda segundos (~2.7 s para 5 min
  en Android): la canción se prepara antes de *Iniciar*, con estado de carga visible.
- Ajustes del perfil que filtran eventos: cuenta hablada sí/no, volumen de la voz.
- **Pista sintética (D121)**, mientras ninguna canción tiene audio con licencia (D009): el
  reproductor toca, en el mismo reloj, una campana en cada tiempo entero de la rejilla
  (`t ∈ [0, duración)`, también antes del primer ancla) y un bombo en el tiempo 1 (fuerte) y
  en el `beatsPerPhrase/2 + 1` (suave), programados en la ventana del bucle como los clips.
  Sin clips de voz, `count.<n>` suena como un tono por número y `step.<slug>` como dos tonos
  de ~2 tiempos. La duración es la de la sesión del escenario (hasta 1.5 s después de `end`).
  Web: `lib/player/` (`TrackSource`: hoy `SyntheticTrack`; `FileTrack` cuando haya audio).

### 6.1 Vista del escenario (qué pinta la UI)

Cada plataforma deriva la vista con la misma función pura sobre la línea de tiempo, la
rejilla y el plan (con nombres), en `t = posición del reloj − latencyOffsetMs`
(web: `lib/stage/view.ts` › `stageViewAt`; D067):

- **Tiempo activo:** el mayor beat `b` con `floor(t(b) + 0.5) ≤ t` (el mismo redondeo que
  los `tMs`, D040): la UI cambia de tiempo en el mismo ms que el evento, también en los
  tiempos que no se cuentan (4 y 8 en salsa), que no tienen evento.
- **Sección:** `intro` antes del primer evento · `leadIn` en las frases de entrada ·
  `step` dentro de un elemento del plan · `end` desde el evento `end`.
- **Paso y frase:** el elemento del plan cuya frase contiene `b`; "frase i de n" dentro de
  ese elemento (o de la entrada).
- **Anunciado:** el último `call`/`stepStart` con `tMs ≤ t` es un `call` ("SIGUIENTE ·
  EN EL 1"). Si el siguiente elemento repite el paso: "SE REPITE", sin anuncio.
- **Después:** hasta 3 pasos tras el siguiente, sin repeticiones consecutivas.
- Estados del reproductor que la UI distingue: preparando (con %), bloqueado (hace falta un
  toque), sonando, en pausa, terminado; más voz sí/no y "la pantalla puede apagarse".
- Lector de pantalla: solo se anuncia el cambio de paso o de estado, nunca la cuenta.

Tests: `tests/unit/stage-view.test.ts` recorre los mismos `vectors/timeline-*.json`.

## 7. Clips de voz

- `count.1 … count.8` y `step.<slug>` por paso, en Storage `voice-clips`.
- Duración: un número ≤ 250 ms (a 210 BPM un tiempo dura ~286 ms); un nombre de paso ≤ 2
  tiempos a la velocidad de la canción (el reproductor puede acelerar el clip hasta 1.25×).

Vectores: `vectors/ritmo-*.json` (§2–§3) y `vectors/timeline-*.json` (§5); runner en
`tests/unit/core-ritmo-vectors.test.ts`.
