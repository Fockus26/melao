import type { DanceRole } from "@/lib/course/path";
import { ROLE_LABELS, SUBSCRIPTION_PILLS } from "@/lib/profile/profile";
import type { Database } from "@/supabase/functions/_shared/database.types";

/**
 * Admin · Usuarios (`/admin/users`, solo lectura): tipos, filtros de la URL, páginas y textos.
 * Sin reglas de negocio: quién se lista, su correo, la suscripción que cuenta y su estado los
 * decide `public.admin_users` / `admin_user_counts` (D003, D156, D157). Puro, para `bun test`.
 * Copy provisional (CONTENT_CHECKLIST fila 85).
 */

/** Estado de la suscripción en la lista: los de `my_subscription()` + `none` (sin ninguna). */
export type UserSubscriptionState =
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "none";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Una fila de `admin_users`, ya con nombres de TS. */
export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  appRole: AppRole;
  danceRole: DanceRole | null;
  /** Alta (`profiles.created_at`). */
  createdAt: string;
  lastSignInAt: string | null;
  planName: string | null;
  state: UserSubscriptionState;
  /** Fin del período de la suscripción que cuenta; `null` sin suscripción. */
  currentPeriodEnd: string | null;
};

/** Cuántos usuarios hay en cada estado con la búsqueda puesta (`admin_user_counts`). */
export type UserStateCounts = Record<UserSubscriptionState | "all", number>;

export const EMPTY_COUNTS: UserStateCounts = {
  all: 0,
  active: 0,
  past_due: 0,
  canceled: 0,
  expired: 0,
  none: 0,
};

/** Usuarios por página. */
export const USERS_PAGE_SIZE = 25;

/** Largo máximo de la búsqueda (la función corta igual a 120). */
export const USERS_QUERY_MAX = 120;

/** Orden de los chips de estado (después de "Todos"). */
export const USER_STATES: readonly UserSubscriptionState[] = [
  "active",
  "past_due",
  "canceled",
  "expired",
  "none",
];

const isUserState = (v: unknown): v is UserSubscriptionState =>
  typeof v === "string" && (USER_STATES as readonly string[]).includes(v);

/** Filtros de la lista; viven en la URL (`?q=&state=past_due&page=2`). */
export type UserFilters = {
  q: string;
  state: UserSubscriptionState | null;
  /** 1…N. */
  page: number;
};

export const EMPTY_USER_FILTERS: UserFilters = { q: "", state: null, page: 1 };

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Lee los filtros de la URL; lo que no se entiende se ignora (nunca falla). */
export function parseUserFilters(params: RawParams): UserFilters {
  const q = (first(params.q) ?? "").slice(0, USERS_QUERY_MAX);
  const state = first(params.state);
  const page = Number.parseInt(first(params.page) ?? "", 10);
  return {
    q,
    state: isUserState(state) ? state : null,
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** `?q=&state=&page=` sin los vacíos ni la página 1 ("" sin filtros). */
export function usersSearch(filters: UserFilters): string {
  const params = new URLSearchParams();
  const q = filters.q.trim();
  if (q) params.set("q", q);
  if (filters.state) params.set("state", filters.state);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export const hasActiveUserFilters = (f: UserFilters) =>
  f.q.trim() !== "" || f.state !== null;

/** Total con los filtros puestos: el del chip elegido. */
export const filteredTotal = (
  counts: UserStateCounts,
  state: UserFilters["state"],
) => counts[state ?? "all"];

export const pageCount = (total: number) =>
  Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

/** `p_offset` de una página (1…N). */
export const pageOffset = (page: number) =>
  (Math.max(page, 1) - 1) * USERS_PAGE_SIZE;

/** "26–50" de la página; "" sin filas. */
export function pageRange(page: number, rowsOnPage: number): string {
  if (rowsOnPage === 0) return "";
  const from = pageOffset(page) + 1;
  return `${from}–${from + rowsOnPage - 1}`;
}

// ── Filas ────────────────────────────────────────────────────────────────────

type UserRow =
  Database["public"]["Functions"]["admin_users"]["Returns"][number];

/** Fila de `admin_users` → `AdminUser`. Un estado desconocido se trata como `none`. */
export function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.user_id,
    name: row.display_name ?? null,
    email: row.email,
    appRole: row.app_role,
    danceRole: row.dance_role ?? null,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
    planName: row.plan_name ?? null,
    state: isUserState(row.state) ? row.state : "none",
    currentPeriodEnd: row.current_period_end ?? null,
  };
}

type CountsRow =
  Database["public"]["Functions"]["admin_user_counts"]["Returns"][number];

export function toUserStateCounts(row: CountsRow | undefined): UserStateCounts {
  if (!row) return EMPTY_COUNTS;
  return {
    all: row.all_count,
    active: row.active_count,
    past_due: row.past_due_count,
    canceled: row.canceled_count,
    expired: row.expired_count,
    none: row.none_count,
  };
}

// ── Textos ───────────────────────────────────────────────────────────────────

/** Pill del estado: los de Perfil + "Sin plan". Siempre con texto. */
export const USER_STATE_PILLS: Record<
  UserSubscriptionState,
  { label: string; variant: "ok" | "warning" | "neutral" }
> = {
  ...SUBSCRIPTION_PILLS,
  none: { label: "Sin plan", variant: "neutral" },
};

/** Inicio de la celda "Renueva o vence", antes de la fecha. */
export const USER_PERIOD_PREFIX: Record<
  Exclude<UserSubscriptionState, "none">,
  string
> = {
  active: "Renueva el",
  past_due: "Pendiente desde el",
  canceled: "Terminó el",
  expired: "Venció el",
};

/** Rol de app indicado junto al nombre; el alumno no lleva nada. */
export const APP_ROLE_LABELS: Record<AppRole, string | null> = {
  student: null,
  teacher: "Profesor",
  admin: "Admin",
};

export const danceRoleLabel = (role: DanceRole | null) =>
  role ? ROLE_LABELS[role] : null;

/** "1 usuario", "128 usuarios". */
export const userCountLabel = (n: number) =>
  `${n.toLocaleString("es-419")} ${n === 1 ? "usuario" : "usuarios"}`;

/** Fecha corta ("30 oct 2026"); en `timeZone` si se da, si no la del dispositivo. */
export function shortDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-419", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}
