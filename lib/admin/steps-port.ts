import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "@/supabase/functions/_shared/database.types";
import {
  type DbError,
  draftToPayload,
  type StepDraft,
  type StepIssue,
  type StepVideo,
  toIssues,
  type VideoAspect,
  type VideoRole,
} from "./steps";

/**
 * Escrituras del editor de pasos (D149–D153). Todas como el admin con el cliente del navegador:
 * la RLS de contenido exige `private.is_admin()` y los triggers de
 * `20261003120000_admin_steps.sql` cuidan publicar, borrar y los prerequisitos. En las muestras
 * de `/layouts` y en los tests, un puerto falso (nada va a la red).
 */
export type AdminStepsPort = {
  /** `admin_save_step`: crea (sin `stepId`) o edita el paso con sus prerequisitos. */
  save(
    styleId: string,
    stepId: string | null,
    draft: StepDraft,
  ): Promise<{ id: string | null; error: DbError | null }>;
  setPublished(
    stepId: string,
    published: boolean,
  ): Promise<{ error: DbError | null }>;
  remove(stepId: string): Promise<{ error: DbError | null }>;
  /** `admin_step_issues`: por qué no se puede publicar. */
  issues(
    stepId: string,
  ): Promise<{ issues: StepIssue[]; error: DbError | null }>;
  /**
   * Video del rol: si ya hay fila, cambia archivo, duración y formato (nunca el rol: así un
   * paso publicado no pasa por la regla de video completo al reemplazar); si no, la crea.
   */
  putVideo(
    stepId: string,
    video: StepVideo,
  ): Promise<{ error: DbError | null }>;
  setVideoAspect(
    stepId: string,
    role: VideoRole,
    aspect: VideoAspect,
  ): Promise<{ error: DbError | null }>;
  deleteVideo(
    stepId: string,
    role: VideoRole,
  ): Promise<{ error: DbError | null }>;
  setVoiceClip(
    stepId: string,
    path: string | null,
  ): Promise<{ error: DbError | null }>;
};

/** El puerto real, sobre el cliente de Supabase del navegador. */
export function supabaseAdminSteps(
  client: SupabaseClient<Database>,
): AdminStepsPort {
  return {
    async save(styleId, stepId, draft) {
      const { step, prerequisites } = draftToPayload(draft, stepId);
      const { data, error } = await client.rpc("admin_save_step", {
        p_step_id: stepId,
        p_style_id: styleId,
        p_step: step as unknown as Json,
        p_prerequisites: prerequisites,
      });
      return { id: error ? null : (data ?? null), error };
    },
    async setPublished(stepId, published) {
      const { error } = await client
        .from("steps")
        .update({ published })
        .eq("id", stepId);
      return { error };
    },
    async remove(stepId) {
      const { error } = await client.from("steps").delete().eq("id", stepId);
      return { error };
    },
    async issues(stepId) {
      const { data, error } = await client.rpc("admin_step_issues", {
        p_step_id: stepId,
      });
      return { issues: toIssues(data), error };
    },
    async putVideo(stepId, video) {
      const fields = {
        video_path: video.path,
        duration_ms: video.durationMs,
        aspect: video.aspect,
      };
      const updated = await client
        .from("step_videos")
        .update(fields)
        .eq("step_id", stepId)
        .eq("role", video.role)
        .select("id");
      if (updated.error) return { error: updated.error };
      if ((updated.data?.length ?? 0) > 0) return { error: null };
      const { error } = await client
        .from("step_videos")
        .insert({ step_id: stepId, role: video.role, ...fields });
      return { error };
    },
    async setVideoAspect(stepId, role, aspect) {
      const { error } = await client
        .from("step_videos")
        .update({ aspect })
        .eq("step_id", stepId)
        .eq("role", role);
      return { error };
    },
    async deleteVideo(stepId, role) {
      const { error } = await client
        .from("step_videos")
        .delete()
        .eq("step_id", stepId)
        .eq("role", role);
      return { error };
    },
    async setVoiceClip(stepId, path) {
      const { error } = await client
        .from("steps")
        .update({ voice_clip_path: path })
        .eq("id", stepId);
      return { error };
    },
  };
}
