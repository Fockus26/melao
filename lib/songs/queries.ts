import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PracticeSong } from "./songs";

/**
 * Canciones del estilo para practicar (`public.practice_songs`, de
 * `20261001130000_practice_songs.sql`): visibles para quien llama (RLS, D063), por título, con
 * su dificultad y la favorita de `auth.uid()`. Un error de lectura se lanza.
 */
export const getPracticeSongs = cache(
  async (styleId: string): Promise<PracticeSong[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("practice_songs", {
      p_style: styleId,
    });
    if (error) throw new Error(`practice_songs: ${error.message}`);
    // Los tipos generados no marcan columnas nulas en funciones: bpm, duración y dificultad
    // pueden faltar en una canción sin preparar.
    return data.map((r) => ({
      id: r.song_id,
      title: r.title,
      artist: r.artist,
      bpm: r.bpm === null ? null : Number(r.bpm),
      durationMs: r.duration_ms ?? null,
      difficulty: r.difficulty ?? null,
      favorite: r.favorite,
      ready: r.ready,
    }));
  },
);
