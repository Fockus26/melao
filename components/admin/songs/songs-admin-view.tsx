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
  ADMIN_SONGS_PATH,
  type AdminSongDetail,
  type AdminSongFilters,
  type AdminSongRow,
  type AdminSongStyle,
  adminSongsSearch,
  EMPTY_SONG_FILTERS,
  filterAdminSongs,
  mergeSongRows,
  NO_STYLE,
  SONG_STATUS_FILTERS,
  type SongSelection,
  songStatusCounts,
  songStyleCounts,
} from "@/lib/admin/songs";
import {
  type AdminSongsPort,
  supabaseAdminSongs,
} from "@/lib/admin/songs-port";
import { type StoragePort, supabaseStorage } from "@/lib/admin/storage";
import { difficultyName } from "@/lib/difficulty";
import { createClient } from "@/lib/supabase/client";
import { SongEditor, type SongEditorProps } from "./song-editor";

// Copy provisional (CONTENT_CHECKLIST fila 86).
const COPY = {
  overline: "Contenido",
  title: "Canciones",
  newSong: "Nueva canción",
  listLabel: "Lista de canciones",
  rowsLabel: "Canciones",
  count: (visible: number, total: number) => {
    const label = total === 1 ? "1 canción" : `${total} canciones`;
    return visible === total ? label : `${visible} de ${label}`;
  },
  searchLabel: "Buscar canciones",
  searchPlaceholder: "Título o artista",
  clearSearch: "Borrar",
  clearSearchSr: "Borrar búsqueda",
  statusLegend: "Estado",
  status: {
    published: "Publicadas",
    draft: "Borradores",
    "not-ready": "Sin preparar",
    "license-expired": "Licencia vencida",
  },
  styleLegend: "Estilo",
  noStyle: "Sin estilo",
  published: "Publicada",
  draft: "Borrador",
  notReady: "Sin preparar",
  licenseExpired: "Licencia vencida",
  licenseExpiring: "Vence pronto",
  noResultsTitle: "No hay canciones con estos filtros",
  noResultsText: "Prueba con otra búsqueda o quita algún filtro.",
  clearFilters: "Limpiar filtros",
  emptyTitle: "Aún no hay canciones",
  emptyText: "Crea la primera con «Nueva canción».",
  pickTitle: "Elige una canción",
  pickText: "Ábrela desde la lista para editarla, o crea una nueva.",
  notFoundTitle: "No encontramos esa canción",
  notFoundText: "Puede que se haya borrado. Elige otra de la lista.",
  back: "Volver a la lista",
  errorTitle: "No pudimos cargar las canciones",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  removed: "Canción borrada.",
} as const;

export type SongsAdminViewProps = {
  styles: readonly AdminSongStyle[];
  /** `admin_songs`. */
  songs: readonly AdminSongRow[];
  selection: SongSelection;
  /** La canción de `?song=<uuid>`; `null` si no existe. */
  detail: AdminSongDetail | null;
  initialFilters?: AdminSongFilters;
  loadError?: boolean;
  /** Ruta de los enlaces (la muestra usa la suya) y parámetros que conserva (`?state=`). */
  basePath?: string;
  extraParams?: Record<string, string>;
  /** Puertos de escritura; sin ellos, los reales con el cliente del navegador. */
  port?: AdminSongsPort;
  storage?: StoragePort;
  /** Muestras: sin red, la canción nueva no navega (no hay servidor que la lea). */
  variant?: "live" | "sample";
  /** Muestras: estado inicial del editor y archivo que arranca subiendo. */
  initialEditorStatus?: SongEditorProps["initialStatus"];
  initialUploading?: SongEditorProps["initialUploading"];
};

/**
 * Admin · Canciones (`/admin/songs`): lista + editor (handoff §3 Admin). Estado en la URL:
 * canción abierta (`?song=<uuid>|new`, contrato del Resumen) y filtros
 * (`?q=&status=&style=`). Búsqueda y filtros en el cliente; lo guardado se refleja en la lista
 * al momento y se relee del servidor.
 */
export function SongsAdminView(props: SongsAdminViewProps) {
  return (
    <LeaveGuardProvider>
      <SongsAdminScreen {...props} />
    </LeaveGuardProvider>
  );
}

function SongsAdminScreen({
  styles,
  songs,
  selection,
  detail,
  initialFilters = EMPTY_SONG_FILTERS,
  loadError = false,
  basePath = ADMIN_SONGS_PATH,
  extraParams = {},
  port: portProp,
  storage: storageProp,
  variant = "live",
  initialEditorStatus,
  initialUploading,
}: SongsAdminViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const guard = useLeaveGuard();
  const ids = { search: useId(), count: useId() };
  const [filters, setFilters] = useState(initialFilters);
  const [saved, setSaved] = useState<Record<string, AdminSongRow>>({});
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  // Canción creada en esta visita: la URL pasa de `new` a su id sin volver a montar el editor.
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Cada canción nueva monta un editor limpio (también tras crear otra en esta visita).
  const [generation, setGeneration] = useState(0);
  const selectionKey =
    selection.kind === "song" ? selection.id : selection.kind;
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
      portProp ?? supabaseAdminSongs(client),
      storageProp ?? supabaseStorage(client),
    ] as const;
  }, [portProp, storageProp]);

  const rows = useMemo(
    () => mergeSongRows(songs, saved, removed),
    [songs, saved, removed],
  );
  const visible = filterAdminSongs(rows, filters);
  const counts = songStatusCounts(rows);
  const styleChips = songStyleCounts(rows, styles);
  const styleNames = new Map(styles.map((s) => [s.slug, s.name]));

  const openId =
    selection.kind === "song"
      ? selection.id
      : selection.kind === "new"
        ? createdId
        : null;
  const editorKey =
    selection.kind === "new" ||
    (selection.kind === "song" && selection.id === createdId)
      ? `new-${generation}`
      : (openId ?? "none");
  const openRemoved = openId !== null && removed.has(openId);
  const hasSelection = selection.kind !== "none";

  const href = (song: string | null) =>
    `${basePath}${adminSongsSearch({ song, filters }, extraParams)}`;

  function applyFilters(next: AdminSongFilters) {
    setFilters(next);
    // Estado en la URL sin pedir datos otra vez (el router de Next sincroniza `history`).
    window.history.replaceState(
      null,
      "",
      `${pathname}${adminSongsSearch(
        {
          song: openId ?? (selection.kind === "new" ? "new" : null),
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
        loadError ? null : (
          <Button asChild>
            <GuardedLink href={href("new")} onClick={startNew}>
              <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
              {COPY.newSong}
            </GuardedLink>
          </Button>
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
          options={SONG_STATUS_FILTERS.map((s) => ({
            value: s,
            label: COPY.status[s],
            count: counts[s],
          }))}
          value={filters.status}
          onChange={(status) => applyFilters({ ...filters, status })}
        />
        {styleChips.length > 1 ? (
          <MultiFilterChips
            legend={COPY.styleLegend}
            options={styleChips.map((c) => ({
              value: c.value,
              label: c.style ? c.style.name : COPY.noStyle,
              count: c.count,
            }))}
            value={filters.styles}
            onChange={(styles) => applyFilters({ ...filters, styles })}
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
        <ListEmpty title={COPY.emptyTitle} text={COPY.emptyText} />
      ) : visible.length === 0 ? (
        <ListEmpty
          title={COPY.noResultsTitle}
          text={COPY.noResultsText}
          action={
            <Button
              variant="outline"
              onClick={() => {
                applyFilters(EMPTY_SONG_FILTERS);
                document.getElementById(ids.search)?.focus();
              }}
            >
              {COPY.clearFilters}
            </Button>
          }
        />
      ) : (
        <ListRows label={COPY.rowsLabel}>
          {visible.map((row) => {
            const styleText =
              row.styleSlugs.length === 0
                ? COPY.noStyle
                : row.styleSlugs.map((s) => styleNames.get(s) ?? s).join(", ");
            const level =
              row.difficulty === null ? null : difficultyName(row.difficulty);
            return (
              <ListRow
                key={row.id}
                href={href(row.id)}
                current={row.id === openId}
                title={row.title}
                meta={[row.artist, styleText, level]
                  .filter(Boolean)
                  .join(" · ")}
                pills={
                  // A 320 las pills se apilan para no empujar la fila fuera de la pantalla.
                  <span className="flex max-w-32 flex-wrap justify-end gap-1 sm:max-w-none">
                    {row.licenseStatus === "expired" ? (
                      <Badge variant="error">{COPY.licenseExpired}</Badge>
                    ) : row.licenseStatus === "expiring" ? (
                      <Badge variant="warning">{COPY.licenseExpiring}</Badge>
                    ) : null}
                    {row.ready ? null : (
                      <Badge variant="warning">{COPY.notReady}</Badge>
                    )}
                    <Badge variant={row.published ? "ok" : "neutral"}>
                      {row.published ? COPY.published : COPY.draft}
                    </Badge>
                  </span>
                }
              />
            );
          })}
        </ListRows>
      )}
    </>
  );

  // Canción nueva: con el estilo filtrado si hay uno solo (y no es "Sin estilo").
  const filteredStyle =
    filters.styles.length === 1 && filters.styles[0] !== NO_STYLE
      ? styles.find((s) => s.slug === filters.styles[0])
      : undefined;

  let editor: React.ReactNode;
  if (selection.kind === "none" || openRemoved) {
    editor = (
      <EditorEmpty title={flash ?? COPY.pickTitle} text={COPY.pickText} />
    );
  } else if (
    selection.kind === "song" &&
    !detail &&
    selection.id !== createdId
  ) {
    editor = (
      <EditorEmpty title={COPY.notFoundTitle} text={COPY.notFoundText} />
    );
  } else {
    const isExisting = selection.kind === "song" && selection.id !== createdId;
    editor = (
      <SongEditor
        key={editorKey}
        styles={styles}
        detail={isExisting ? detail : null}
        row={
          isExisting ? (rows.find((r) => r.id === selection.id) ?? null) : null
        }
        newStyleIds={filteredStyle ? [filteredStyle.id] : []}
        initialStatus={initialEditorStatus}
        initialUploading={initialUploading}
        port={port}
        storage={storage}
        onRowChange={(row, created) => {
          setSaved((s) => ({ ...s, [row.id]: row }));
          if (created) {
            setCreatedId(row.id);
            // La URL apunta a la canción creada; el editor sigue montado con su estado.
            window.history.replaceState(null, "", href(row.id));
          }
          if (variant === "live") router.refresh();
        }}
        onRemoved={(id) => {
          setRemoved((r) => new Set(r).add(id));
          setFlash(COPY.removed);
          guard.setDirty(false);
          if (variant === "live") router.replace(href(null));
          else window.history.replaceState(null, "", href(null));
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}
      <ListEditorLayout
        list={list}
        editor={editor}
        hasSelection={hasSelection}
        back={{ href: href(null), label: COPY.back }}
        listLabel={COPY.listLabel}
      />
    </div>
  );
}
