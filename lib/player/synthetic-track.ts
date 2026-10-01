/**
 * Pista sintética (D121): mientras no hay canción con licencia (D009), lo que suena debajo del
 * coach es una campana en cada tiempo y un bombo en el 1 (fuerte) y en la mitad de la frase
 * (suave), calculados desde la rejilla de la canción (`beat_grid`, D010). Así el ritmo es el de
 * la canción real —con sus cambios de tempo— y el día que llegue el audio solo cambia la fuente.
 *
 * No se renderiza: cada golpe es un oscilador de ≤ 200 ms programado con `start(when)` en la
 * ventana del bucle (D030), como la voz. Cero memoria de pista (renderizar 4–5 min a 44.1 kHz
 * son ~85 MB, D031) y sin espera al preparar.
 */

import {
  type Anchor,
  beatInPhrase,
  beatToMs,
  msToBeat,
} from "../../supabase/functions/_shared/core/grid.ts";
import { hit } from "../audio/synth";
import type { TrackSource } from "./track";

/** `one`: el 1 de la frase · `middle`: el primer tiempo de la segunda mitad · `beat`: el resto. */
export type HitKind = "one" | "middle" | "beat";

export interface TrackHit {
  /** Ms desde el inicio de la pista (sin redondear: es audio, no un evento de la UI). */
  tMs: number;
  kind: HitKind;
}

/**
 * Golpes de la pista: un tiempo entero de la rejilla en cada `t ∈ [0, durationMs)`, también los
 * de antes del primer ancla (la rejilla se extrapola, §2). Pura: la prueban los tests.
 */
export function syntheticHits(
  anchors: readonly Anchor[],
  beatsPerPhrase: number,
  durationMs: number,
): TrackHit[] {
  const middle = beatsPerPhrase % 2 === 0 ? beatsPerPhrase / 2 + 1 : null;
  const hits: TrackHit[] = [];
  for (let b = Math.ceil(msToBeat(anchors, 0)); ; b++) {
    const tMs = beatToMs(anchors, b);
    if (tMs >= durationMs) break;
    if (tMs < 0) continue;
    const n = beatInPhrase(b, beatsPerPhrase);
    hits.push({
      tMs,
      kind: n === 1 ? "one" : n === middle ? "middle" : "beat",
    });
  }
  return hits;
}

/** Primer golpe con `tMs ≥ fromMs` (los golpes vienen ordenados). */
export function firstHitFrom(hits: readonly TrackHit[], fromMs: number) {
  const i = hits.findIndex((h) => h.tMs >= fromMs);
  return i === -1 ? hits.length : i;
}

/** Campana: dos osciladores inarmónicos (el timbre de un cencerro), caída corta. */
function bell(
  ctx: BaseAudioContext,
  out: AudioNode,
  when: number,
  peak: number,
): AudioScheduledSourceNode[] {
  return [562, 845].map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    hit(ctx, out, osc, when, peak, 0.09);
    return osc;
  });
}

function kick(
  ctx: BaseAudioContext,
  out: AudioNode,
  when: number,
  peak: number,
): AudioScheduledSourceNode {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(50, when + 0.12);
  hit(ctx, out, osc, when, peak, 0.18);
  return osc;
}

export interface SyntheticTrackInput {
  anchors: readonly Anchor[];
  beatsPerPhrase: number;
  durationMs: number;
}

export function createSyntheticTrack(input: SyntheticTrackInput): TrackSource {
  let hits: TrackHit[] = [];
  let cursor = 0;
  let ctx: BaseAudioContext | null = null;
  let bus: AudioNode | null = null;
  let trackStartCtx = 0;
  const nodes = new Set<AudioScheduledSourceNode>();

  const play = (h: TrackHit) => {
    if (!ctx || !bus) return;
    const when = trackStartCtx + h.tMs / 1000;
    const out: AudioScheduledSourceNode[] = [];
    if (h.kind === "one") out.push(kick(ctx, bus, when, 0.9));
    if (h.kind === "middle") out.push(kick(ctx, bus, when, 0.45));
    out.push(...bell(ctx, bus, when, h.kind === "one" ? 0.16 : 0.08));
    for (const node of out) {
      nodes.add(node);
      node.onended = () => nodes.delete(node);
    }
  };

  return {
    durationMs: input.durationMs,
    async prepare(onProgress) {
      hits = syntheticHits(
        input.anchors,
        input.beatsPerPhrase,
        input.durationMs,
      );
      onProgress(1);
    },
    start(context, out, startCtx, startAtCtx) {
      ctx = context;
      // Un filtro suave para que la onda cuadrada no chille en altavoces de teléfono.
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4000;
      lowpass.connect(out);
      bus = lowpass;
      trackStartCtx = startCtx;
      cursor = firstHitFrom(hits, (startAtCtx - startCtx) * 1000);
    },
    pump(_fromMs, toMs) {
      while (cursor < hits.length && hits[cursor].tMs < toMs) {
        play(hits[cursor]);
        cursor++;
      }
    },
    stop() {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          // Ya estaba parado.
        }
      }
      nodes.clear();
      bus?.disconnect();
      bus = null;
    },
    release() {
      hits = [];
      cursor = 0;
    },
  };
}
