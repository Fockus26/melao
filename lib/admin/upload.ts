import type { AdminBucket, StoragePort } from "./storage";

/**
 * Pasos de una subida del admin que no dependen de la pantalla (D150): leer la duración del
 * archivo en el navegador y la secuencia subir → apuntar la fila → borrar el anterior. La usan
 * `MediaUpload` y sus dueños (Pasos; Canciones en la ola B).
 */

/** Tiempo máximo para leer los metadatos de un archivo local antes de rendirse. */
const METADATA_TIMEOUT_MS = 10_000;

/**
 * Duración en ms leída de los metadatos con un `<video>`/`<audio>` sin reproducir; `null` si el
 * navegador no la da (formato que no decodifica, archivo dañado) o tarda demasiado.
 */
export function readMediaDurationMs(
  file: Blob,
  kind: "video" | "audio",
): Promise<number | null> {
  if (
    typeof document === "undefined" ||
    typeof URL.createObjectURL !== "function"
  )
    return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), METADATA_TIMEOUT_MS);
    el.preload = "metadata";
    el.onloadedmetadata = () =>
      finish(
        Number.isFinite(el.duration) && el.duration > 0
          ? Math.round(el.duration * 1000)
          : null,
      );
    el.onerror = () => finish(null);
    el.src = url;
  });
}

export type UploadOutcome =
  | { ok: true; path: string }
  | { ok: false; stage: "upload" | "link"; message: string; code?: string };

/**
 * Sube `file` a `path`, llama a `link(path)` para apuntar la fila al objeto nuevo y, si todo
 * salió bien, borra `previousPath`. Si la fila no se pudo apuntar, borra el objeto recién
 * subido (no quedan huérfanos). Borrar el anterior es lo último y no falla la subida: si no se
 * puede, queda un objeto sin uso (se registra en la consola).
 */
export async function uploadAndLink({
  storage,
  bucket,
  path,
  file,
  contentType,
  previousPath,
  link,
}: {
  storage: StoragePort;
  bucket: AdminBucket;
  path: string;
  file: Blob;
  contentType: string;
  previousPath: string | null;
  link: (
    path: string,
  ) => Promise<{ error: { code?: string; message: string } | null }>;
}): Promise<UploadOutcome> {
  const uploaded = await storage.upload(bucket, path, file, contentType);
  if (uploaded.error)
    return { ok: false, stage: "upload", message: uploaded.error.message };
  const linked = await link(path);
  if (linked.error) {
    await storage.remove(bucket, [path]);
    return {
      ok: false,
      stage: "link",
      message: linked.error.message,
      code: linked.error.code,
    };
  }
  if (previousPath && previousPath !== path) {
    const removed = await storage.remove(bucket, [previousPath]);
    if (removed.error)
      console.error(
        `No se pudo borrar ${bucket}/${previousPath}`,
        removed.error,
      );
  }
  return { ok: true, path };
}

/**
 * Quita el archivo: primero la fila (`unlink`; la base puede negarse, p. ej. el video de un
 * paso publicado) y después el objeto.
 */
export async function unlinkAndRemove({
  storage,
  bucket,
  path,
  unlink,
}: {
  storage: StoragePort;
  bucket: AdminBucket;
  path: string;
  unlink: () => Promise<{ error: { code?: string; message: string } | null }>;
}): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const unlinked = await unlink();
  if (unlinked.error)
    return {
      ok: false,
      message: unlinked.error.message,
      code: unlinked.error.code,
    };
  const removed = await storage.remove(bucket, [path]);
  if (removed.error)
    console.error(`No se pudo borrar ${bucket}/${path}`, removed.error);
  return { ok: true };
}

/** "0:42" o "1:05:03" a partir de ms; `null` sin duración. */
export function formatDuration(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Último segmento de la ruta del objeto, para mostrar qué archivo hay. */
export const objectFileName = (path: string) =>
  path.slice(path.lastIndexOf("/") + 1);
