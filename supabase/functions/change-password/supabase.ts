// Puerto de datos de change-password sobre supabase-js: la RPC del historial y la API de
// administración de Auth. Los errores no arrastran el mensaje original (podría citar la entrada).
import type { ServiceClient } from "../_shared/client.ts";
import { fromDbError } from "../_shared/sql-errors.ts";
import { type ChangePasswordPort, weakPassword } from "./handler.ts";

export function supabasePort(client: ServiceClient): ChangePasswordPort {
  return {
    async recentlyUsed(userId, password) {
      const { data, error } = await client.rpc("ef_password_recently_used", {
        p_user: userId,
        p_candidate: password,
      });
      if (error) throw fromDbError({ code: error.code, message: "rpc" });
      return data === true;
    },
    async updatePassword(userId, password) {
      const { error } = await client.auth.admin.updateUserById(userId, {
        password,
      });
      if (!error) return;
      // La regla de Supabase (D075) también vale para la API de administración.
      if (error.code === "weak_password") throw weakPassword();
      throw new Error(
        `auth.admin.updateUserById: ${error.status ?? "?"} ${error.code ?? "?"}`,
      );
    },
  };
}
