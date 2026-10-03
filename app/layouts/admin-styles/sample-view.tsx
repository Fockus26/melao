"use client";

import { useMemo } from "react";
import {
  StylesAdminView,
  type StylesAdminViewProps,
} from "@/components/admin/styles/styles-admin-view";
import type { AdminStylesPort } from "@/lib/admin/styles-port";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Puerto falso de la muestra: nada va a la red. Responde como la base lo justo para probar la
 * pantalla (publicar sin posición inicial → ME008). `failSave`: "Guardar" falla como sin conexión.
 */
function samplePort(
  hasStart: (id: string) => boolean,
  failSave: boolean,
): AdminStylesPort {
  let created = 0;
  return {
    async save(styleId) {
      await wait(500);
      if (failSave) return { id: null, error: { message: "Failed to fetch" } };
      created += 1;
      return {
        id:
          styleId ??
          `00000000-0000-4000-8000-${String(created).padStart(12, "0")}`,
        error: null,
      };
    },
    async setPublished(styleId, on) {
      await wait(400);
      if (on && !hasStart(styleId))
        return { error: { code: "ME008", message: "sin posición inicial" } };
      return { error: null };
    },
    async remove() {
      await wait(400);
      return { error: null };
    },
    async issues(styleId) {
      return {
        issues: hasStart(styleId) ? [] : ["missing_start_position"],
        error: null,
      };
    },
    async addPosition() {
      await wait(300);
      created += 1;
      return {
        id: `00000000-0000-4000-8001-${String(created).padStart(12, "0")}`,
        error: null,
      };
    },
    async renamePosition() {
      await wait(300);
      return { error: null };
    },
    async removePosition() {
      await wait(300);
      return { error: null };
    },
  };
}

/** La vista real con un puerto falso (las funciones no cruzan de Server a Client Component). */
export function StylesAdminSample({
  failSave = false,
  ...props
}: Omit<StylesAdminViewProps, "port" | "variant"> & { failSave?: boolean }) {
  const { styles } = props;
  const port = useMemo(
    () =>
      samplePort(
        (id) => Boolean(styles.find((s) => s.id === id)?.startPositionId),
        failSave,
      ),
    [styles, failSave],
  );
  return <StylesAdminView {...props} port={port} variant="sample" />;
}
