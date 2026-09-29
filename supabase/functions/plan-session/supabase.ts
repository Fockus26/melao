// Puerto de datos de plan-session sobre supabase-js: una RPC de lectura y una de escritura.
import type { ServiceClient } from "../_shared/client.ts";
import type { Json } from "../_shared/database.types.ts";
import { fromDbError } from "../_shared/sql-errors.ts";
import type { PlanSessionPort, PlanSessionState } from "./handler.ts";

export function supabasePort(client: ServiceClient): PlanSessionPort {
  return {
    async loadState(userId, ids) {
      const { data, error } = await client.rpc("ef_plan_session_state", {
        p_user: userId,
        p_style: ids.styleId,
        p_song: ids.songId,
        ...(ids.lessonId ? { p_lesson: ids.lessonId } : {}),
      });
      if (error) throw fromDbError(error);
      return data as unknown as PlanSessionState;
    },
    async createSession(userId, write) {
      const { data, error } = await client.rpc("ef_plan_session", {
        p_user: userId,
        p_payload: write as unknown as Json,
      });
      if (error) throw fromDbError(error);
      return (data as unknown as { sessionId: string }).sessionId;
    },
  };
}
