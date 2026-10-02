"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PROFILE_PATH, signInPathFor } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/supabase/functions/_shared/database.types";

/** Columnas que el alumno edita desde Perfil (grant de columna + RLS: su fila). */
export type ProfilePatch = Pick<
  TablesUpdate<"profiles">,
  | "display_name"
  | "dance_role"
  | "default_style_id"
  | "theme"
  | "coach_voice_volume"
  | "coach_spoken_count"
>;

export type SaveStatus = { ok: boolean; text: string } | null;

// Copy provisional (CONTENT_CHECKLIST fila 74).
export const SAVE_COPY = {
  saved: "Guardado.",
  error: "No pudimos guardar el cambio. Inténtalo de nuevo.",
} as const;

/**
 * Guarda una preferencia en `profiles` al cambiarla (sin botón Guardar): la UI cambia al
 * instante y, si la escritura falla, vuelve atrás (`revert`) y avisa. Las escrituras van en
 * fila: con las flechas o el slider pueden salir varias seguidas y gana la última. Con la
 * sesión vencida, a Entrar y de vuelta a Perfil. En `sample` no escribe nada.
 */
export function useProfileSave({
  userId,
  mode = "live",
}: {
  userId?: string;
  mode?: "live" | "sample";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SaveStatus>(null);
  const queue = useRef(Promise.resolve());

  function save(patch: ProfilePatch, revert: () => void): Promise<void> {
    setStatus(null);
    if (mode === "sample" || !userId) {
      setStatus({ ok: true, text: SAVE_COPY.saved });
      return queue.current;
    }
    queue.current = queue.current.then(async () => {
      const { error } = await createClient()
        .from("profiles")
        .update(patch)
        .eq("id", userId);
      if (error) {
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          router.replace(signInPathFor(PROFILE_PATH));
          return;
        }
        revert();
        setStatus({ ok: false, text: SAVE_COPY.error });
        return;
      }
      setStatus({ ok: true, text: SAVE_COPY.saved });
    });
    return queue.current;
  }

  return { status, save };
}
