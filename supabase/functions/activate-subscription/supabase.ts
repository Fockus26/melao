// Puerto de datos de activate-subscription sobre supabase-js (una RPC atómica).
import type { ServiceClient } from "../_shared/client.ts";
import { fromDbError } from "../_shared/sql-errors.ts";
import type { ActivateSubscriptionPort, Subscription } from "./handler.ts";

export function supabasePort(client: ServiceClient): ActivateSubscriptionPort {
  return {
    async activate(userId, planSlug) {
      const { data, error } = await client.rpc("ef_activate_subscription", {
        p_user: userId,
        p_plan_slug: planSlug,
      });
      if (error) throw fromDbError(error);
      return data as unknown as Subscription;
    },
  };
}
