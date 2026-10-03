"use client";

import { FileAudio, FileText, FileVideo, Upload } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  type AdminBucket,
  acceptFor,
  extensionsLabel,
  formatMegabytes,
  type StoragePort,
  UPLOAD_MAX_BYTES,
  validateUpload,
} from "@/lib/admin/storage";
import { objectFileName, readMediaDurationMs } from "@/lib/admin/upload";

/**
 * Subida de un archivo del admin a Storage (D150): valida tipo y 50 MB **antes** de subir con
 * los límites del bucket, lee la duración en el navegador, muestra "Subiendo…", previsualiza con
 * una URL firmada corta y deja reemplazar y quitar (con confirmación). La escritura la hace el
 * dueño (`onUpload` / `onRemove`, normalmente con `uploadAndLink` / `unlinkAndRemove` de
 * `lib/admin/upload.ts`) y devuelve el error en texto o `null`.
 *
 * API:
 * - `label` (nombre del archivo: "Video del rol líder"), `bucket`, `kind` (`video` | `audio` |
 *   `document`: un documento —pdf o imagen— sin duración que se abre en otra pestaña).
 * - `current`: `{ path, details? }` del archivo actual (detalles: "0:04 · 16:9") o `null`.
 * - `disabledReason`: si está, no se puede subir y se dice por qué.
 * - `storage`: el puerto (firma la vista previa).
 * - `onUpload(file, { ext, contentType, durationMs })`, `onRemove()`.
 * - `children`: controles de más del archivo (p. ej. el formato del video).
 */

// Copy provisional (CONTENT_CHECKLIST fila 82).
const COPY = {
  upload: {
    video: "Subir video",
    audio: "Subir audio",
    document: "Subir documento",
  },
  replace: "Reemplazar",
  remove: "Quitar",
  uploading: "Subiendo…",
  removing: "Quitando…",
  preview: "Vista previa",
  hidePreview: "Ocultar vista previa",
  previewError: "No pudimos cargar la vista previa. Inténtalo de nuevo.",
  empty: {
    video: "Sin video todavía.",
    audio: "Sin audio todavía.",
    document: "Sin documento todavía.",
  },
  openDocument: "Abrir el documento (pestaña nueva)",
  help: (bucket: AdminBucket) =>
    `${extensionsLabel(bucket)}, hasta ${formatMegabytes(UPLOAD_MAX_BYTES)}.`,
  tooLarge: (size: number) =>
    `El archivo pesa ${formatMegabytes(size)}: el máximo es ${formatMegabytes(UPLOAD_MAX_BYTES)}.`,
  wrongType: (bucket: AdminBucket) =>
    `Este tipo de archivo no sirve aquí. Usa ${extensionsLabel(bucket)}.`,
  emptyFile: "El archivo está vacío.",
  uploaded: "Archivo subido.",
  removed: "Archivo quitado.",
  confirmTitle: "¿Quitar este archivo?",
  confirmText:
    "Se borra el archivo de Storage. Para volver a tenerlo hay que subirlo otra vez.",
  confirmStay: "Conservar",
  confirmRemove: "Quitar archivo",
};

type Busy = "idle" | "uploading" | "removing";

export type MediaUploadProps = {
  label: string;
  bucket: AdminBucket;
  kind: "video" | "audio" | "document";
  current: { path: string; details?: string } | null;
  disabledReason?: string;
  storage: StoragePort;
  onUpload: (
    file: File,
    info: { ext: string; contentType: string; durationMs: number | null },
  ) => Promise<string | null>;
  onRemove: () => Promise<string | null>;
  children?: ReactNode;
  /** Muestras: arranca en "Subiendo…". */
  initialBusy?: "uploading";
};

export function MediaUpload({
  label,
  bucket,
  kind,
  current,
  disabledReason,
  storage,
  onUpload,
  onRemove,
  children,
  initialBusy,
}: MediaUploadProps) {
  const ids = { input: useId(), title: useId(), message: useId() };
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(initialBusy ?? "idle");
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [preview, setPreview] = useState<{ path: string; url: string } | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const disabled = Boolean(disabledReason) || busy !== "idle";
  const Icon =
    kind === "video" ? FileVideo : kind === "audio" ? FileAudio : FileText;
  const showPreview = preview && current && preview.path === current.path;

  async function handleFile(file: File) {
    const check = validateUpload(bucket, file);
    if (!check.ok) {
      setMessage({
        tone: "error",
        text:
          check.reason === "too_large"
            ? COPY.tooLarge(file.size)
            : check.reason === "empty"
              ? COPY.emptyFile
              : COPY.wrongType(bucket),
      });
      return;
    }
    setBusy("uploading");
    setMessage(null);
    const durationMs =
      kind === "document" ? null : await readMediaDurationMs(file, kind);
    const error = await onUpload(file, {
      ext: check.ext,
      contentType: check.contentType,
      durationMs,
    });
    setBusy("idle");
    setPreview(null);
    setMessage(
      error
        ? { tone: "error", text: error }
        : { tone: "success", text: COPY.uploaded },
    );
  }

  async function handleRemove() {
    setBusy("removing");
    setMessage(null);
    const error = await onRemove();
    setBusy("idle");
    setPreview(null);
    setMessage(
      error
        ? { tone: "error", text: error }
        : { tone: "success", text: COPY.removed },
    );
  }

  async function togglePreview() {
    if (!current) return;
    if (showPreview) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    const url = await storage.signedUrl(bucket, current.path);
    setLoadingPreview(false);
    if (url) setPreview({ path: current.path, url });
    else setMessage({ tone: "error", text: COPY.previewError });
  }

  const describedBy = [
    ids.message,
    disabledReason ? `${ids.message}-reason` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      aria-labelledby={ids.title}
      className="flex min-w-0 flex-col gap-3 rounded-md border border-divider bg-bg p-4"
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="mt-0.5 size-6 shrink-0 text-text-secondary"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p id={ids.title} className="type-body font-semibold text-text">
            {label}
          </p>
          {current ? (
            <p className="type-small break-all text-text-secondary">
              {objectFileName(current.path)}
              {current.details ? ` · ${current.details}` : ""}
            </p>
          ) : (
            <p className="type-small text-text-secondary">{COPY.empty[kind]}</p>
          )}
        </div>
      </div>

      {children}

      {showPreview ? (
        kind === "document" ? (
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            {COPY.openDocument}
            <span className="sr-only">{` · ${label}`}</span>
          </a>
        ) : kind === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: vista previa del admin de un video sin voz; los subtítulos no aplican.
          <video
            src={preview.url}
            controls
            preload="metadata"
            className="max-h-80 w-full rounded-sm bg-surface-sunken"
          />
        ) : (
          // biome-ignore lint/a11y/useMediaCaption: clip de voz de un nombre de paso; el nombre ya está escrito.
          <audio
            src={preview.url}
            controls
            preload="metadata"
            className="w-full"
          />
        )
      ) : null}

      <input
        ref={input}
        id={ids.input}
        type="file"
        accept={acceptFor(bucket)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={Boolean(disabledReason)}
          loading={busy === "uploading"}
          loadingText={COPY.uploading}
          aria-describedby={describedBy}
          onClick={() => {
            if (!disabled) input.current?.click();
          }}
        >
          <Upload aria-hidden="true" strokeWidth={ICON_STROKE} />
          {current ? COPY.replace : COPY.upload[kind]}
          <span className="sr-only">{` · ${label}`}</span>
        </Button>
        {current ? (
          <>
            <Button
              variant="quiet"
              loading={loadingPreview}
              disabled={busy !== "idle"}
              aria-expanded={Boolean(showPreview)}
              onClick={() => void togglePreview()}
            >
              {showPreview ? COPY.hidePreview : COPY.preview}
              <span className="sr-only">{` · ${label}`}</span>
            </Button>
            <Button
              variant="quiet"
              disabled={Boolean(disabledReason) || busy === "uploading"}
              loading={busy === "removing"}
              loadingText={COPY.removing}
              onClick={() => setConfirming(true)}
            >
              {COPY.remove}
              <span className="sr-only">{` · ${label}`}</span>
            </Button>
          </>
        ) : null}
      </div>

      {disabledReason ? (
        <FieldMessage id={`${ids.message}-reason`}>
          {disabledReason}
        </FieldMessage>
      ) : null}
      <div id={ids.message} aria-live="polite">
        {message ? (
          <FieldMessage tone={message.tone}>{message.text}</FieldMessage>
        ) : busy === "idle" && !disabledReason ? (
          <FieldMessage>{COPY.help(bucket)}</FieldMessage>
        ) : null}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogTitle>{COPY.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{COPY.confirmText}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.confirmStay}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemove()}>
              {COPY.confirmRemove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </fieldset>
  );
}
