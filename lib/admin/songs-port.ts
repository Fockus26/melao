import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "@/supabase/functions/_shared/database.types";
import {
  type DbError,
  type SongDraft,
  type SongIssue,
  songDraftToPayload,
  toSongIssues,
} from "./songs";

/**
 * Escrituras del editor de canciones (D158–D162). Todas como el admin con el cliente del
 * navegador: la RLS de contenido exige `private.is_admin()` y los triggers de
 * `20261003150000_admin_songs.sql` cuidan publicar, lo que una publicada necesita y borrar. En
 * las muestras de `/layouts` y en los tests, un puerto falso (nada va a la red).
 */
export type AdminSongsPort = {
  /** `admin_save_song`: crea (sin `songId`) o edita la canción con sus estilos. */
  save(
    songId: string | null,
    draft: SongDraft,
  ): Promise<{ id: string | null; error: DbError | null }>;
  setPublished(
    songId: string,
    published: boolean,
  ): Promise<{ error: DbError | null }>;
  remove(songId: string): Promise<{ error: DbError | null }>;
  /** `admin_song_issues`: por qué no se puede publicar. */
  issues(
    songId: string,
  ): Promise<{ issues: SongIssue[]; error: DbError | null }>;
  /** Audio y su duración (leída en el navegador); `null` lo quita. */
  setAudio(
    songId: string,
    path: string | null,
    durationMs: number | null,
  ): Promise<{ error: DbError | null }>;
  setLicenseDocument(
    songId: string,
    path: string | null,
  ): Promise<{ error: DbError | null }>;
};

/** El puerto real, sobre el cliente de Supabase del navegador. */
export function supabaseAdminSongs(
  client: SupabaseClient<Database>,
): AdminSongsPort {
  return {
    async save(songId, draft) {
      const { song, styleIds } = songDraftToPayload(draft);
      const { data, error } = await client.rpc("admin_save_song", {
        p_song_id: songId,
        p_song: song as unknown as Json,
        p_style_ids: styleIds,
      });
      return { id: error ? null : (data ?? null), error };
    },
    async setPublished(songId, published) {
      const { error } = await client
        .from("songs")
        .update({ published })
        .eq("id", songId);
      return { error };
    },
    async remove(songId) {
      const { error } = await client.from("songs").delete().eq("id", songId);
      return { error };
    },
    async issues(songId) {
      const { data, error } = await client.rpc("admin_song_issues", {
        p_song_id: songId,
      });
      return { issues: toSongIssues(data), error };
    },
    async setAudio(songId, path, durationMs) {
      const { error } = await client
        .from("songs")
        .update({ audio_path: path, duration_ms: durationMs })
        .eq("id", songId);
      return { error };
    },
    async setLicenseDocument(songId, path) {
      const { error } = await client
        .from("songs")
        .update({ license_document_path: path })
        .eq("id", songId);
      return { error };
    },
  };
}
