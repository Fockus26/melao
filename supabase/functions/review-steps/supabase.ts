// Puerto de datos de review-steps sobre supabase-js: una RPC de lectura y una de escritura.
import type { ServiceClient } from "../_shared/client.ts";
import type { Json } from "../_shared/database.types.ts";
import { fromDbError } from "../_shared/sql-errors.ts";
import type { CardSummary, ReviewState, ReviewStepsPort } from "./handler.ts";

export function supabasePort(client: ServiceClient): ReviewStepsPort {
  return {
    async loadState(userId, stepIds) {
      const { data, error } = await client.rpc("ef_review_state", {
        p_user: userId,
        p_step_ids: stepIds,
      });
      if (error) throw fromDbError(error);
      return data as unknown as ReviewState;
    },
    async apply(userId, write) {
      const { data, error } = await client.rpc("ef_review_steps", {
        p_user: userId,
        p_payload: write as unknown as Json,
      });
      if (error) throw fromDbError(error);
      return (data as unknown as { cards: CardSummary[] }).cards;
    },
  };
}
