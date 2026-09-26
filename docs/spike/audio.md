# Spike de audio (07a·1) — protocolo de prueba en teléfonos

Página: **`/spike/audio`** (herramienta interna, `noindex`, sin enlaces). Código: `lib/audio/`
(motor, sin React) y `app/spike/audio/` (la página). Decisiones: D030 (planificador) y D031
(fuente de audio del spike) en `context/decisions/06-audio.md`.

Pregunta que responde: **¿la web aguanta el reproductor del coach en un Android de gama media
y en un iPhone?** Memoria de una canción decodificada (~85 MB en PCM), deriva entre canción y
clips, latencia con Bluetooth, Wake Lock y reanudar tras bloqueo. De esto depende el diseño
del reproductor (fase 07a) y si hace falta nativo antes de lo previsto.

## Criterios de aprobado

| # | Criterio | Dónde se lee |
|---|---|---|
| A | Deriva ≤ 20 ms tras 4 min **y** tras pausar/reanudar; 0 clips tarde u omitidos | `drift.total`, `drift.sinceResume` + oído (el tono del "1" cae encima del bombo) |
| B | Sin recarga por memoria al preparar ni al sonar | no aparece el aviso amarillo "Al volver a cargar…"; `recovered` vacío |
| C | Wake Lock mantiene la pantalla encendida los 4 min | pantalla no se apaga; `wakeLock.status` = activo |
| D | Se reanuda tras bloqueo sin desfase | Reanudar funciona; `drift.sinceResume` ≤ 20 ms |

## Qué hay en la página

1. **Audio.** *Pista sintética*: 4 min estéreo a 44.1 kHz generados en el teléfono (percusión,
   clave 3-2, bombo fuerte en el 1 y suave en el 5): ~81 MiB decodificados. *Archivo del
   teléfono*: una canción tuya; no se sube a ningún lado. Con archivo tecleas el BPM y el
   instante del primer "1" en ms (no hay detector).
2. **Práctica.** Cuenta de salsa (1 2 3 · 5 6 7) con tonos distintos por número y un
   "anuncio" de dos notas brillantes en el 5–6 cuando cambia el paso. Número grande y fila de
   tiempos leídos del reloj de audio. Iniciar · Pausar · Reanudar · Salir.
3. **Calibración.** Suena solo la pista; tocas el botón grande en cada bombo (el 1 y el 5 de
   cada frase, o sea cada 4 tiempos): 16 toques. Da el desfase medio y su desviación, y lo
   deja como `latencyOffsetMs`.
4. **Mediciones** en vivo y **Copiar resultados** (JSON). Si el portapapeles falla, el JSON
   aparece en un cuadro de texto para copiarlo a mano.

### Cómo leer las mediciones

- **Deriva** (`drift`): para cada clip, diferencia entre el instante en que se programó y la
  posición de la pista en ese instante (las dos en el reloj de audio). Es 0 salvo que el
  bucle llegue tarde (`late`; si pasa de 50 ms, el clip se omite: `skipped`) o que reanudar
  calcule mal la posición. **No mide lo que sale por el altavoz**: para eso está el oído (el
  tono del "1" tiene que sonar pegado al bombo, sin "flam").
- **Margen mínimo del lookahead**: la menor anticipación con que se programó un clip. Cerca
  de 0 = el bucle apenas llega (p. ej. el teléfono lo frena en segundo plano).
- **Reloj audio − pared**: cuánto se separan el reloj de audio y el del sistema en el tramo
  actual (sin pausas). Informativo; > 100 ppm sostenido desalinearía la UI, no el audio.
- **Latencia**: `baseLatency` / `outputLatency` que reporta el navegador, y la calibración:
  - `meanMs`: desfase del toque con el reloj de programación = latencia real de salida +
    tu anticipación. **Es la cifra que importa.**
  - `meanOutputMs`: el mismo desfase usando `getOutputTimestamp()`. Si el navegador compensa
    bien su latencia, queda cerca de 0 (solo tu error). Con Bluetooth, si queda lejos de 0,
    el navegador no conoce la latencia real y hay que calibrar siempre.
- **Buffer decodificado**: bytes del `AudioBuffer`. El heap JS casi no cambia: el PCM vive
  fuera del heap; el riesgo es que el sistema mate la pestaña, y eso lo detecta la marca en
  `sessionStorage` (aviso amarillo al recargar).

### Sobre `latencyOffsetMs` y los clips

La pista y los clips salen por el **mismo** `AudioContext`: la latencia de salida los retrasa
a los dos por igual, así que entre ellos no hay desfase aunque el Bluetooth sume 200 ms. Por
eso la página usa la calibración para **pintar** la cuenta a tiempo con lo que se oye y, por
defecto, **no** la aplica a los clips (interruptor "Aplicar el offset a los clips"). La prueba
5 lo comprueba de oído: si con el interruptor encendido los tonos se adelantan al bombo, la
fórmula `tProgramado = tMs − latencyOffsetMs` de `docs/spec/motor-de-ritmo.md` §6 debe pasar
a aplicarse solo a la UI (se decide en D032 con los resultados).

**Resultado (2026-09-26, Android):** confirmado. Con 344 ms aplicados, la cuenta cayó un tiempo
antes de la música. §6 del spec ya dice que el offset va solo a la UI y a los toques (D032).

## Cómo llegar desde el teléfono (HTTPS)

Wake Lock exige contexto seguro (HTTPS). Dos vías:

**(b) Recomendada — preview de Vercel del PR.** HTTPS real, sin avisos de certificado, y
funciona igual en Android e iPhone (Safari es el más estricto con certificados propios).
Requiere conectar el repo a Vercel (acción manual de César, una vez): cada PR trae su URL
de preview; se abre `<url-del-preview>/spike/audio`.

**(a) Inmediata — servidor de desarrollo en la LAN.** PC y teléfono en la misma Wi-Fi:

```bash
ipconfig                                   # IPv4 del PC, p. ej. 192.168.1.20
bun run dev -- --experimental-https -H 192.168.1.20 -p 4301
```

- En el teléfono: `https://192.168.1.20:4301/spike/audio`.
- `--experimental-https` crea un certificado local con mkcert: el teléfono no lo conoce y
  muestra un aviso ("La conexión no es privada" / "Este sitio no es seguro") → *Avanzado* →
  *Continuar* (Android) o *Mostrar detalles* → *visitar este sitio web* (iPhone).
- `-H` con la **IP del PC**, no `0.0.0.0`: Next 16 bloquea los recursos de desarrollo pedidos
  desde otro host salvo el del arranque (`allowedDevOrigins`); con `0.0.0.0` la página carga
  sin JavaScript.
- Windows puede pedir permiso de firewall para Node la primera vez: acepta en red privada.
- En la página, `env.isSecureContext` del JSON debe ser `true`. Si Wake Lock da error con
  el certificado local, usa la vía (b).

## Protocolo (repetir en cada teléfono)

Antes de empezar: batería > 30 %, sin ahorro de energía, volumen medio, brillo automático
apagado, la página abierta en el navegador por defecto (Chrome en Android, Safari en
iPhone). **Tras cada prueba**: *Copiar resultados* y pegar el JSON en la tabla del teléfono.

| # | Prueba | Duración | Pasos |
|---|---|---|---|
| 1 | Memoria + deriva larga + Wake Lock | ~5 min | Pista sintética, BPM **180** → *Preparar audio* (anota si tarda) → *Iniciar* → **no tocar nada** hasta "Terminó la pista". Mira que la pantalla no se apague. Copiar. |
| 2 | Pausa y reanudar | ~3 min | *Iniciar* → a los ~30 s *Pausar* 10 s → *Reanudar*; repetir 3 veces. Escucha tras cada reanudar: el tono del 1 pegado al bombo. *Salir* → Copiar. |
| 3 | Bloqueo y segundo plano | ~3 min | *Iniciar* → a los 30 s bloquea el teléfono (botón de encendido) 20 s → desbloquea. Anota si el audio siguió sonando bloqueado. Si dice "Interrumpido", *Reanudar*. Luego sal a la pantalla de inicio 20 s y vuelve; igual. 30 s más → *Salir* → Copiar. |
| 4 | Latencia con altavoz | ~2 min | Salida "altavoz" → *Calibrar con altavoz* → 16 toques en cada bombo. Repite una vez más (2 corridas). *Iniciar* 30 s: ¿el número grande cambia a la vez que suena el bombo? *Salir* → Copiar. |
| 5 | Latencia con Bluetooth | ~4 min | Conecta audífonos Bluetooth y **recarga la página** (la latencia se lee al crear el audio). *Preparar audio* → salida "bluetooth" → *Calibrar* ×2. *Iniciar* 30 s con "Aplicar el offset a los clips" **apagado**: ¿tonos pegados al bombo? *Salir*, enciende el interruptor, *Iniciar* 30 s: ¿los tonos se adelantan? *Salir* → Copiar. |
| 6 | Canción real (memoria) | ~3 min | Recarga. *Archivo del teléfono* → elige una canción de 4–6 min (mp3/m4a) → BPM aproximado y primer "1" en ms (si no lo sabes, 0) → *Preparar audio*: anota el tiempo de preparación y el tamaño. *Iniciar* 1 min → *Salir* → Copiar. Si la pestaña se recarga sola, aparece el aviso amarillo: cópialo también. |
| 7 | Solo iPhone: interruptor de silencio | ~1 min | Con el interruptor en **silencio**, *Iniciar*: ¿se oye? Luego sin silencio. Anota los dos. |
| 8 | Extremos de BPM (opcional) | ~2 min | Recarga, pista sintética a **210** BPM → 1 min → Copiar. A 210 un tiempo dura 286 ms: es el caso más apretado del lookahead. |

Si algo falla (pantalla en blanco, error rojo, la página se recarga), anótalo en
"Observaciones" con el paso exacto; el JSON de la siguiente carga trae el rastro en
`recovered`.

## Resultados

### Android — 2026-09-26 · POCO X6 Pro · Chrome 153 · ≥ 8 GB RAM, 8 núcleos · vía (b) producción

Equipo: **POCO X6 Pro** (Dimensity 8300-Ultra; gama media-alta de 2024). El "Android 10" del user
agent es el valor congelado de Chrome, no la versión real (HyperOS, Android 14+). `deviceMemory` topa en
8: el equipo tiene **8 GB o más**, no es gama media estricta (ver pendientes).
Salida 48 kHz. Pruebas 1–6 hechas por César; la 8 (210 BPM) quedó sin hacer (opcional).

| Criterio | ¿Pasa? | Dato |
|---|---|---|
| A · deriva tras 4 min (prueba 1) | ✅ | 490 clips, 0 tarde, 0 omitidos · deriva máx. ≈ 0 ms (ruido de coma flotante) · margen mínimo 176 ms |
| A · deriva tras reanudar (prueba 2) | ✅ | 3 reanudaciones · deriva 0 ms · margen mínimo 169 ms |
| B · sin recarga por memoria (1 y 6) | ✅ | sintética 84.7 MB en 141–167 ms · canción real m4a 5.0 MB / 301 s → **115.7 MB** PCM en **2714 ms** · `recovered` vacío en todas |
| C · Wake Lock 4 min (prueba 1) | ✅ | activo de *Iniciar* a "fin de la pista"; se libera al ocultar la pestaña y se vuelve a pedir al volver (prueba 3) |
| D · reanuda tras bloqueo (prueba 3) | ✅ | **el audio siguió sonando bloqueado y en segundo plano**; el contexto nunca salió de `running`; 146 clips, 0 tarde (el bucle no se frenó en segundo plano) |
| Reloj audio vs. pared | ✅ | ≤ 47 ppm en todas salvo un pico de 1263 ppm en la prueba 5, al arrancar con Bluetooth (transitorio; el tramo quedó en −25 ppm) |
| Latencia altavoz (prueba 4) | — | calibración 51 ± 35 y 37 ± 68 ms · `meanOutputMs` −4 y −18 ms · reportada `outputLatency` 48 ms (+ base 5) → **el navegador conoce la latencia del altavoz** |
| Latencia Bluetooth (prueba 5) | — | calibración **328 ± 53 y 344 ± 44 ms** · `meanOutputMs` 176 y 191 ms · reportada 152 ms → **el navegador subestima el Bluetooth en ~180 ms: hay que calibrar** |
| Offset aplicado a los clips (prueba 5) | ❌ no aplicar | con 344 ms aplicados a los clips "el tono sonaba justo en el tiempo pero desfasado de la música por un tiempo": 344 ms ≈ **un tiempo entero** a 180 BPM (333 ms) → la cuenta cae en la rejilla pero un tiempo antes. Confirma que pista y clips comparten la latencia (D032) |

Observaciones de César:
- Prueba 3: "el audio siguió sonando".
- Prueba 5: "cuando activé el offset el bombo sonaba justo en el tiempo, pero se sentía algo
  desfasado de la música por un tiempo".
- Prueba 6: "Tú con él" (Frankie Ruiz), m4a 128 kbps, BPM aproximado 188, primer "1" en 1750 ms.

Lecturas para el reproductor:
- La desviación de los toques (35–68 ms) es error humano, no del motor: la calibración
  necesita **promediar** (≥ 16 toques, descartar los primeros 2–3 y los atípicos) y dar un
  aviso si la desviación supera ~60 ms.
- Decodificar una canción real de 5 min tarda ~2.7 s en este equipo: el reproductor necesita
  un estado de carga ("Preparando la canción…") y no puede decodificar al tocar *Iniciar*.
- 116 MB por canción a 48 kHz: hay que tener **una sola canción decodificada a la vez** y
  soltar el buffer al salir de la sesión.

### iPhone / iOS — pendiente (sin dispositivo)

César no tiene iPhone. Todo lo específico de iOS se prueba después y **bloquea la salida en
iOS** (web en Safari y, más adelante, la app en Swift), no el resto de 07a. Qué hay que
probar, con el mismo protocolo y la misma página:

| # | Qué | Por qué en iOS en particular |
|---|---|---|
| i1 | Pruebas 1–6 y 8 completas en Safari | Safari tiene su propio motor de audio y límites de memoria por pestaña más bajos |
| i2 | Memoria: canción real de 5–6 min (~116 MB PCM) sin que Safari recargue la pestaña | iOS mata pestañas por memoria antes que Android; es el riesgo B |
| i3 | Bloqueo y segundo plano: ¿el contexto pasa a `interrupted`? ¿*Reanudar* lo recupera sin desfase? ¿el audio sigue sonando bloqueado? | En iOS el audio web suele pararse al bloquear; condiciona si la sesión debe pausarse sola |
| i4 | Interruptor de silencio (prueba 7): ¿Web Audio suena con el interruptor en silencio? | Si no suena, la sesión necesita un aviso ("quita el modo silencio") |
| i5 | Wake Lock (existe desde iOS 16.4): ¿mantiene la pantalla los 4 min? | Versiones anteriores no lo tienen: haría falta un plan B |
| i6 | Latencia con AirPods y otro Bluetooth: `meanMs`, `meanOutputMs`, `outputLatency` reportada | Saber si Safari reporta bien la latencia o hay que calibrar siempre, como en Android |
| i7 | Llamada entrante o alarma durante la sesión: ¿se reanuda? | Interrupción de audio del sistema, típica de iOS |
| i8 | Como app instalada en la pantalla de inicio (PWA) | Cambian el ciclo de vida y el Wake Lock |
| i9 | Repetir i1–i7 en la app nativa (AVAudioEngine) cuando exista | D005: las nativas reimplementan el reproductor con el mismo contrato |

Quedan anotados también en `context/plans/pendientes.md` (local).

### Pendiente en Android

- Repetir 1, 3 y 6 en un Android de **gama media real** (4 GB de RAM o menos): el POCO X6 Pro
  tiene ≥ 8 GB. **Pospuesto:** César no tiene otro equipo ahora; se sigue con este resultado
  y se repite cuando haya uno (antes de abrir la app al público).
- Prueba 8 (210 BPM), opcional: con márgenes de 154–176 ms a 180 BPM no se espera problema.

## Humo en escritorio (hecho al construir la página)

Chromium de Playwright, sin salida de audio real (2026-09-26): pista sintética preparada en
~0.2 s (80.7 MiB); 557 eventos a 180 BPM; iniciar → pausar → reanudar sin clips tarde ni
omitidos, deriva 0.00 ms total y tras reanudar, margen mínimo del lookahead 108–180 ms; la
cuenta avanza 7-8-1-2-… y se congela en pausa; calibración con 16 toques simulados; JSON
válido; archivo WAV local decodificado; consola sin errores. Nada de esto sustituye la prueba
en teléfonos.
