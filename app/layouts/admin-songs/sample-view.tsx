"use client";

import { useMemo } from "react";
import {
  SongsAdminView,
  type SongsAdminViewProps,
} from "@/components/admin/songs/songs-admin-view";
import type { SongIssue } from "@/lib/admin/songs";
import type { AdminSongsPort } from "@/lib/admin/songs-port";
import type { StoragePort } from "@/lib/admin/storage";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Puertos falsos de la muestra: nada va a la red ni a Storage. Los motivos de publicar salen
 * de lo que la muestra trae (`issuesOf`), sin repetir la regla de la base; subir un archivo
 * quita el motivo de ese archivo. `failSave`: "Guardar" falla como sin conexión.
 */
function samplePorts(
  initialIssues: Record<string, SongIssue[]>,
  failSave: boolean,
): { port: AdminSongsPort; storage: StoragePort } {
  const issues = new Map(
    Object.entries(initialIssues).map(([id, list]) => [id, [...list]]),
  );
  let created = 0;
  const drop = (id: string, gone: SongIssue[]) =>
    issues.set(
      id,
      (issues.get(id) ?? []).filter((i) => !gone.includes(i)),
    );
  const add = (id: string, issue: SongIssue) =>
    issues.set(id, [...new Set([...(issues.get(id) ?? []), issue])]);
  const port: AdminSongsPort = {
    async save(songId, draft) {
      await wait(500);
      if (failSave) return { id: null, error: { message: "Failed to fetch" } };
      created += 1;
      const id =
        songId ??
        `00000000-0000-4000-8000-${String(created).padStart(12, "0")}`;
      if (!songId)
        issues.set(id, [
          "missing_audio",
          "missing_grid",
          "missing_dance_end",
          "missing_license_document",
        ]);
      if (draft.styleIds.length > 0) drop(id, ["missing_style"]);
      else add(id, "missing_style");
      if (draft.licenseSource.trim()) drop(id, ["missing_license_source"]);
      else add(id, "missing_license_source");
      return { id, error: null };
    },
    async setPublished(songId, on) {
      await wait(400);
      if (on && (issues.get(songId) ?? []).length > 0)
        return { error: { code: "MS201", message: "le falta algo" } };
      return { error: null };
    },
    async remove() {
      await wait(400);
      return { error: null };
    },
    async issues(songId) {
      return { issues: issues.get(songId) ?? [], error: null };
    },
    async setAudio(songId, path) {
      if (path) drop(songId, ["missing_audio"]);
      else add(songId, "missing_audio");
      return { error: null };
    },
    async setLicenseDocument(songId, path) {
      if (path) drop(songId, ["missing_license_document"]);
      else add(songId, "missing_license_document");
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
export function SongsAdminSample({
  failSave = false,
  sampleIssues,
  ...props
}: Omit<SongsAdminViewProps, "port" | "storage" | "variant"> & {
  failSave?: boolean;
  sampleIssues: Record<string, SongIssue[]>;
}) {
  const { port, storage } = useMemo(
    () => samplePorts(sampleIssues, failSave),
    [sampleIssues, failSave],
  );
  return (
    <SongsAdminView {...props} port={port} storage={storage} variant="sample" />
  );
}
