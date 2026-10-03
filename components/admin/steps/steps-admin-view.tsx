"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EditorEmpty } from "@/components/admin/list-editor/editor-card";
import {
  GuardedLink,
  LeaveGuardProvider,
  useLeaveGuard,
} from "@/components/admin/list-editor/leave-guard";
import { ListEditorLayout } from "@/components/admin/list-editor/list-editor-layout";
import {
  ListEmpty,
  ListRow,
  ListRows,
  ListSearch,
  MultiFilterChips,
  SingleFilterChips,
} from "@/components/admin/list-editor/list-pane";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import {
  ADMIN_STEPS_PATH,
  type AdminPosition,
  type AdminStepDetail,
  type AdminStepFilters,
  type AdminStepRow,
  type AdminStyle,
  adminStepsSearch,
  categoryCounts,
  EMPTY_ADMIN_FILTERS,
  filterAdminSteps,
  mergeRows,
  nextSortOrder,
  STATUS_FILTERS,
  type StepSelection,
  statusCounts,
  type VideoRole,
} from "@/lib/admin/steps";
import {
  type AdminStepsPort,
  supabaseAdminSteps,
} from "@/lib/admin/steps-port";
import { type StoragePort, supabaseStorage } from "@/lib/admin/storage";
import { difficultyName } from "@/lib/difficulty";
import { CATEGORY_NAMES, stepCountLabel } from "@/lib/steps/catalog";
import { CATEGORY_SINGULAR } from "@/lib/steps/detail";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StepEditor, type StepEditorProps } from "./step-editor";

// Copy provisional (CONTENT_CHECKLIST fila 82).
const COPY = {
  overline: "Contenido",
  title: "Pasos",
  newStep: "Nuevo paso",
  styleLegend: "Estilo",
  unpublishedStyle: "(sin publicar)",
  listLabel: "Lista de pasos",
  rowsLabel: (style: string) => `Pasos de ${style}`,
  count: (visible: number, total: number) =>
    visible === total
      ? stepCountLabel(total)
      : `${visible} de ${stepCountLabel(total)}`,
  searchLabel: "Buscar pasos",
  searchPlaceholder: "Nombre o slug",
  clearSearch: "Borrar",
  clearSearchSr: "Borrar búsqueda",
  statusLegend: "Estado",
  status: {
    published: "Publicados",
    draft: "Borradores",
    "no-video": "Sin video",
  },
  categoryLegend: "Categoría",
  published: "Publicado",
  draft: "Borrador",
  noVideo: "Sin video",
  noResultsTitle: "No hay pasos con estos filtros",
  noResultsText: "Prueba con otra búsqueda o quita algún filtro.",
  clearFilters: "Limpiar filtros",
  emptyTitle: (style: string) => `Aún no hay pasos de ${style}`,
  emptyText: "Crea el primero con «Nuevo paso».",
  noStyleTitle: "Aún no hay estilos",
  noStyleText: "Crea un estilo antes de cargar sus pasos.",
  pickTitle: "Elige un paso",
  pickText: "Ábrelo desde la lista para editarlo, o crea uno nuevo.",
  notFoundTitle: "No encontramos ese paso",
  notFoundText:
    "Puede que se haya borrado o sea de otro estilo. Elige otro de la lista.",
  back: "Volver a la lista",
  errorTitle: "No pudimos cargar los pasos",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  removed: "Paso borrado.",
} as const;

export type StepsAdminViewProps = {
  styles: readonly AdminStyle[];
  currentStyle: AdminStyle | null;
  positions: readonly AdminPosition[];
  /** `admin_steps` del estilo actual. */
  steps: readonly AdminStepRow[];
  selection: StepSelection;
  /** El paso de `?step=<uuid>`; `null` si no existe en el estilo. */
  detail: AdminStepDetail | null;
  initialFilters?: AdminStepFilters;
  loadError?: boolean;
  /** Ruta de los enlaces (la muestra usa la suya) y parámetros que conserva (`?state=`). */
  basePath?: string;
  extraParams?: Record<string, string>;
  /** Puertos de escritura; sin ellos, los reales con el cliente del navegador. */
  port?: AdminStepsPort;
  storage?: StoragePort;
  /** Muestras: sin red, el paso nuevo no navega (no hay servidor que lo lea). */
  variant?: "live" | "sample";
  /** Muestras: estado inicial del editor y video que arranca subiendo. */
  initialEditorStatus?: StepEditorProps["initialStatus"];
  initialUploading?: VideoRole;
};

/**
 * Admin · Pasos (`/admin/steps`): lista + editor (handoff §3 Admin). Estado en la URL: estilo
 * (`?style=<slug>`), paso abierto (`?step=<uuid>|new`) y filtros (`?q=&status=&category=`), con
 * el contrato del Resumen (`?style=…&step=…`, `?style=…&status=draft`). Búsqueda y filtros en el
 * cliente; lo guardado se refleja en la lista al momento y se relee del servidor.
 */
export function StepsAdminView(props: StepsAdminViewProps) {
  return (
    <LeaveGuardProvider>
      <StepsAdminScreen {...props} />
    </LeaveGuardProvider>
  );
}

function StepsAdminScreen({
  styles,
  currentStyle,
  positions,
  steps,
  selection,
  detail,
  initialFilters = EMPTY_ADMIN_FILTERS,
  loadError = false,
  basePath = ADMIN_STEPS_PATH,
  extraParams = {},
  port: portProp,
  storage: storageProp,
  variant = "live",
  initialEditorStatus,
  initialUploading,
}: StepsAdminViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const guard = useLeaveGuard();
  const ids = { search: useId(), count: useId() };
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState<Record<string, AdminStepRow>>({});
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  // Paso creado en esta visita: la URL pasa de `new` a su id sin volver a montar el editor.
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Cada paso nuevo monta un editor limpio (también tras crear otro en esta visita).
  const [generation, setGeneration] = useState(0);
  const selectionKey =
    selection.kind === "step" ? selection.id : selection.kind;
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    if (selectionKey !== createdId) {
      setCreatedId(null);
      setFlash(null);
      setGeneration((g) => g + 1);
    }
  }
  function startNew() {
    if (guard.dirty) return;
    setCreatedId(null);
    setFlash(null);
    setGeneration((g) => g + 1);
  }

  const [port, storage] = useMemo(() => {
    if (portProp && storageProp) return [portProp, storageProp] as const;
    const client = createClient();
    return [
      portProp ?? supabaseAdminSteps(client),
      storageProp ?? supabaseStorage(client),
    ] as const;
  }, [portProp, storageProp]);

  const rows = useMemo(
    () => mergeRows(steps, saved, removed),
    [steps, saved, removed],
  );
  const visible = filterAdminSteps(rows, filters);
  const counts = statusCounts(rows);
  const categories = categoryCounts(rows);

  const openId =
    selection.kind === "step"
      ? selection.id
      : selection.kind === "new"
        ? createdId
        : null;
  const editorKey =
    selection.kind === "new" ||
    (selection.kind === "step" && selection.id === createdId)
      ? `new-${generation}`
      : (openId ?? "none");
  const openRemoved = openId !== null && removed.has(openId);
  const hasSelection = selection.kind !== "none";

  const href = (state: { step?: string | null; style?: string | null }) =>
    `${basePath}${adminStepsSearch(
      {
        style: state.style === undefined ? currentStyle?.slug : state.style,
        step: state.step,
        filters,
      },
      extraParams,
    )}`;

  function applyFilters(next: AdminStepFilters) {
    setFilters(next);
    // Estado en la URL sin pedir datos otra vez (el router de Next sincroniza `history`).
    window.history.replaceState(
      null,
      "",
      `${pathname}${adminStepsSearch(
        {
          style: currentStyle?.slug,
          step: openId ?? (selection.kind === "new" ? "new" : null),
          filters: next,
        },
        extraParams,
      )}`,
    );
  }

  const header = (
    <AdminPageHeader
      overline={COPY.overline}
      title={COPY.title}
      actions={
        currentStyle && !loadError ? (
          <Button asChild>
            <GuardedLink href={href({ step: "new" })} onClick={startNew}>
              <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
              {COPY.newStep}
            </GuardedLink>
          </Button>
        ) : null
      }
    />
  );

  if (!currentStyle) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <ListEmpty title={COPY.noStyleTitle} text={COPY.noStyleText} />
      </div>
    );
  }

  const styleNav =
    styles.length > 1 ? (
      <nav aria-label={COPY.styleLegend}>
        <ul className="flex w-full max-w-xl flex-wrap rounded-pill border border-border-input p-1">
          {styles.map((s) => {
            const active = s.id === currentStyle.id;
            return (
              <li key={s.id} className="flex flex-1">
                <GuardedLink
                  href={`${basePath}${adminStepsSearch({ style: s.slug }, extraParams)}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-pill px-4 text-center type-small",
                    "transition-colors duration-state ease-standard motion-reduce:transition-none",
                    "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
                    active
                      ? "bg-primary font-semibold text-on-primary"
                      : "font-medium text-text hover:bg-hover",
                  )}
                >
                  {s.name}
                  {s.published ? null : (
                    <span className="type-caption">
                      {COPY.unpublishedStyle}
                    </span>
                  )}
                </GuardedLink>
              </li>
            );
          })}
        </ul>
      </nav>
    ) : null;

  if (loadError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        {styleNav}
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
      </div>
    );
  }

  const list = (
    <>
      <search className="flex flex-col gap-5">
        <ListSearch
          id={ids.search}
          value={filters.q}
          onChange={(q) => applyFilters({ ...filters, q })}
          label={COPY.searchLabel}
          placeholder={COPY.searchPlaceholder}
          clearLabel={COPY.clearSearch}
          clearLabelSr={COPY.clearSearchSr}
          describedBy={ids.count}
        />
        <SingleFilterChips
          legend={COPY.statusLegend}
          options={STATUS_FILTERS.map((s) => ({
            value: s,
            label: COPY.status[s],
            count: counts[s],
          }))}
          value={filters.status}
          onChange={(status) => applyFilters({ ...filters, status })}
        />
        {categories.length > 1 ? (
          <MultiFilterChips
            legend={COPY.categoryLegend}
            options={categories.map((c) => ({
              value: c.category,
              label: CATEGORY_NAMES[c.category],
              count: c.count,
            }))}
            value={filters.categories}
            onChange={(categories) => applyFilters({ ...filters, categories })}
          />
        ) : null}
      </search>
      <p
        id={ids.count}
        aria-live="polite"
        className="type-small tabular-nums text-text-secondary"
      >
        {COPY.count(visible.length, rows.length)}
      </p>
      {rows.length === 0 ? (
        <ListEmpty
          title={COPY.emptyTitle(currentStyle.name)}
          text={COPY.emptyText}
        />
      ) : visible.length === 0 ? (
        <ListEmpty
          title={COPY.noResultsTitle}
          text={COPY.noResultsText}
          action={
            <Button
              variant="outline"
              onClick={() => {
                applyFilters(EMPTY_ADMIN_FILTERS);
                document.getElementById(ids.search)?.focus();
              }}
            >
              {COPY.clearFilters}
            </Button>
          }
        />
      ) : (
        <ListRows label={COPY.rowsLabel(currentStyle.name)}>
          {visible.map((row) => (
            <ListRow
              key={row.id}
              href={href({ step: row.id })}
              current={row.id === openId}
              title={row.name}
              meta={`${CATEGORY_SINGULAR[row.category]} · ${difficultyName(row.difficulty) ?? row.difficulty}`}
              pills={
                <>
                  {row.videosComplete ? null : (
                    <Badge variant="warning">{COPY.noVideo}</Badge>
                  )}
                  <Badge variant={row.published ? "ok" : "neutral"}>
                    {row.published ? COPY.published : COPY.draft}
                  </Badge>
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </>
  );

  let editor: React.ReactNode;
  if (selection.kind === "none" || openRemoved) {
    editor = flash ? (
      <EditorEmpty title={flash} text={COPY.pickText} />
    ) : (
      <EditorEmpty title={COPY.pickTitle} text={COPY.pickText} />
    );
  } else if (
    selection.kind === "step" &&
    !detail &&
    selection.id !== createdId
  ) {
    editor = (
      <EditorEmpty title={COPY.notFoundTitle} text={COPY.notFoundText} />
    );
  } else {
    editor = (
      <StepEditor
        key={editorKey}
        style={currentStyle}
        positions={positions}
        rows={rows}
        detail={
          selection.kind === "step" && selection.id !== createdId
            ? detail
            : null
        }
        newSortOrder={nextSortOrder(rows)}
        initialStatus={initialEditorStatus}
        initialUploading={initialUploading}
        port={port}
        storage={storage}
        onRowChange={(row, created) => {
          setSaved((s) => ({ ...s, [row.id]: row }));
          if (created) {
            setCreatedId(row.id);
            // La URL apunta al paso creado; el editor sigue montado con su estado.
            window.history.replaceState(null, "", href({ step: row.id }));
          }
          if (variant === "live") router.refresh();
        }}
        onRemoved={(id) => {
          setRemoved((r) => new Set(r).add(id));
          setFlash(COPY.removed);
          guard.setDirty(false);
          if (variant === "live") router.replace(href({ step: null }));
          else window.history.replaceState(null, "", href({ step: null }));
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}
      {styleNav}
      <ListEditorLayout
        list={list}
        editor={editor}
        hasSelection={hasSelection}
        back={{ href: href({ step: null }), label: COPY.back }}
        listLabel={COPY.listLabel}
      />
    </div>
  );
}
