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

Valores iniciales según D011; editables por estilo en el panel.

## 2. Rejilla de beats de una canción

- `anchors`: lista de `{ beat: int, tMs: int }` ordenada por `beat`, mínimo 2.
- `beat 0` = el primer "1" en que se empieza a bailar (lo marca el admin).
- `t(b)`: interpolación lineal entre las dos anclas que rodean `b`. Fuera del rango, se
  extrapola con el periodo del segmento más cercano.
- `danceEndMs`: último instante en que se baila (lo marca el admin; por defecto, antes del
  final de la canción).
- `bpm` guardado = promedio informativo; **el motor usa la rejilla, no el BPM**.

## 3. Frases disponibles

- La frase de entrada ocupa los beats `-8 … -1`. Si `t(-8) < 0` (intro demasiado corta), la
  frase 0 se usa como entrada y el primer paso empieza en la frase 1.
- Frases disponibles `N` = cantidad de frases completas `p ≥ 0` tales que
  `t(8·(p+1)) ≤ danceEndMs` (contando desde el primer beat de baile).
- "Caben N figuras de 8 tiempos" en la UI = `N`.

## 4. Plan

Lista `[{ stepId, startPhrase, phrases }]`, contigua, que cubre exactamente `N` frases (ver
`combinaciones.md`).

## 5. Línea de tiempo

Lista de eventos ordenada por `tMs`:

```json
{ "tMs": 12345, "beat": 36, "beatInPhrase": 5, "kind": "call", "clip": "step.enchufla", "stepId": "…" }
```

| `kind` | Cuándo | `clip` |
|---|---|---|
| `count` | cada tiempo de `spokenBeats` que no esté silenciado por un anuncio | `count.<n>` |
| `call` | en `callBeat` de la **última frase** del paso en curso, si el siguiente paso es **distinto**; para el primer paso, en la frase de entrada | `step.<slug>` |
| `stepStart` | primer tiempo de cada paso (solo UI, sin audio) | `null` |
| `end` | fin de la última frase | `null` |

Reglas:
- Un anuncio silencia los `count` de `callBeat … callBeat + callSpanBeats − 1` de esa frase
  (salsa: suena "Enchufla" en el 5–6 y la cuenta sigue en el 7).
- Paso repetido (mismo `stepId` consecutivo): **no hay anuncio**, la cuenta sigue.
- `tMs` es relativo al inicio del archivo de audio, sin compensar latencia.

## 6. Requisitos del reproductor (cada plataforma)

- Programar los clips contra el **reloj de audio** (Web Audio `AudioContext.currentTime`;
  en nativo, el reloj del motor de audio), nunca con temporizadores de UI.
- Tolerancia: cada clip suena a ±20 ms de su `tMs` corregido.
- Aplicar la calibración del usuario: `tProgramado = tMs − latencyOffsetMs`.
- Pausa, reanudar y salir sin desfasar la cuenta.
- La UI (número grande, paso actual, siguiente, fila de tiempos) se actualiza con el mismo
  reloj; el tiempo activo se marca con color **y** subrayado.
- Pantalla encendida durante la sesión (Wake Lock o equivalente).
- Ajustes del perfil que filtran eventos: cuenta hablada sí/no, volumen de la voz.

## 7. Clips de voz

- `count.1 … count.8` y `step.<slug>` por paso, en Storage `voice-clips`.
- Duración: un número ≤ 250 ms (a 210 BPM un tiempo dura ~286 ms); un nombre de paso ≤ 2
  tiempos a la velocidad de la canción (el reproductor puede acelerar el clip hasta 1.25×).

Vectores: `vectors/ritmo-*.json` (07a).
