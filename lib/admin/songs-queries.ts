import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminSongDetail,
  type AdminSongRow,
  type AdminSongStyle,
  anchorCount,
  difficultyChoice,
  type LicenseStatus,
  toSongIssues,
} from "./songs";

/**
 * Lecturas de `/admin/songs` en el Server Component, con la sesión del admin (RLS: el admin ve
 * todo, publicado o no, con licencia vencida o no). Un error de lectura se lanza; la página lo
 * muestra con Reintentar.
 */

/** Todos los estilos, publicados o no, por `sort_order` y nombre. */
export const getSongStyles = cache(async (): Promise<AdminSongStyle[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dance_styles")
    .select("id, slug, name, published")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`dance_styles: ${error.message}`);
  return data;
});

const LICENSE_STATUSES: readonly LicenseStatus[] = [
  "expired",
  "expiring",
  "ok",
];

/** `admin_songs`: la lista (D159). */
export const getAdminSongs = cache(async (): Promise<AdminSongRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_songs");
  if (error) throw new Error(`admin_songs: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    published: r.published,
    styleSlugs: r.style_slugs ?? [],
    ready: r.ready,
    hasAudio: r.has_audio,
    bpm: r.bpm === null ? null : Number(r.bpm),
    durationMs: r.duration_ms,
    licenseSource: r.license_source,
    hasLicenseDocument: r.has_license_document,
    licenseExpiresAt: r.license_expires_at,
    licenseStatus: LICENSE_STATUSES.includes(r.license_status as LicenseStatus)
      ? (r.license_status as LicenseStatus)
      : "ok",
    lessonCount: r.lesson_count,
    difficultyOverride: r.difficulty_override,
    autoDifficulty: r.auto_difficulty,
    difficulty: r.difficulty,
  }));
});

/** La canción abierta en el editor; `null` si no existe. */
export const getAdminSongDetail = cache(
  async (
    songId: string,
    row: AdminSongRow | undefined,
  ): Promise<AdminSongDetail | null> => {
    const supabase = await createClient();
    const [song, styles, issues] = await Promise.all([
      supabase.from("songs").select("*").eq("id", songId).maybeSingle(),
      supabase.from("song_styles").select("style_id").eq("song_id", songId),
      supabase.rpc("admin_song_issues", { p_song_id: songId }),
    ]);
    const failed = [song, styles, issues].find((r) => r.error);
    if (failed?.error)
      throw new Error(`canción ${songId}: ${failed.error.message}`);
    const s = song.data;
    if (!s) return null;
    return {
      id: s.id,
      published: s.published,
      audioPath: s.audio_path,
      durationMs: s.duration_ms,
      licenseDocumentPath: s.license_document_path,
      rhythm: {
        bpm: s.bpm === null ? null : Number(s.bpm),
        anchors: anchorCount(s.beat_grid),
        danceEndMs: s.dance_end_ms,
      },
      issues: toSongIssues(issues.data),
      lessonCount: row?.lessonCount ?? 0,
      autoDifficulty: row?.autoDifficulty ?? null,
      draft: {
        title: s.title,
        artist: s.artist,
        styleIds: (styles.data ?? []).map((r) => r.style_id),
        difficulty: difficultyChoice(s.difficulty_override),
        licenseSource: s.license_source ?? "",
        licenseNotes: s.license_notes ?? "",
        licenseExpiresAt: s.license_expires_at ?? "",
      },
    };
  },
);
