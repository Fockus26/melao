import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "@/supabase/functions/_shared/database.types";
import {
  type DbError,
  type StyleDraft,
  type StyleIssue,
  styleDraftToPayload,
  toStyleIssues,
} from "./styles";

/**
 * Escrituras de `/admin/styles` (D163–D167). Todas como el admin con el cliente del navegador:
 * la RLS de contenido exige `private.is_admin()` y los triggers de
 * `20261003160000_admin_styles.sql` cuidan publicar, borrar y las posiciones en uso. En las
 * muestras de `/layouts` y en los tests, un puerto falso (nada va a la red).
 */
export type AdminStylesPort = {
  /** `admin_save_style`: crea (sin `styleId`, con su posición inicial) o edita el estilo. */
  save(
    styleId: string | null,
    draft: StyleDraft,
  ): Promise<{ id: string | null; error: DbError | null }>;
  setPublished(
    styleId: string,
    published: boolean,
  ): Promise<{ error: DbError | null }>;
  remove(styleId: string): Promise<{ error: DbError | null }>;
  /** `admin_style_issues`: por qué no se puede publicar. */
  issues(
    styleId: string,
  ): Promise<{ issues: StyleIssue[]; error: DbError | null }>;
  addPosition(
    styleId: string,
    position: { name: string; slug: string },
  ): Promise<{ id: string | null; error: DbError | null }>;
  renamePosition(id: string, name: string): Promise<{ error: DbError | null }>;
  removePosition(id: string): Promise<{ error: DbError | null }>;
};

/** El puerto real, sobre el cliente de Supabase del navegador. */
export function supabaseAdminStyles(
  client: SupabaseClient<Database>,
): AdminStylesPort {
  return {
    async save(styleId, draft) {
      const { style, startPosition } = styleDraftToPayload(draft, styleId);
      const { data, error } = await client.rpc("admin_save_style", {
        p_style_id: styleId,
        p_style: style as unknown as Json,
        p_start_position: startPosition as unknown as Json,
      });
      return { id: error ? null : (data ?? null), error };
    },
    async setPublished(styleId, published) {
      const { error } = await client
        .from("dance_styles")
        .update({ published })
        .eq("id", styleId);
      return { error };
    },
    async remove(styleId) {
      const { error } = await client
        .from("dance_styles")
        .delete()
        .eq("id", styleId);
      return { error };
    },
    async issues(styleId) {
      const { data, error } = await client.rpc("admin_style_issues", {
        p_style_id: styleId,
      });
      return { issues: toStyleIssues(data), error };
    },
    async addPosition(styleId, position) {
      const { data, error } = await client
        .from("positions")
        .insert({ style_id: styleId, name: position.name, slug: position.slug })
        .select("id")
        .single();
      return { id: error ? null : data.id, error };
    },
    async renamePosition(id, name) {
      const { error } = await client
        .from("positions")
        .update({ name })
        .eq("id", id);
      return { error };
    },
    async removePosition(id) {
      const { error } = await client.from("positions").delete().eq("id", id);
      return { error };
    },
  };
}
