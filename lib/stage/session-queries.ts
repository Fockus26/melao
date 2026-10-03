import { cache } from "react";
import { isUuid } from "@/lib/lesson/queries";
import { createClient } from "@/lib/supabase/server";
import { getWebLatencyMs } from "./latency-queries";
import {
  gridBpm,
  type PracticeSessionData,
  parseBeatGrid,
  parseStoredPlan,
} from "./practice-session";

/**
 * Lectura de la sesión de práctica para su Server Component, con la sesión del alumno. Sin
 * reglas de negocio: RLS deja leer lo propio (y al admin, todo), así que se filtra además por
 * `user_id` (el admin solo practica sus sesiones). La línea de tiempo no se lee: se recalcula
 * con el core (`practiceStage`). Android/iOS hacen las mismas lecturas con el SDK.
 */
export const getPracticeSession = cache(
  async (
    sessionId: string,
    userId: string,
  ): Promise<PracticeSessionData | null> => {
    if (!isUuid(sessionId)) return null;
    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from("practice_sessions")
      .select(
        `id, plan, style_id,
         style:dance_styles(name, beats_per_phrase, spoken_beats, call_beat, call_span_beats, lead_in_phrases),
         song:songs(bpm, beat_grid, duration_ms)`,
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`practice_sessions: ${error.message}`);
    // Ajena, inexistente o con estilo/canción que ya no ve → 404.
    if (!session?.style || !session.song) return null;

    const plan = parseStoredPlan(session.plan);
    const beatGrid = parseBeatGrid(session.song.beat_grid);
    // `plan-session` ya validó plan y rejilla al crearla: si no están, es un dato roto.
    if (!plan || plan.length === 0 || !beatGrid) {
      throw new Error("practice_sessions: plan o rejilla inválidos");
    }

    const [steps, latencyOffsetMs] = await Promise.all([
      supabase
        .from("steps")
        .select("id, slug, name")
        .eq("style_id", session.style_id),
      getWebLatencyMs(userId),
    ]);
    if (steps.error) throw new Error(`steps: ${steps.error.message}`);

    const { style, song } = session;
    return {
      sessionId: session.id,
      styleName: style.name,
      // Sin BPM en la ficha: el de la rejilla al inicio de la canción.
      bpm: song.bpm ?? gridBpm(beatGrid),
      style: {
        beatsPerPhrase: style.beats_per_phrase,
        spokenBeats: style.spoken_beats,
        callBeat: style.call_beat,
        callSpanBeats: style.call_span_beats,
        leadInPhrases: style.lead_in_phrases,
      },
      plan,
      steps: Object.fromEntries(
        (steps.data ?? []).map((s) => [s.id, { slug: s.slug, name: s.name }]),
      ),
      beatGrid,
      songDurationMs: song.duration_ms,
      latencyOffsetMs,
    };
  },
);
