"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { ToggleCheck, toggleVariants } from "@/components/ui/toggle";
import {
  type AdminUser,
  EMPTY_USER_FILTERS,
  filteredTotal,
  hasActiveUserFilters,
  pageCount,
  pageRange,
  USER_STATE_PILLS,
  USER_STATES,
  USERS_QUERY_MAX,
  type UserFilters,
  type UserStateCounts,
  userCountLabel,
  usersSearch,
} from "@/lib/admin/users";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "../admin-page-header";
import { UsersTable } from "./users-table";

// Copy provisional (CONTENT_CHECKLIST fila 85).
const COPY = {
  overline: "Alumnos",
  title: "Usuarios",
  searchLabel: "Buscar usuarios",
  searchPlaceholder: "Nombre o correo",
  clearSearch: "Borrar",
  clearSearchSr: "Borrar búsqueda",
  stateLegend: "Estado de la suscripción",
  all: "Todos",
  countSr: (n: number) => (n === 1 ? " usuario" : " usuarios"),
  showing: (range: string, total: number) =>
    `Mostrando ${range} de ${userCountLabel(total)}`,
  noneShown: "Ningún usuario con estos filtros",
  emptyTitle: "Aún no hay usuarios",
  emptyText: "Cuando alguien cree su cuenta, aparecerá aquí.",
  noResultsTitle: "No hay usuarios con estos filtros",
  noResultsText: "Prueba con otra búsqueda o elige otro estado.",
  clearFilters: "Limpiar filtros",
  errorTitle: "No pudimos cargar los usuarios",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  pagination: "Páginas de usuarios",
  previous: "Anterior",
  next: "Siguiente",
  pageOf: (page: number, pages: number) => `Página ${page} de ${pages}`,
} as const;

/** Espera de la búsqueda mientras se escribe antes de pedir la lista otra vez. */
const SEARCH_DEBOUNCE_MS = 350;

export type UsersViewProps = {
  /** La página de `admin_users` con los filtros de la URL. */
  users: readonly AdminUser[];
  /** `admin_user_counts` con la búsqueda puesta: chips y páginas. */
  counts: UserStateCounts;
  /** Usuarios en total, sin filtros: el contador del encabezado. */
  totalUsers: number;
  filters: UserFilters;
  /** La lectura falló: aviso con Reintentar. */
  loadError?: boolean;
  /** Ruta de los enlaces de filtros y páginas (la muestra usa la suya). */
  basePath?: string;
};

/**
 * Admin · Usuarios, solo lectura (handoff §3 Admin, D156). La búsqueda, el estado y la página
 * viven en la URL (`?q=&state=&page=`) y cada cambio pide la página al servidor: la lista se
 * pagina en la base, no en el cliente. Chips de estado con su contador (D157), tabla real con
 * cabeceras y paginación de 48. No edita nada.
 */
export function UsersView({
  users,
  counts,
  totalUsers,
  filters,
  loadError = false,
  basePath = "/admin/users",
}: UsersViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ids = { search: useId(), summary: useId() };

  // La búsqueda se escribe aquí y llega a la URL con una pausa. Si la URL cambia por otro lado
  // (atrás/adelante), manda la URL; si es la que pidió este campo, se conserva lo que se siguió
  // escribiendo mientras llegaba.
  const [query, setQuery] = useState(filters.q);
  const [urlQuery, setUrlQuery] = useState(filters.q);
  const [sentQuery, setSentQuery] = useState(filters.q);
  if (filters.q !== urlQuery) {
    setUrlQuery(filters.q);
    if (filters.q !== sentQuery) setQuery(filters.q);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const href = (next: UserFilters) => `${basePath}${usersSearch(next)}`;

  function go(next: UserFilters) {
    if (timer.current) clearTimeout(timer.current);
    setSentQuery(next.q.trim());
    startTransition(() => router.replace(href(next), { scroll: false }));
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => go({ ...filters, q: value, page: 1 }),
      SEARCH_DEBOUNCE_MS,
    );
  }

  const total = filteredTotal(counts, filters.state);
  const pages = pageCount(total);
  const page = Math.min(filters.page, pages);
  const filtered = hasActiveUserFilters(filters);

  const header = (
    <AdminPageHeader
      overline={COPY.overline}
      title={COPY.title}
      actions={
        loadError ? null : (
          <p className="type-small tabular-nums text-text-secondary">
            {userCountLabel(totalUsers)}
          </p>
        )
      }
    />
  );

  if (loadError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <Alert variant="error">
          <AlertContent>
            <AlertTitle>{COPY.errorTitle}</AlertTitle>
            <AlertDescription>{COPY.errorText}</AlertDescription>
          </AlertContent>
          <AlertAction>
            <Button
              variant="outline"
              loading={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              {COPY.retry}
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  if (totalUsers === 0) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState title={COPY.emptyTitle} text={COPY.emptyText} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <search className="flex flex-col gap-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ ...filters, q: query, page: 1 });
          }}
        >
          <label htmlFor={ids.search} className="sr-only">
            {COPY.searchLabel}
          </label>
          {/* SearchField (handoff §2): solo línea inferior; foco = línea de 2 px. */}
          <div
            className={cn(
              "flex h-13 max-w-xl items-center gap-3 border-b border-border-input",
              "transition-[border-color,box-shadow] duration-hover ease-standard motion-reduce:transition-none",
              "hover:border-text has-focus-visible:border-text has-focus-visible:shadow-[0_1px_0_0_var(--color-text)]",
            )}
          >
            <Search
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="size-6 shrink-0 text-text-secondary"
            />
            <input
              id={ids.search}
              type="search"
              value={query}
              maxLength={USERS_QUERY_MAX}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder={COPY.searchPlaceholder}
              aria-describedby={ids.summary}
              onChange={(e) => onQueryChange(e.currentTarget.value)}
              className={cn(
                "h-full min-w-0 flex-1 bg-transparent type-body text-text outline-none placeholder:text-text-muted",
                "[&::-webkit-search-cancel-button]:appearance-none",
              )}
            />
            {query ? (
              <Button
                type="button"
                variant="quiet"
                className="type-small font-semibold"
                onClick={() => {
                  setQuery("");
                  go({ ...filters, q: "", page: 1 });
                  document.getElementById(ids.search)?.focus();
                }}
              >
                <span aria-hidden="true">{COPY.clearSearch}</span>
                <span className="sr-only">{COPY.clearSearchSr}</span>
              </Button>
            ) : null}
          </div>
        </form>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 type-overline text-text-secondary">
            {COPY.stateLegend}
          </legend>
          <ul className="flex flex-wrap gap-2">
            <StateChip
              href={href({ ...filters, state: null, page: 1 })}
              active={filters.state === null}
              label={COPY.all}
              count={counts.all}
            />
            {USER_STATES.map((state) => (
              <StateChip
                key={state}
                href={href({ ...filters, state, page: 1 })}
                active={filters.state === state}
                label={USER_STATE_PILLS[state].label}
                count={counts[state]}
              />
            ))}
          </ul>
        </fieldset>
      </search>

      <section
        aria-labelledby={ids.summary}
        aria-busy={pending || undefined}
        className={cn(
          "flex flex-col gap-4 transition-opacity duration-state ease-standard motion-reduce:transition-none",
          pending && "opacity-60",
        )}
      >
        <p
          id={ids.summary}
          aria-live="polite"
          className="type-small tabular-nums text-text-secondary"
        >
          {users.length > 0
            ? COPY.showing(pageRange(page, users.length), total)
            : COPY.noneShown}
        </p>

        {users.length > 0 ? (
          <>
            <UsersTable users={users} caption={COPY.pageOf(page, pages)} />
            {pages > 1 ? (
              <nav
                aria-label={COPY.pagination}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <PageLink
                  href={page > 1 ? href({ ...filters, page: page - 1 }) : null}
                  label={COPY.previous}
                />
                <p className="type-small tabular-nums text-text-secondary">
                  {COPY.pageOf(page, pages)}
                </p>
                <PageLink
                  href={
                    page < pages ? href({ ...filters, page: page + 1 }) : null
                  }
                  label={COPY.next}
                />
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={COPY.noResultsTitle}
            text={COPY.noResultsText}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    go(EMPTY_USER_FILTERS);
                    // El botón desaparece: el foco vuelve a la búsqueda.
                    document.getElementById(ids.search)?.focus();
                  }}
                >
                  {COPY.clearFilters}
                </Button>
              ) : null
            }
          />
        )}
      </section>
    </div>
  );
}

/**
 * Chip de estado (handoff §2, chip de 40 con zona táctil de 48) como enlace: elige un estado y
 * vuelve a la página 1. El elegido lleva check y `aria-current`, no solo color.
 */
function StateChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        replace
        aria-current={active ? "true" : undefined}
        data-state={active ? "on" : "off"}
        className={toggleVariants({ variant: "chip" })}
      >
        <ToggleCheck />
        {label}
        <span className="tabular-nums">
          {count.toLocaleString("es-419")}
          <span className="sr-only">{COPY.countSr(count)}</span>
        </span>
      </Link>
    </li>
  );
}

/** Anterior / Siguiente de 48; en el extremo, deshabilitado (el texto de la página explica). */
function PageLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <Button variant="outline" disabled>
        {label}
      </Button>
    );
  }
  return (
    <Button variant="outline" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-md border border-divider bg-surface p-5">
      <h2 className="type-h4">{title}</h2>
      <p className="type-body text-text-secondary">{text}</p>
      {action}
    </section>
  );
}
