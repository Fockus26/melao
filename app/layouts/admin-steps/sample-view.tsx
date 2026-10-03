"use client";

import { useMemo } from "react";
import {
  StepsAdminView,
  type StepsAdminViewProps,
} from "@/components/admin/steps/steps-admin-view";
import type { StepIssue, StepVideo } from "@/lib/admin/steps";
import type { AdminStepsPort } from "@/lib/admin/steps-port";
import type { StoragePort } from "@/lib/admin/storage";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Puertos falsos de la muestra: nada va a la red ni a Storage. Guardan en memoria lo justo para
 * que publicar, subir y quitar respondan como la base (misma regla de video completo, D149).
 * `failSave`: "Guardar" falla como sin conexión.
 */
function samplePorts(
  hasRoles: boolean,
  categoryOf: (id: string) => string | undefined,
  initialVideos: Record<string, StepVideo[]>,
  failSave: boolean,
): { port: AdminStepsPort; storage: StoragePort } {
  const videos = new Map(
    Object.entries(initialVideos).map(([id, v]) => [id, [...v]]),
  );
  let created = 0;
  const issuesOf = (id: string): StepIssue[] => {
    const roles = new Set((videos.get(id) ?? []).map((v) => v.role));
    if (roles.has("both") || (roles.has("leader") && roles.has("follower")))
      return [];
    if (!hasRoles || categoryOf(id) === "libre") return ["missing_video_both"];
    return [
      ...(roles.has("leader") ? [] : (["missing_video_leader"] as const)),
      ...(roles.has("follower") ? [] : (["missing_video_follower"] as const)),
    ];
  };
  const port: AdminStepsPort = {
    async save(_style, stepId) {
      await wait(500);
      if (failSave) return { id: null, error: { message: "Failed to fetch" } };
      created += 1;
      return {
        id:
          stepId ??
          `00000000-0000-4000-8000-${String(created).padStart(12, "0")}`,
        error: null,
      };
    },
    async setPublished(stepId, on) {
      await wait(400);
      if (on && issuesOf(stepId).length > 0)
        return { error: { code: "MS001", message: "video incompleto" } };
      return { error: null };
    },
    async remove() {
      await wait(400);
      return { error: null };
    },
    async issues(stepId) {
      return { issues: issuesOf(stepId), error: null };
    },
    async putVideo(stepId, video) {
      videos.set(stepId, [
        ...(videos.get(stepId) ?? []).filter((v) => v.role !== video.role),
        video,
      ]);
      return { error: null };
    },
    async setVideoAspect() {
      return { error: null };
    },
    async deleteVideo(stepId, role) {
      videos.set(
        stepId,
        (videos.get(stepId) ?? []).filter((v) => v.role !== role),
      );
      return { error: null };
    },
    async setVoiceClip() {
      return { error: null };
    },
  };
  const storage: StoragePort = {
    async upload() {
      await wait(1200);
      return { error: null };
    },
    async remove() {
      return { error: null };
    },
    // Sin Storage no hay vista previa: la muestra enseña el aviso.
    async signedUrl() {
      return null;
    },
  };
  return { port, storage };
}

/** La vista real con puertos falsos (las funciones no cruzan de Server a Client Component). */
export function StepsAdminSample({
  failSave = false,
  sampleVideos,
  ...props
}: Omit<StepsAdminViewProps, "port" | "storage" | "variant"> & {
  failSave?: boolean;
  sampleVideos: Record<string, StepVideo[]>;
}) {
  const hasRoles = props.currentStyle?.hasRoles ?? true;
  const { steps } = props;
  const { port, storage } = useMemo(
    () =>
      samplePorts(
        hasRoles,
        (id) => steps.find((s) => s.id === id)?.category,
        sampleVideos,
        failSave,
      ),
    [hasRoles, steps, sampleVideos, failSave],
  );
  return (
    <StepsAdminView {...props} port={port} storage={storage} variant="sample" />
  );
}
