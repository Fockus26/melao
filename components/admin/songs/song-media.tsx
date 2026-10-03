"use client";

import { MediaUpload } from "@/components/admin/media-upload";
import {
  SONG_AUDIO_BASE,
  SONG_LICENSE_BASE,
  songWriteErrorMessage,
} from "@/lib/admin/songs";
import type { AdminSongsPort } from "@/lib/admin/songs-port";
import { type StoragePort, versionedObjectName } from "@/lib/admin/storage";
import {
  formatDuration,
  unlinkAndRemove,
  uploadAndLink,
} from "@/lib/admin/upload";

// Copy provisional (CONTENT_CHECKLIST fila 86).
export const SONG_MEDIA_COPY = {
  audioLabel: "Audio de la canción",
  documentLabel: "Documento de la licencia",
  saveFirst: "Guarda la canción para poder subir sus archivos.",
  uploadFailed:
    "No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.",
  shorterThanDanceEnd:
    "Este audio dura menos que el fin de baile marcado. Sube el audio completo.",
} as const;

type Common = {
  /** `null` mientras la canción no se haya guardado. */
  songId: string | null;
  port: AdminSongsPort;
  storage: StoragePort;
  /** Muestras: arranca en "Subiendo…". */
  initialUploading?: boolean;
};

/**
 * Audio de una canción guardada (bucket `songs`, D150): subir → apuntar la fila con la duración
 * leída en el navegador → borrar el anterior. La vista previa es el reproductor nativo con una
 * URL firmada corta.
 */
export function SongAudio({
  songId,
  path,
  durationMs,
  port,
  storage,
  initialUploading,
  onChange,
}: Common & {
  path: string | null;
  durationMs: number | null;
  onChange: (audio: { path: string | null; durationMs: number | null }) => void;
}) {
  const details = formatDuration(durationMs) ?? undefined;
  return (
    <MediaUpload
      label={SONG_MEDIA_COPY.audioLabel}
      bucket="songs"
      kind="audio"
      current={path ? { path, details } : null}
      disabledReason={songId ? undefined : SONG_MEDIA_COPY.saveFirst}
      storage={storage}
      initialBusy={initialUploading ? "uploading" : undefined}
      onUpload={async (file, info) => {
        if (!songId) return SONG_MEDIA_COPY.saveFirst;
        const outcome = await uploadAndLink({
          storage,
          bucket: "songs",
          path: versionedObjectName(songId, SONG_AUDIO_BASE, info.ext),
          file,
          contentType: info.contentType,
          previousPath: path,
          link: (next) => port.setAudio(songId, next, info.durationMs),
        });
        if (!outcome.ok)
          return outcome.stage === "upload"
            ? SONG_MEDIA_COPY.uploadFailed
            : outcome.code === "23514"
              ? SONG_MEDIA_COPY.shorterThanDanceEnd
              : songWriteErrorMessage(outcome);
        onChange({ path: outcome.path, durationMs: info.durationMs });
        return null;
      }}
      onRemove={async () => {
        if (!songId || !path) return null;
        const outcome = await unlinkAndRemove({
          storage,
          bucket: "songs",
          path,
          unlink: () => port.setAudio(songId, null, null),
        });
        if (!outcome.ok) return songWriteErrorMessage(outcome);
        onChange({ path: null, durationMs: null });
        return null;
      }}
    />
  );
}

/** Documento de la licencia (bucket `song-licenses`, solo admin): pdf, jpg o png (D009, D150). */
export function SongLicenseDocument({
  songId,
  path,
  port,
  storage,
  initialUploading,
  onChange,
}: Common & {
  path: string | null;
  onChange: (path: string | null) => void;
}) {
  return (
    <MediaUpload
      label={SONG_MEDIA_COPY.documentLabel}
      bucket="song-licenses"
      kind="document"
      current={path ? { path } : null}
      disabledReason={songId ? undefined : SONG_MEDIA_COPY.saveFirst}
      storage={storage}
      initialBusy={initialUploading ? "uploading" : undefined}
      onUpload={async (file, info) => {
        if (!songId) return SONG_MEDIA_COPY.saveFirst;
        const outcome = await uploadAndLink({
          storage,
          bucket: "song-licenses",
          path: versionedObjectName(songId, SONG_LICENSE_BASE, info.ext),
          file,
          contentType: info.contentType,
          previousPath: path,
          link: (next) => port.setLicenseDocument(songId, next),
        });
        if (!outcome.ok)
          return outcome.stage === "upload"
            ? SONG_MEDIA_COPY.uploadFailed
            : songWriteErrorMessage(outcome);
        onChange(outcome.path);
        return null;
      }}
      onRemove={async () => {
        if (!songId || !path) return null;
        const outcome = await unlinkAndRemove({
          storage,
          bucket: "song-licenses",
          path,
          unlink: () => port.setLicenseDocument(songId, null),
        });
        if (!outcome.ok) return songWriteErrorMessage(outcome);
        onChange(null);
        return null;
      }}
    />
  );
}
