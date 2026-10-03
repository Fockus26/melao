import type { Metadata } from "next";
import Link from "next/link";
import { UsersSkeleton } from "@/components/admin/users/users-skeleton";
import { UsersView } from "@/components/admin/users/users-view";
import { AdminShell } from "@/components/layout/admin-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import {
  type AdminUser,
  EMPTY_COUNTS,
  pageCount,
  pageOffset,
  parseUserFilters,
  USER_STATES,
  USERS_PAGE_SIZE,
  type UserStateCounts,
  type UserSubscriptionState,
} from "@/lib/admin/users";
import { firstParam } from "@/lib/search-params";
import { normalizeText } from "@/lib/songs/songs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Usuarios · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Admin · Usuarios sin sesión ni base (la real exige rol admin): 60 usuarios de
 * ejemplo con nombres y correos largos y cada estado. Búsqueda, chips y páginas funcionan sobre
 * la URL como en la real; aquí la búsqueda y el filtro los imita la muestra (en la real los hace
 * `admin_users`). Los escenarios sin datos van por `?view=`. Nombres y correos inventados, de
 * ejemplo (CONTENT_CHECKLIST fila 85).
 */

const BASE = "/layouts/admin-users";

const VIEWS = {
  list: "Lista",
  empty: "Sin usuarios",
  error: "Error",
  loading: "Cargando",
} as const;
type SampleView = keyof typeof VIEWS;

/** Atajos a estados de la lista que se ven con filtros. */
const SHORTCUTS = [
  { label: "Pago pendiente", search: "?state=past_due" },
  { label: "Página 3", search: "?page=3" },
  { label: "Sin resultados", search: "?q=sin%20coincidencias" },
] as const;

const FIRST = [
  "Ana",
  "Beto",
  "Carla",
  "Daniela",
  "Eduardo",
  "Fernanda",
  "Gabriel",
  "Helena",
  "Iván",
  "Julia",
  "Kevin",
  "Lucía",
  "Martín",
  "Natalia",
  "Óscar",
];
const LAST = [
  "López",
  "Martínez",
  "Núñez",
  "Pérez",
  "Gómez",
  "Ruiz",
  "Hernández",
  "Díaz",
];
const STATE_CYCLE: UserSubscriptionState[] = [
  "active",
  "active",
  "none",
  "past_due",
  "active",
  "expired",
  "canceled",
  "none",
];

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-02T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

function sampleUser(i: number): AdminUser {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 3) % LAST.length];
  const state = STATE_CYCLE[i % STATE_CYCLE.length];
  const slug = normalizeText(`${first}.${last}`).replaceAll(" ", "");
  let name: string | null = `${first} ${last}`;
  let email = `${slug}@example.com`;
  // Casos de borde: nombre de 40, correo largo, sin nombre.
  if (i === 1) name = "María Fernanda de los Ángeles Villanueva";
  if (i === 1)
    email = "mariafernanda.delosangeles.villanueva@correo-de-ejemplo.com";
  if (i === 4) email = "eduardo.gomez.ruiz.bailador.de.casino@example.com";
  if (i === 9) name = null;
  const end =
    state === "active"
      ? NOW + ((i % 27) + 2) * DAY
      : state === "none"
        ? null
        : NOW - ((i % 40) + 3) * DAY;
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    name,
    email,
    appRole: i === 59 ? "admin" : i === 12 ? "teacher" : "student",
    danceRole: i % 5 === 2 ? null : i % 2 === 0 ? "leader" : "follower",
    createdAt: iso(NOW - (i * 3 + 1) * DAY),
    lastSignInAt: i % 4 === 0 ? null : iso(NOW - (i % 9) * DAY),
    planName: state === "none" ? null : i % 3 === 0 ? "Consultoría" : "Básico",
    state,
    currentPeriodEnd: end === null ? null : iso(end),
  };
}

const USERS = Array.from({ length: 60 }, (_, i) => sampleUser(i));

/** Lo que hace `admin_users` en la base, imitado: cada palabra en el nombre o el correo. */
function matches(user: AdminUser, q: string) {
  const words = normalizeText(q).split(" ").filter(Boolean);
  const haystack = normalizeText(`${user.name ?? ""} ${user.email}`);
  return words.every((w) => haystack.includes(w));
}

function countsOf(users: readonly AdminUser[]): UserStateCounts {
  const counts = { ...EMPTY_COUNTS, all: users.length };
  for (const state of USER_STATES) {
    counts[state] = users.filter((u) => u.state === state).length;
  }
  return counts;
}

export default async function AdminUsersSample(
  props: PageProps<"/layouts/admin-users">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.view);
  const view: SampleView = raw && raw in VIEWS ? (raw as SampleView) : "list";
  const filters = parseUserFilters(params);

  const searched = USERS.filter((u) => matches(u, filters.q));
  const filtered = filters.state
    ? searched.filter((u) => u.state === filters.state)
    : searched;
  const page = Math.min(filters.page, pageCount(filtered.length));
  const offset = pageOffset(page);

  return (
    <AdminShell currentPath="/admin/users">
      <div className="flex flex-col gap-12">
        {view === "loading" ? (
          <UsersSkeleton />
        ) : (
          <UsersView
            key={view}
            users={
              view === "list"
                ? filtered.slice(offset, offset + USERS_PAGE_SIZE)
                : []
            }
            counts={view === "list" ? countsOf(searched) : EMPTY_COUNTS}
            totalUsers={view === "list" ? USERS.length : 0}
            filters={{ ...filters, page }}
            loadError={view === "error"}
            basePath={BASE}
          />
        )}
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(VIEWS) as SampleView[]).map((key) => (
              <li key={key}>
                <SampleLink
                  href={key === "list" ? BASE : `${BASE}?view=${key}`}
                  active={key === view}
                >
                  {VIEWS[key]}
                </SampleLink>
              </li>
            ))}
            {SHORTCUTS.map((s) => (
              <li key={s.search}>
                <SampleLink href={`${BASE}${s.search}`} active={false}>
                  {s.label}
                </SampleLink>
              </li>
            ))}
          </ul>
          <ThemeSwitch />
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </section>
      </div>
    </AdminShell>
  );
}

function SampleLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
        active
          ? "border-primary bg-primary font-semibold text-on-primary"
          : "border-border-input text-text hover:bg-hover",
      )}
    >
      {children}
    </Link>
  );
}
