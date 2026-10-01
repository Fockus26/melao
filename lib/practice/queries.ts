import { cache } from "react";
import type { StyleOption } from "@/lib/course/path";
import { createClient } from "@/lib/supabase/server";
import { type PracticeSong, type PracticeStyle, parseAnchors } from "./config";

/**
 * Lecturas del configurador para Server Components, con la sesión del alumno (RLS). Las
 * canciones salen de `practice_songs` (visibles, favoritas de `auth.uid()`, popularidad,
 * dificultad y si están listas); la configuración del motor, de `dance_styles`. Un error de
 * lectura se lanza (pantalla de error).
 */

/** Canciones de un estilo para practicar (`practice_songs`), por título. */
export const getPracticeSongs = cache(
  async (styleId: string): Promise<PracticeSong[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("practice_songs", {
      p_style: styleId,
    });
    if (error) throw new Error(`practice_songs: ${error.message}`);
    return data.map((r) => ({
      id: r.song_id,
      title: r.title,
      artist: r.artist,
      bpm: r.bpm === null ? null : Number(r.bpm),
      durationMs: r.duration_ms,
      danceEndMs: r.dance_end_ms,
      beatGrid: parseAnchors(r.beat_grid),
      difficulty: r.difficulty,
      favorite: r.favorite,
      sessions30d: Number(r.sessions_30d),
      popularity: r.popularity,
      ready: r.ready,
    }));
  },
);

/**
 * Los estilos del segmentado: los que el alumno eligió en la Bienvenida, más el actual (puede
 * haber cambiado a otro en "Elige tu estilo"); si no eligió ninguno, todos los publicados. Cada
 * uno con su configuración del motor (para "caben N figuras") y sus canciones.
 */
export async function getPracticeStyles(
  options: readonly StyleOption[],
  currentStyleId: string | null,
): Promise<PracticeStyle[]> {
  const mine = options.filter((s) => s.chosen || s.id === currentStyleId);
  const list = mine.length > 0 ? mine : options;
  if (list.length === 0) return [];

  const supabase = await createClient();
  const [configs, songs] = await Promise.all([
    supabase
      .from("dance_styles")
      .select(
        "id, beats_per_phrase, spoken_beats, call_beat, call_span_beats, lead_in_phrases",
      )
      .in(
        "id",
        list.map((s) => s.id),
      ),
    Promise.all(list.map((s) => getPracticeSongs(s.id))),
  ]);
  if (configs.error) throw new Error(`dance_styles: ${configs.error.message}`);

  const byId = new Map(configs.data.map((c) => [c.id, c]));
  return list.flatMap((s, i) => {
    const c = byId.get(s.id);
    if (!c) return [];
    return [
      {
        id: s.id,
        name: s.name,
        config: {
          beatsPerPhrase: c.beats_per_phrase,
          spokenBeats: c.spoken_beats,
          callBeat: c.call_beat,
          callSpanBeats: c.call_span_beats,
          leadInPhrases: c.lead_in_phrases,
        },
        songs: songs[i] ?? [],
      },
    ];
  });
}
