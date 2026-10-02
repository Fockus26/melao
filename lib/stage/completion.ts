/**
 * Marca de fin de una práctica (`practice_sessions.completed_at`, D146–D147): la escribe el
 * cliente con su grant de columna (RLS: solo las suyas, `user_id = auth.uid()`), en la práctica
 * libre y en la de la Lección. TS puro: los tests lo prueban con un cliente falso; Android/iOS
 * hacen la misma actualización con el SDK.
 *
 * Cuándo cuenta como terminada (D146): al acabar la canción, o al tocar Terminar / Continuar
 * **después de haber sonado**. Salir con la X, o tocar Continuar sin haber empezado, no la marca.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/functions/_shared/database.types";
import type { StageStatus } from "./source";

/** Escribe la marca; rechaza si no pudo (la llamada decide si reintenta). */
export type MarkCompleted = (sessionId: string) => Promise<void>;

/** `check (completed_at >= created_at)`: el reloj del dispositivo puede ir atrasado. */
const CHECK_VIOLATION = "23514";

/**
 * `update practice_sessions set completed_at = <ahora> where id = … and completed_at is null`.
 * Idempotente: una sesión ya marcada conserva su primera hora. Sin función SQL (sin migración):
 * la hora es la del dispositivo; si va atrasada y choca con el `check`, se usa `created_at`.
 */
export async function markSessionCompleted(
  client: SupabaseClient<Database>,
  sessionId: string,
  now: () => Date = () => new Date(),
): Promise<void> {
  const update = (at: string) =>
    client
      .from("practice_sessions")
      .update({ completed_at: at })
      .eq("id", sessionId)
      .is("completed_at", null);

  const first = await update(now().toISOString());
  if (!first.error) return;
  if (first.error.code !== CHECK_VIOLATION)
    throw new Error(first.error.message);

  const { data, error } = await client
    .from("practice_sessions")
    .select("created_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "practice_sessions");
  const at = Math.max(now().getTime(), Date.parse(data.created_at));
  const second = await update(new Date(at).toISOString());
  if (second.error) throw new Error(second.error.message);
}

export interface SessionCompletion {
  /** Cada cambio de estado del escenario: "sonando" habilita la marca; "terminada" la pone. */
  observe(status: StageStatus["kind"]): void;
  /** Terminar / Continuar: marca solo si llegó a sonar. */
  finish(): void;
}

/**
 * Pone la marca una sola vez por sesión, sin bloquear la navegación: si falla, se reintenta una
 * vez y, si vuelve a fallar, se deja (sin aviso: la práctica ya está guardada).
 */
export function createSessionCompletion(
  sessionId: string,
  mark: MarkCompleted | null,
): SessionCompletion {
  let played = false;
  let done = false;

  const complete = () => {
    if (done || !mark) return;
    done = true;
    mark(sessionId)
      .catch(() => mark(sessionId))
      .catch(() => {});
  };

  return {
    observe(status) {
      if (status === "playing") played = true;
      if (status === "ended") complete();
    },
    finish() {
      if (played) complete();
    },
  };
}
