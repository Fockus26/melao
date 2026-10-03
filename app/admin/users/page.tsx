import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersView } from "@/components/admin/users/users-view";
import {
  type AdminUser,
  EMPTY_COUNTS,
  filteredTotal,
  pageCount,
  parseUserFilters,
  type UserStateCounts,
  usersSearch,
} from "@/lib/admin/users";
import { getAdminUserCounts, getAdminUsers } from "@/lib/admin/users-queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Usuarios · Admin",
  robots: { index: false, follow: false },
};

const PATH = "/admin/users";

/**
 * Admin · Usuarios, solo lectura (D156). Exige rol admin otra vez (el layout no se re-evalúa al
 * navegar, D073). La página, el total y los contadores salen de `admin_users` y
 * `admin_user_counts` (security definer: el correo está en `auth.users`); los filtros, de la
 * URL. Una página fuera de rango vuelve a la última.
 */
export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requireAdmin(PATH);
  const filters = parseUserFilters(await props.searchParams);
  const q = filters.q.trim();

  let users: AdminUser[] = [];
  let counts: UserStateCounts = EMPTY_COUNTS;
  let totalUsers = 0;
  let loadError = false;
  try {
    const [page, searched, everyone] = await Promise.all([
      getAdminUsers(filters),
      getAdminUserCounts(q),
      // Sin búsqueda, los contadores ya son el total; con búsqueda, el encabezado pide el suyo.
      q ? getAdminUserCounts("") : null,
    ]);
    users = page;
    counts = searched;
    totalUsers = (everyone ?? searched).all;
  } catch (error) {
    console.error(error);
    loadError = true;
  }

  const last = pageCount(filteredTotal(counts, filters.state));
  if (!loadError && filters.page > last) {
    redirect(`${PATH}${usersSearch({ ...filters, page: last })}`);
  }

  return (
    <UsersView
      users={users}
      counts={counts}
      totalUsers={totalUsers}
      filters={filters}
      loadError={loadError}
    />
  );
}
