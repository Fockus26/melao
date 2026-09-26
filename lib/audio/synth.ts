/**
 * Audio sintético del spike (D031): ni canciones ni voces en el repo (D009, D014).
 *
 * - Pista: ~4 min estéreo a 44.1 kHz renderizada con `OfflineAudioContext` (~85 MB en
 *   Float32 decodificado: es la prueba de memoria). Percusión simple, clave 3-2 y acento
 *   en el 1 de cada frase.
 * - Clips: tonos cortos por número (≤ 120 ms) y un "anuncio" de 2 tiempos con otro timbre.
 */

import { type Anchor, beatToMs, msToBeat } from "./grid";

export const SYNTH_SAMPLE_RATE = 44100;
export const SYNTH_DURATION_S = 240;

/** Clave 3-2 sobre una frase de 8 tiempos (posiciones 0-based, en tiempos). */
const CLAVE_3_2 = [0, 1.5, 3, 5, 6];

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  // Pseudoaleatorio con semilla: la pista sale idéntica en cada dispositivo.
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return buf;
}

/** Golpe con envolvente exponencial. */
function hit(
  ctx: BaseAudioContext,
  out: AudioNode,
  src: AudioScheduledSourceNode,
  when: number,
  peak: number,
  decayS: number,
): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decayS);
  src.connect(g).connect(out);
  src.start(when);
  src.stop(when + decayS + 0.01);
}

/** Cola que se deja sonar tras la frase (el bombo decae en 180 ms). */
const TAIL_S = 0.3;

/**
 * Renderiza una frase de 8 tiempos con `OfflineAudioContext`. Una sola frase y no los 4
 * minutos: cada golpe deja un `GainNode` vivo en el grafo, y con ~2000 golpes el render
 * de la pista entera tardaba más de un minuto en escritorio.
 */
async function renderPhrase(beatS: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(
    2,
    Math.ceil(SYNTH_SAMPLE_RATE * (beatS * 8 + TAIL_S)),
    SYNTH_SAMPLE_RATE,
  );
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  const noise = noiseBuffer(ctx, 0.05);
  const hatFilter = ctx.createBiquadFilter();
  hatFilter.type = "highpass";
  hatFilter.frequency.value = 6000;
  hatFilter.connect(master);

  for (let b = 0; b < 8; b++) {
    const t = b * beatS;
    // Platillo en cada tiempo.
    const hat = ctx.createBufferSource();
    hat.buffer = noise;
    hit(ctx, hatFilter, hat, t, 0.12, 0.04);
    // Bombo: fuerte en el 1 (el acento que se toca al calibrar), suave en el 5.
    if (b === 0 || b === 4) {
      const kick = ctx.createOscillator();
      kick.frequency.setValueAtTime(150, t);
      kick.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      hit(ctx, master, kick, t, b === 0 ? 0.9 : 0.45, 0.18);
    }
  }
  for (const pos of CLAVE_3_2) {
    const clave = ctx.createOscillator();
    clave.type = "triangle";
    clave.frequency.value = 1800;
    hit(ctx, master, clave, pos * beatS, 0.25, 0.05);
  }
  return ctx.startRendering();
}

/**
 * Pista sintética sobre una rejilla de BPM constante (la del spike): se renderiza una frase
 * y se suma en la posición exacta de cada frase (redondeo a la muestra, sin acumular error).
 */
export async function renderSyntheticTrack(
  anchors: readonly Anchor[],
  durationS: number = SYNTH_DURATION_S,
): Promise<AudioBuffer> {
  const beatS = (beatToMs(anchors, 1) - beatToMs(anchors, 0)) / 1000;
  const phrase = await renderPhrase(beatS);
  const length = Math.ceil(SYNTH_SAMPLE_RATE * durationS);
  const track = new AudioBuffer({
    numberOfChannels: 2,
    length,
    sampleRate: SYNTH_SAMPLE_RATE,
  });

  // Primera frase (múltiplo de 8) que todavía suena en t ≥ 0; puede empezar antes del 0.
  let p = Math.floor(msToBeat(anchors, 0) / 8);
  for (; ; p++) {
    const start = Math.round(
      (beatToMs(anchors, p * 8) / 1000) * SYNTH_SAMPLE_RATE,
    );
    if (start >= length) break;
    for (let ch = 0; ch < 2; ch++) {
      const src = phrase.getChannelData(ch);
      const dst = track.getChannelData(ch);
      const from = Math.max(0, -start);
      const to = Math.min(src.length, length - start);
      for (let i = from; i < to; i++) dst[start + i] += src[i];
    }
  }
  return track;
}

/** Frecuencias de los números 1–8 (escala mayor desde Do5): cada número suena distinto. */
const COUNT_FREQS = [
  523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5,
];

function fillTone(
  data: Float32Array,
  sampleRate: number,
  freqAt: (t: number) => number,
  harmonics: readonly number[],
  gain: number,
): void {
  const dur = data.length / sampleRate;
  let phase = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    phase += (2 * Math.PI * freqAt(t)) / sampleRate;
    let v = 0;
    harmonics.forEach((amp, k) => {
      v += amp * Math.sin(phase * (k + 1));
    });
    // Ataque de 5 ms y caída lineal hasta el final: sin clics.
    const env = Math.min(1, t / 0.005) * Math.max(0, 1 - t / dur);
    data[i] = v * env * gain;
  }
}

/**
 * Clips sintéticos para la línea de tiempo: `count.1…8` (100 ms) y `step.<slug>` (dos
 * tonos que ocupan ~90 % de 2 tiempos, tope 600 ms).
 */
export function makeSyntheticClips(
  ctx: BaseAudioContext,
  bpm: number,
  stepSlugs: readonly string[],
): Map<string, AudioBuffer> {
  const clips = new Map<string, AudioBuffer>();
  const sr = ctx.sampleRate;

  COUNT_FREQS.forEach((f, idx) => {
    const buf = ctx.createBuffer(1, Math.round(sr * 0.1), sr);
    fillTone(buf.getChannelData(0), sr, () => f, [1, 0.35], 0.5);
    clips.set(`count.${idx + 1}`, buf);
  });

  const beatS = 60 / bpm;
  const callS = Math.min(0.6, beatS * 2 * 0.9);
  const slugs = [...new Set(stepSlugs)];
  slugs.forEach((slug, idx) => {
    const buf = ctx.createBuffer(1, Math.round(sr * callS), sr);
    // Timbre brillante (armónicos 1/k) y dos notas: se distingue de la cuenta.
    const base = 330 + 40 * idx;
    fillTone(
      buf.getChannelData(0),
      sr,
      (t) => (t < callS / 2 ? base : base * 1.5),
      [1, 0.5, 0.33, 0.25, 0.2],
      0.3,
    );
    clips.set(`step.${slug}`, buf);
  });

  return clips;
}

/** Bytes que ocupa un `AudioBuffer` decodificado (Float32 por canal). */
export function audioBufferBytes(buf: AudioBuffer): number {
  return buf.length * buf.numberOfChannels * 4;
}
