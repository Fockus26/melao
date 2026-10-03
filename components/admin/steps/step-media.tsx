"use client";

import { useId, useState } from "react";
import { MediaUpload } from "@/components/admin/media-upload";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type StepVideo,
  VIDEO_ASPECTS,
  type VideoAspect,
  type VideoRole,
  VOICE_CLIP_PREFIX,
  videoObjectPrefix,
  writeErrorMessage,
} from "@/lib/admin/steps";
import type { AdminStepsPort } from "@/lib/admin/steps-port";
import { type StoragePort, versionedObjectName } from "@/lib/admin/storage";
import {
  formatDuration,
  unlinkAndRemove,
  uploadAndLink,
} from "@/lib/admin/upload";

// Copy provisional (CONTENT_CHECKLIST fila 82).
export const STEP_MEDIA_COPY = {
  roleLabel: {
    leader: "Video del rol líder",
    follower: "Video del rol seguidor",
    both: "Video para ambos roles",
  } satisfies Record<VideoRole, string>,
  voiceLabel: "Clip de voz",
  aspect: "Formato",
  aspectHelp: "Horizontal 16:9, vertical 4:5 o 9:16.",
  saveFirst: "Guarda el paso para poder subir sus archivos.",
  uploadFailed:
    "No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.",
} as const;

/**
 * Videos por rol y clip de voz de un paso guardado (D016, D150). Cada archivo se escribe al
 * momento (no espera a "Guardar"): subir → apuntar la fila → borrar el anterior. Después de
 * cada cambio de video se vuelven a pedir los motivos de publicar (`onVideosChange`).
 */
export function StepMedia({
  stepId,
  slots,
  videos,
  voiceClipPath,
  port,
  storage,
  onVideosChange,
  onVoiceClipChange,
  initialUploading,
}: {
  /** `null` mientras el paso no se haya guardado. */
  stepId: string | null;
  slots: readonly VideoRole[];
  videos: readonly StepVideo[];
  voiceClipPath: string | null;
  port: AdminStepsPort;
  storage: StoragePort;
  onVideosChange: (videos: StepVideo[]) => void;
  onVoiceClipChange: (path: string | null) => void;
  /** Muestras: ese video arranca en "Subiendo…". */
  initialUploading?: VideoRole;
}) {
  const disabledReason = stepId ? undefined : STEP_MEDIA_COPY.saveFirst;
  const byRole = new Map(videos.map((v) => [v.role, v]));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {slots.map((role) => (
          <VideoSlot
            key={role}
            role={role}
            stepId={stepId}
            video={byRole.get(role) ?? null}
            disabledReason={disabledReason}
            port={port}
            storage={storage}
            uploading={initialUploading === role}
            onChange={(next) =>
              onVideosChange([
                ...videos.filter((v) => v.role !== role),
                ...(next ? [next] : []),
              ])
            }
          />
        ))}
      </div>
      <MediaUpload
        label={STEP_MEDIA_COPY.voiceLabel}
        bucket="voice-clips"
        kind="audio"
        current={voiceClipPath ? { path: voiceClipPath } : null}
        disabledReason={disabledReason}
        storage={storage}
        onUpload={async (file, info) => {
          if (!stepId) return STEP_MEDIA_COPY.saveFirst;
          const outcome = await uploadAndLink({
            storage,
            bucket: "voice-clips",
            path: versionedObjectName(VOICE_CLIP_PREFIX, stepId, info.ext),
            file,
            contentType: info.contentType,
            previousPath: voiceClipPath,
            link: (path) => port.setVoiceClip(stepId, path),
          });
          if (!outcome.ok)
            return outcome.stage === "upload"
              ? STEP_MEDIA_COPY.uploadFailed
              : writeErrorMessage(outcome);
          onVoiceClipChange(outcome.path);
          return null;
        }}
        onRemove={async () => {
          if (!stepId || !voiceClipPath) return null;
          const outcome = await unlinkAndRemove({
            storage,
            bucket: "voice-clips",
            path: voiceClipPath,
            unlink: () => port.setVoiceClip(stepId, null),
          });
          if (!outcome.ok) return writeErrorMessage(outcome);
          onVoiceClipChange(null);
          return null;
        }}
      />
    </div>
  );
}

function VideoSlot({
  role,
  stepId,
  video,
  disabledReason,
  port,
  storage,
  uploading,
  onChange,
}: {
  role: VideoRole;
  stepId: string | null;
  video: StepVideo | null;
  disabledReason?: string;
  port: AdminStepsPort;
  storage: StoragePort;
  uploading?: boolean;
  onChange: (video: StepVideo | null) => void;
}) {
  const aspectId = useId();
  const [aspect, setAspect] = useState<VideoAspect>(video?.aspect ?? "16:9");
  const [aspectError, setAspectError] = useState<string | null>(null);
  const label = STEP_MEDIA_COPY.roleLabel[role];
  const details = video
    ? [formatDuration(video.durationMs), video.aspect]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <MediaUpload
      label={label}
      bucket="step-videos"
      kind="video"
      current={video ? { path: video.path, details } : null}
      disabledReason={disabledReason}
      storage={storage}
      initialBusy={uploading ? "uploading" : undefined}
      onUpload={async (file, info) => {
        if (!stepId) return STEP_MEDIA_COPY.saveFirst;
        const next: StepVideo = {
          role,
          path: versionedObjectName(videoObjectPrefix(stepId), role, info.ext),
          durationMs: info.durationMs,
          aspect,
        };
        const outcome = await uploadAndLink({
          storage,
          bucket: "step-videos",
          path: next.path,
          file,
          contentType: info.contentType,
          previousPath: video?.path ?? null,
          link: () => port.putVideo(stepId, next),
        });
        if (!outcome.ok)
          return outcome.stage === "upload"
            ? STEP_MEDIA_COPY.uploadFailed
            : writeErrorMessage(outcome);
        onChange(next);
        return null;
      }}
      onRemove={async () => {
        if (!stepId || !video) return null;
        const outcome = await unlinkAndRemove({
          storage,
          bucket: "step-videos",
          path: video.path,
          unlink: () => port.deleteVideo(stepId, role),
        });
        if (!outcome.ok) return writeErrorMessage(outcome);
        onChange(null);
        return null;
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={aspectId} className="type-small font-medium text-text">
          {STEP_MEDIA_COPY.aspect}
          <span className="sr-only">{` · ${label}`}</span>
        </label>
        <Select
          value={aspect}
          disabled={Boolean(disabledReason)}
          onValueChange={async (value) => {
            const next = value as VideoAspect;
            const previous = aspect;
            setAspect(next);
            setAspectError(null);
            if (!stepId || !video) return;
            const { error } = await port.setVideoAspect(stepId, role, next);
            if (error) {
              setAspect(previous);
              setAspectError(writeErrorMessage(error));
            } else onChange({ ...video, aspect: next });
          }}
        >
          <SelectTrigger
            id={aspectId}
            aria-describedby={`${aspectId}-help`}
            aria-invalid={aspectError ? true : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_ASPECTS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldMessage
          id={`${aspectId}-help`}
          tone={aspectError ? "error" : "help"}
        >
          {aspectError ?? STEP_MEDIA_COPY.aspectHelp}
        </FieldMessage>
      </div>
    </MediaUpload>
  );
}
