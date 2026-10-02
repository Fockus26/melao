import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/functions/_shared/database.types";

/**
 * Favorito de un paso (`user_steps.favorite`, D038, D129). El cliente solo puede crear su fila
 * con `user_id, step_id, favorite` y cambiar `favorite` (grants de columna y RLS de
 * `20260927180000_progreso.sql`): un upsert no sirve, porque su `do update` reescribe también
 * `user_id` y `step_id`, columnas sin grant de update. Por eso: primero update; si no había
 * fila y se marca, insert; si otra pestaña la creó entre medio (23505), update otra vez.
 * Desmarcar sin fila no escribe nada: sin fila ya es "no favorito". Lo usan el catálogo y el
 * detalle del paso; Android/iOS siguen la misma secuencia.
 */

export type DbError = { code?: string; message: string };

/** Lo mínimo que se necesita de la tabla; en tests, un puerto falso. */
export type UserStepsPort = {
  /** Cambia `favorite` de la fila propia; `matched` = había fila. */
  update(
    userId: string,
    stepId: string,
    favorite: boolean,
  ): Promise<{ matched: boolean; error: DbError | null }>;
  /** Crea la fila propia con el favorito (el estado queda en `unknown`). */
  insert(
    userId: string,
    stepId: string,
    favorite: boolean,
  ): Promise<{ error: DbError | null }>;
};

/** `ok`; `unauthorized` (sesión vencida: a Entrar); `error` (se revierte y se avisa). */
export type FavoriteResult = "ok" | "unauthorized" | "error";

const UNIQUE_VIOLATION = "23505";

function classify(error: DbError): FavoriteResult {
  if (error.code === "PGRST301" || error.message.includes("JWT"))
    return "unauthorized";
  return "error";
}

/** Deja `favorite` como se pide en la fila de (`userId`, `stepId`). */
export async function saveStepFavorite(
  port: UserStepsPort,
  userId: string,
  stepId: string,
  favorite: boolean,
): Promise<FavoriteResult> {
  const first = await port.update(userId, stepId, favorite);
  if (first.error) return classify(first.error);
  if (first.matched || !favorite) return "ok";
  const created = await port.insert(userId, stepId, favorite);
  if (!created.error) return "ok";
  if (created.error.code !== UNIQUE_VIOLATION) return classify(created.error);
  // La fila apareció entre el update y el insert (otra pestaña): se reintenta el update.
  const retry = await port.update(userId, stepId, favorite);
  if (retry.error) return classify(retry.error);
  return retry.matched ? "ok" : "error";
}

/** El puerto real, sobre el cliente de Supabase del navegador (RLS: solo la fila propia). */
export function supabaseUserSteps(
  client: SupabaseClient<Database>,
): UserStepsPort {
  return {
    async update(userId, stepId, favorite) {
      const { data, error } = await client
        .from("user_steps")
        .update({ favorite })
        .eq("user_id", userId)
        .eq("step_id", stepId)
        .select("step_id");
      return { matched: (data?.length ?? 0) > 0, error };
    },
    async insert(userId, stepId, favorite) {
      const { error } = await client
        .from("user_steps")
        .insert({ user_id: userId, step_id: stepId, favorite });
      return { error };
    },
  };
}
