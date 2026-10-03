import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/functions/_shared/database.types";

/**
 * Subidas del admin a Storage (D150). Un archivo por objeto, privado; se lee con URL firmada
 * corta. Los límites son **los mismos** que fija `20261003120000_admin_steps.sql` en cada bucket
 * (tamaño y tipos): aquí se valida antes de subir para dar el motivo en texto; si alguien se
 * salta el cliente, Storage lo rechaza igual. Android/iOS usan las mismas tablas.
 *
 * API:
 * - `UPLOAD_MAX_BYTES`, `BUCKET_FILE_TYPES`, `bucketMimeTypes(bucket)`, `acceptFor(bucket)`.
 * - `validateUpload(bucket, file)` → tipo canónico y extensión, o el motivo del rechazo.
 * - `versionedObjectName(prefix, base, ext, now)` → nombre nuevo en cada subida (sin caché vieja).
 * - `StoragePort` (subir, quitar, firmar) y `supabaseStorage(client)`, el puerto real.
 */

export type AdminBucket =
  | "step-videos"
  | "songs"
  | "voice-clips"
  | "song-licenses";

/** 50 MB por archivo (decisión de César, 2026-10-03). */
export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/** Segundos de vida de la URL firmada de una vista previa del admin. */
export const SIGNED_URL_SECONDS = 300;

/**
 * Tipos admitidos por bucket: extensión, tipo canónico (el que se manda a Storage y el que
 * acepta el bucket) y los alias con que algunos navegadores nombran el mismo archivo.
 */
export type FileType = {
  ext: string;
  mime: string;
  aliases?: readonly string[];
};

const AUDIO: readonly FileType[] = [
  { ext: "mp3", mime: "audio/mpeg", aliases: ["audio/mp3"] },
  { ext: "m4a", mime: "audio/mp4", aliases: ["audio/x-m4a", "audio/m4a"] },
  {
    ext: "wav",
    mime: "audio/wav",
    aliases: ["audio/x-wav", "audio/wave", "audio/vnd.wave"],
  },
];

export const BUCKET_FILE_TYPES: Record<AdminBucket, readonly FileType[]> = {
  "step-videos": [
    { ext: "mp4", mime: "video/mp4" },
    { ext: "webm", mime: "video/webm" },
  ],
  songs: AUDIO,
  "voice-clips": AUDIO,
  "song-licenses": [
    { ext: "pdf", mime: "application/pdf" },
    { ext: "jpg", mime: "image/jpeg", aliases: ["image/jpg"] },
    { ext: "jpeg", mime: "image/jpeg", aliases: ["image/jpg"] },
    { ext: "png", mime: "image/png" },
  ],
};

/** Tipos canónicos del bucket, sin repetir: los mismos de `storage.buckets.allowed_mime_types`. */
export const bucketMimeTypes = (bucket: AdminBucket): string[] => [
  ...new Set(BUCKET_FILE_TYPES[bucket].map((t) => t.mime)),
];

/** Valor de `accept` del `<input type="file">`: extensiones y tipos. */
export const acceptFor = (bucket: AdminBucket): string =>
  [
    ...BUCKET_FILE_TYPES[bucket].map((t) => `.${t.ext}`),
    ...bucketMimeTypes(bucket),
  ].join(",");

/** Extensiones legibles ("MP4 o WEBM") para la ayuda y el motivo del rechazo. */
export function extensionsLabel(bucket: AdminBucket): string {
  const exts = [
    ...new Set(
      BUCKET_FILE_TYPES[bucket]
        .map((t) => t.ext.toUpperCase())
        .filter((e) => e !== "JPEG"),
    ),
  ];
  return exts.length > 1
    ? `${exts.slice(0, -1).join(", ")} o ${exts[exts.length - 1]}`
    : exts[0];
}

export type UploadCheck =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; reason: "empty" | "too_large" | "wrong_type" };

/**
 * ¿Se puede subir este archivo a este bucket? Manda la extensión; si el navegador da un tipo,
 * tiene que ser el de esa extensión (o un alias). Vacío o de más de 50 MB, no.
 */
export function validateUpload(
  bucket: AdminBucket,
  file: { name: string; size: number; type: string },
): UploadCheck {
  if (file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > UPLOAD_MAX_BYTES) return { ok: false, reason: "too_large" };
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  const type = BUCKET_FILE_TYPES[bucket].find((t) => t.ext === ext);
  if (!type) return { ok: false, reason: "wrong_type" };
  const browserType = file.type.toLowerCase();
  if (
    browserType &&
    browserType !== type.mime &&
    !(type.aliases ?? []).includes(browserType)
  )
    return { ok: false, reason: "wrong_type" };
  // Una sola extensión por tipo en Storage (jpeg → jpg).
  const canonicalExt = type.ext === "jpeg" ? "jpg" : type.ext;
  return { ok: true, ext: canonicalExt, contentType: type.mime };
}

/**
 * Nombre de objeto nuevo en cada subida (D150): `<prefix>/<base>-<marca>.<ext>`. Reemplazar
 * nunca reescribe el mismo nombre, así ningún navegador ni CDN sirve el archivo viejo; el
 * objeto anterior se borra después de apuntar la fila al nuevo.
 */
export function versionedObjectName(
  prefix: string,
  base: string,
  ext: string,
  now: Date = new Date(),
): string {
  return `${prefix}/${base}-${now.getTime().toString(36)}.${ext}`;
}

/** "48,2 MB" (es-419), para el aviso de tamaño. */
export function formatMegabytes(bytes: number): string {
  return `${new Intl.NumberFormat("es-419", {
    maximumFractionDigits: 1,
  }).format(bytes / (1024 * 1024))} MB`;
}

export type StorageError = { message: string; statusCode?: string };

/** Lo que una pantalla del admin necesita de Storage; en muestras y tests, un puerto falso. */
export type StoragePort = {
  upload(
    bucket: AdminBucket,
    path: string,
    file: Blob,
    contentType: string,
  ): Promise<{ error: StorageError | null }>;
  remove(
    bucket: AdminBucket,
    paths: string[],
  ): Promise<{ error: StorageError | null }>;
  signedUrl(bucket: AdminBucket, path: string): Promise<string | null>;
};

/** El puerto real, con el cliente del navegador: la RLS de `storage.objects` exige admin. */
export function supabaseStorage(client: SupabaseClient<Database>): StoragePort {
  return {
    async upload(bucket, path, file, contentType) {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: false });
      return { error: error ? { message: error.message } : null };
    },
    async remove(bucket, paths) {
      if (paths.length === 0) return { error: null };
      const { error } = await client.storage.from(bucket).remove(paths);
      return { error: error ? { message: error.message } : null };
    },
    async signedUrl(bucket, path) {
      const { data } = await client.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      return data?.signedUrl ?? null;
    },
  };
}
