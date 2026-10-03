import { createClient } from "@/lib/supabase/server";
import {
  type AdminUser,
  pageOffset,
  toAdminUser,
  toUserStateCounts,
  USERS_PAGE_SIZE,
  type UserFilters,
  type UserStateCounts,
} from "./users";

/**
 * Una página de `public.admin_users` (`20261003140000_admin_users.sql`, D156): alta más
 * reciente primero, con la búsqueda y el estado de `filters`. Un error de lectura se lanza
 * (42501 si quien llama no es admin).
 */
export async function getAdminUsers(
  filters: UserFilters,
): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users", {
    p_query: filters.q.trim() || undefined,
    p_state: filters.state ?? undefined,
    p_limit: USERS_PAGE_SIZE,
    p_offset: pageOffset(filters.page),
  });
  if (error) throw new Error(`admin_users: ${error.message}`);
  return data.map(toAdminUser);
}

/** Contadores por estado con la búsqueda `q` (`public.admin_user_counts`, D157). */
export async function getAdminUserCounts(q: string): Promise<UserStateCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_counts", {
    p_query: q.trim() || undefined,
  });
  if (error) throw new Error(`admin_user_counts: ${error.message}`);
  return toUserStateCounts(data[0]);
}
