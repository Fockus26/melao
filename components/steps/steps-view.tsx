"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { Difficulty } from "@/components/indicators/difficulty";
import { StepStatus } from "@/components/indicators/step-status";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import type { StyleOption } from "@/lib/course/path";
import { difficultyName } from "@/lib/songs/songs";
import {
  CATEGORY_NAMES,
  type CatalogStep,
  dueLabel,
  EMPTY_STEP_FILTERS,
  filterSteps,
  groupByCategory,
  hasActiveStepFilters,
  presentCategories,
  STATUS_OPTIONS,
  STEP_LINKS,
  type StepCategory,
  type StepFilters,
  stepCountLabel,
  stepsSearch,
} from "@/lib/steps/catalog";
import type { UserStepsPort } from "@/lib/steps/favorite";
import { cn } from "@/lib/utils";
import {
  STEP_FAVORITE_COPY,
  StepFavoriteButton,
  useStepFavorites,
} from "./step-favorite";

// Copy provisional (CONTENT_CHECKLIST fila 70).
const COPY = {
  title: "Pasos",
  count: (visible: number, total: number, style: string) =>
    visible === total
      ? `${stepCountLabel(total)} de ${style}`
      : `${visible} de ${stepCountLabel(total)} de ${style}`,
  styleLegend: "Estilo",
  searchLabel: "Buscar pasos",
  searchPlaceholder: "Nombre del paso",
  clearSearch: "Borrar",
  clearSearchSr: "Borrar búsqueda",
  categoryLegend: "Categoría",
  statusLegend: "Estado",
  groupCountSr: (n: number) => ` (${stepCountLabel(n)})`,
  noResultsTitle: "No hay pasos con estos filtros",
  noResultsText: "Prueba con otra búsqueda o quita algún filtro.",
  clearFilters: "Limpiar filtros",
  emptyTitle: (style: string) => `Aún no hay pasos de ${style}`,
  emptyText: "Cuando haya pasos publicados, aparecerán aquí.",
  noStyleTitle: "Aún no hay estilos publicados",
  noStyleText: "Vuelve pronto: estamos preparando el contenido.",
  errorTitle: "No pudimos cargar los pasos",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
} as const;

export type StepsViewProps = {
  /** Estilos publicados (segmentado si hay más de uno). */
  styles: readonly StyleOption[];
  currentStyle: StyleOption | null;
  /** `step_catalog` del estilo actual, en su orden. */
  steps: readonly CatalogStep[];
  initialFilters?: StepFilters;
  /** La lectura falló: aviso con Reintentar. */
  loadError?: boolean;
  /** En `sample` (muestras de `/layouts`) el corazón no escribe nada. */
  variant?: "live" | "sample";
  userId?: string;
  /** Ruta base de los enlaces de estilo y del estado en la URL (la muestra usa la suya). */
  basePath?: string;
  /** Fija "ahora" (muestras y tests); si no, el reloj del dispositivo. */
  now?: string;
  /** Para tests del favorito. */
  favoritePort?: UserStepsPort;
};

/**
 * Pasos · catálogo (App-Pasos). Búsqueda y chips de Categoría y Estado en el cliente sobre la
 * lista del estilo (D128), con la URL como estado (`?q=&category=&status=`) sin volver a pedir
 * datos. Grupos por categoría; cada fila enlaza al detalle y el corazón, aparte, alterna el
 * favorito (`user_steps`, D129) sin navegar. El estado del paso se muestra, no se cambia aquí.
 */
export function StepsView({
  styles,
  currentStyle,
  steps,
  initialFilters = EMPTY_STEP_FILTERS,
  loadError = false,
  variant = "live",
  userId,
  basePath = STEP_LINKS.catalog,
  now,
  favoritePort,
}: StepsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<StepFilters>(initialFilters);
  const favorites = useStepFavorites({ userId, variant, port: favoritePort });
  const ids = { search: useId(), count: useId() };

  const styleId = currentStyle?.id ?? null;
  const visible = filterSteps(steps, filters);
  const groups = groupByCategory(visible);
  const categories = presentCategories(steps);

  function applyFilters(next: StepFilters) {
    setFilters(next);
    // Estado en la URL sin pedir datos otra vez (el router de Next sincroniza `history`).
    window.history.replaceState(
      null,
      "",
      `${pathname}${stepsSearch({ style: styleId }, next)}`,
    );
  }

  function toggleIn<T>(
    list: readonly T[],
    value: T,
    on: boolean,
    order: readonly T[],
  ) {
    const set = new Set(list);
    if (on) set.add(value);
    else set.delete(value);
    return order.filter((v) => set.has(v));
  }

  const header = (
    <header className="flex flex-col gap-2 border-b border-divider pb-4">
      <h1 className="type-display">{COPY.title}</h1>
      {currentStyle && steps.length > 0 && !loadError ? (
        <p
          id={ids.count}
          aria-live="polite"
          className="type-small text-text-secondary tabular-nums"
        >
          {COPY.count(visible.length, steps.length, currentStyle.name)}
        </p>
      ) : null}
    </header>
  );

  if (!currentStyle) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState title={COPY.noStyleTitle} text={COPY.noStyleText} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      {styles.length > 1 ? (
        <nav aria-label={COPY.styleLegend}>
          <ul className="flex w-full max-w-md rounded-pill border border-border-input p-1">
            {styles.map((s) => {
              const active = s.id === currentStyle.id;
              return (
                <li key={s.id} className="flex flex-1">
                  <Link
                    href={`${basePath}${stepsSearch({ style: s.id }, filters)}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-pill px-4 type-small",
                      "transition-colors duration-state ease-standard motion-reduce:transition-none",
                      // Zona táctil de 48: cubre el padding del contenedor.
                      "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
                      active
                        ? "bg-primary font-semibold text-on-primary"
                        : "font-medium text-text hover:bg-hover",
                    )}
                  >
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {loadError ? (
        <Alert variant="error">
          <AlertContent>
            <AlertTitle>{COPY.errorTitle}</AlertTitle>
            <AlertDescription>{COPY.errorText}</AlertDescription>
          </AlertContent>
          <AlertAction>
            <Button variant="outline" onClick={() => router.refresh()}>
              {COPY.retry}
            </Button>
          </AlertAction>
        </Alert>
      ) : steps.length === 0 ? (
        <EmptyState
          title={COPY.emptyTitle(currentStyle.name)}
          text={COPY.emptyText}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <search className="flex flex-col gap-5">
            <label htmlFor={ids.search} className="sr-only">
              {COPY.searchLabel}
            </label>
            {/* SearchField (handoff §2): solo línea inferior; foco = línea de 2 px. */}
            <div
              className={cn(
                "flex h-13 items-center gap-3 border-b border-border-input",
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
                value={filters.q}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="search"
                placeholder={COPY.searchPlaceholder}
                aria-describedby={ids.count}
                onChange={(e) =>
                  applyFilters({ ...filters, q: e.currentTarget.value })
                }
                className={cn(
                  "h-full min-w-0 flex-1 bg-transparent type-body text-text outline-none placeholder:text-text-muted",
                  "[&::-webkit-search-cancel-button]:appearance-none",
                )}
              />
              {filters.q ? (
                <Button
                  variant="quiet"
                  className="type-small font-semibold"
                  onClick={() => {
                    applyFilters({ ...filters, q: "" });
                    document.getElementById(ids.search)?.focus();
                  }}
                >
                  <span aria-hidden="true">{COPY.clearSearch}</span>
                  <span className="sr-only">{COPY.clearSearchSr}</span>
                </Button>
              ) : null}
            </div>

            {categories.length > 1 ? (
              <ChipGroup legend={COPY.categoryLegend}>
                {categories.map((category) => (
                  <Toggle
                    key={category}
                    variant="chip"
                    pressed={filters.categories.includes(category)}
                    onPressedChange={(on) =>
                      applyFilters({
                        ...filters,
                        categories: toggleIn<StepCategory>(
                          filters.categories,
                          category,
                          on,
                          categories,
                        ),
                      })
                    }
                  >
                    {CATEGORY_NAMES[category]}
                  </Toggle>
                ))}
              </ChipGroup>
            ) : null}

            <ChipGroup legend={COPY.statusLegend}>
              {STATUS_OPTIONS.map((status) => (
                <Toggle
                  key={status}
                  variant="chip"
                  pressed={filters.statuses.includes(status)}
                  onPressedChange={(on) =>
                    applyFilters({
                      ...filters,
                      statuses: toggleIn(
                        filters.statuses,
                        status,
                        on,
                        STATUS_OPTIONS,
                      ),
                    })
                  }
                >
                  <StepStatus status={status} />
                </Toggle>
              ))}
            </ChipGroup>
          </search>

          {favorites.error ? (
            <Alert variant="error">
              <AlertContent>
                <AlertDescription>{STEP_FAVORITE_COPY.error}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {groups.length > 0 ? (
            <div className="flex flex-col gap-10">
              {groups.map((group) => {
                const headingId = `steps-${group.category}`;
                return (
                  <section
                    key={group.category}
                    aria-labelledby={headingId}
                    className="flex flex-col"
                  >
                    <header className="flex items-baseline justify-between gap-4 border-b border-divider pb-2">
                      <h2
                        id={headingId}
                        className="type-overline text-text-secondary"
                      >
                        {CATEGORY_NAMES[group.category]}
                        <span className="sr-only">
                          {COPY.groupCountSr(group.steps.length)}
                        </span>
                      </h2>
                      <p
                        aria-hidden="true"
                        className="shrink-0 type-small tabular-nums text-text-secondary"
                      >
                        {group.steps.length}
                      </p>
                    </header>
                    <ul className="flex flex-col">
                      {group.steps.map((step) => (
                        <StepRow
                          key={step.id}
                          step={step}
                          favorite={favorites.isFavorite(step)}
                          onToggleFavorite={() => favorites.toggle(step)}
                          now={now}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={COPY.noResultsTitle}
              text={COPY.noResultsText}
              action={
                hasActiveStepFilters(filters) ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      applyFilters(EMPTY_STEP_FILTERS);
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
        </div>
      )}
    </div>
  );
}

/** Fieldset de chips con su leyenda visible en overline. */
function ChipGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 type-overline text-text-secondary">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/**
 * Fila de paso: el enlace al detalle (nombre en h4; metadatos con wrap: estado, dificultad con
 * su nombre y próximo repaso) y, aparte y sin anidar, el corazón de 48.
 */
function StepRow({
  step,
  favorite,
  onToggleFavorite,
  now,
}: {
  step: CatalogStep;
  favorite: boolean;
  onToggleFavorite: () => void;
  now?: string;
}) {
  const level = difficultyName(step.difficulty);
  return (
    <li className="flex items-center gap-2 border-b border-divider">
      <Link
        href={STEP_LINKS.step(step.slug)}
        className={cn(
          "flex min-h-18 min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pr-2",
          "rounded-sm transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none",
        )}
      >
        <span className="type-h4 text-text">{step.name}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 type-small text-text-secondary">
          <StepStatus status={step.status} />
          <Difficulty
            level={step.difficulty}
            label={level ?? undefined}
            className="gap-1.5"
          />
          <DueText dueAt={step.dueAt} now={now} />
        </span>
      </Link>
      <StepFavoriteButton
        name={step.name}
        favorite={favorite}
        onToggle={onToggleFavorite}
      />
    </li>
  );
}

const noop = () => () => {};

/**
 * "Repaso en 9 días" por días de calendario del dispositivo. El servidor (y la hidratación) lo
 * escriben en UTC, igual en los dos lados; después React lo cambia al día local (TodayLabel).
 */
function DueText({ dueAt, now }: { dueAt: string | null; now?: string }) {
  const at = () => (now ? new Date(now) : new Date());
  const text = useSyncExternalStore(
    noop,
    () => dueLabel(dueAt, at()),
    () => dueLabel(dueAt, at(), "UTC"),
  );
  return text ? <span className="tabular-nums">{text}</span> : null;
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
