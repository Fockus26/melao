import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminPosition,
  type AdminStepDetail,
  type AdminStepRow,
  type AdminStyle,
  beatNotesToDraft,
  toIssues,
  type VideoAspect,
} from "./steps";

/**
 * Lecturas de `/admin/steps` en el Server Component, con la sesión del admin (RLS: el admin ve
 * todo, publicado o no). Un error de lectura se lanza; la página lo muestra con Reintentar.
 */

/** Todos los estilos, publicados o no, por `sort_order` y nombre. */
export const getAdminStyles = cache(async (): Promise<AdminStyle[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dance_styles")
    .select("id, slug, name, has_roles, beats_per_phrase, published")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`dance_styles: ${error.message}`);
  return data.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    hasRoles: s.has_roles,
    beatsPerPhrase: s.beats_per_phrase,
    published: s.published,
  }));
});

export const getStylePositions = cache(
  async (styleId: string): Promise<AdminPosition[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("positions")
      .select("id, name")
      .eq("style_id", styleId)
      .order("name");
    if (error) throw new Error(`positions: ${error.message}`);
    return data;
  },
);

/** `admin_steps`: la lista del estilo (D149). */
export const getAdminSteps = cache(
  async (styleId: string): Promise<AdminStepRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_steps", {
      p_style_id: styleId,
    });
    if (error) throw new Error(`admin_steps: ${error.message}`);
    return data.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      difficulty: r.difficulty,
      published: r.published,
      sortOrder: r.sort_order,
      videosComplete: r.videos_complete,
      hasVoiceClip: r.has_voice_clip,
      lessonCount: r.lesson_count,
    }));
  },
);

/** El paso abierto en el editor; `null` si no existe en ese estilo. */
export const getAdminStepDetail = cache(
  async (
    style: Pick<AdminStyle, "id" | "beatsPerPhrase">,
    stepId: string,
  ): Promise<AdminStepDetail | null> => {
    const supabase = await createClient();
    const [step, prereqs, videos, issues, lessons] = await Promise.all([
      supabase
        .from("steps")
        .select("*")
        .eq("id", stepId)
        .eq("style_id", style.id)
        .maybeSingle(),
      supabase
        .from("step_prerequisites")
        .select("requires_step_id")
        .eq("step_id", stepId),
      supabase
        .from("step_videos")
        .select("role, video_path, duration_ms, aspect")
        .eq("step_id", stepId),
      supabase.rpc("admin_step_issues", { p_step_id: stepId }),
      supabase.from("lesson_steps").select("lesson_id").eq("step_id", stepId),
    ]);
    const failed = [step, prereqs, videos, issues, lessons].find(
      (r) => r.error,
    );
    if (failed?.error)
      throw new Error(`paso ${stepId}: ${failed.error.message}`);
    const s = step.data;
    if (!s) return null;
    return {
      id: s.id,
      styleId: s.style_id,
      published: s.published,
      voiceClipPath: s.voice_clip_path,
      videos: (videos.data ?? []).map((v) => ({
        role: v.role,
        path: v.video_path,
        durationMs: v.duration_ms,
        aspect: v.aspect as VideoAspect,
      })),
      issues: toIssues(issues.data),
      lessonCount: new Set((lessons.data ?? []).map((l) => l.lesson_id)).size,
      draft: {
        name: s.name,
        slug: s.slug,
        category: s.category,
        difficulty: s.difficulty,
        phrases: String(s.phrases),
        startPositionId: s.start_position_id,
        endPositionId: s.end_position_id,
        canStart: s.can_start,
        canEnd: s.can_end,
        repeatable: s.repeatable,
        description: s.description ?? "",
        beatNotes: beatNotesToDraft(s.beat_notes, style.beatsPerPhrase),
        variationOf: s.variation_of,
        prerequisites: (prereqs.data ?? []).map((p) => p.requires_step_id),
        sortOrder: String(s.sort_order),
      },
    };
  },
);
