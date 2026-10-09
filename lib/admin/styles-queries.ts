import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminStyleFull,
  maxNoteBeat,
  type StylePosition,
  type StyleStep,
} from "./styles";

/**
 * Lecturas de `/admin/styles` en el Server Component, con la sesión del admin (RLS: el admin ve
 * todo, publicado o no). Un error de lectura se lanza; la página lo muestra con Reintentar.
 */

/** `admin_styles`: todos los estilos con su configuración, contadores y posiciones. */
export const getAdminStylesFull = cache(async (): Promise<AdminStyleFull[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_styles");
  if (error) throw new Error(`admin_styles: ${error.message}`);
  return data.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    published: s.published,
    sortOrder: s.sort_order,
    hasRoles: s.has_roles,
    beatsPerPhrase: s.beats_per_phrase,
    spokenBeats: s.spoken_beats,
    callBeat: s.call_beat,
    callSpanBeats: s.call_span_beats,
    leadInPhrases: s.lead_in_phrases,
    bands: s.difficulty_bpm_bands,
    startPositionId: s.start_position_id,
    stepCount: s.step_count,
    stepsPublished: s.steps_published,
    songCount: s.song_count,
    hasCourse: s.has_course,
    positions: toPositions(s.positions),
  }));
});

function toPositions(raw: unknown): StylePosition[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    id: String(p.id),
    slug: String(p.slug),
    name: String(p.name),
    stepCount: Number(p.step_count) || 0,
  }));
}

/** Los pasos del estilo (publicados o no) para validar el catálogo. */
export const getStyleSteps = cache(
  async (styleId: string): Promise<StyleStep[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("steps")
      .select(
        "id, name, category, start_position_id, end_position_id, phrases, can_start, can_end, repeatable, published, beat_notes",
      )
      .eq("style_id", styleId)
      .order("sort_order")
      .order("name");
    if (error) throw new Error(`steps: ${error.message}`);
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      startPositionId: s.start_position_id,
      endPositionId: s.end_position_id,
      phrases: s.phrases,
      canStart: s.can_start,
      canEnd: s.can_end,
      repeatable: s.repeatable,
      published: s.published,
      maxNoteBeat: maxNoteBeat(s.beat_notes),
    }));
  },
);
