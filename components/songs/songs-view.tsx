"use client";

import { ArrowLeft, Heart, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useId, useRef, useState } from "react";
import { Difficulty } from "@/components/indicators/difficulty";
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
import { signInPathFor } from "@/lib/auth/redirect";
import type { StyleOption } from "@/lib/course/path";
import {
  backHref,
  countLabel,
  DIFFICULTY_NAMES,
  DIFFICULTY_OPTIONS,
  type DifficultyLevel,
  difficultyName,
  EMPTY_FILTERS,
  filterSongs,
  hasActiveFilters,
  type PracticeSong,
  practiceHref,
  type SongFilters,
  songFacts,
  songsSearch,
} from "@/lib/songs/songs";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Copy provisional (CONTENT_CHECKLIST fila 65).
const COPY = {
  back: "Volver",
  backSr: " a Practicar",
  title: "Canciones",
  styleLegend: "Estilo",
  searchLabel: "Buscar canciones",
  searchPlaceholder: "Título o artista",
  clearSearch: "Borrar",
  clearSearchSr: "Borrar búsqueda",
  filtersLabel: "Filtros",
  favorites: "Favoritas",
  favoriteAdd: (title: string) => `Agregar ${title} a favoritas`,
  favoriteError: "No pudimos guardar tu favorita. Inténtalo de nuevo.",
  notReady: "Aún no está lista",
  noResultsTitle: "No hay canciones con estos filtros",
  noResultsText: "Prueba con otra búsqueda o quita algún filtro.",
  clearFilters: "Quitar filtros",
  noFavoritesTitle: "Todavía no tienes favoritas",
  noFavoritesText:
    "Toca el corazón de una canción para encontrarla rápido aquí.",
  showAll: "Ver todas",
  emptyTitle: (style: string) => `Aún no hay canciones de ${style}`,
  emptyText: "Cuando haya canciones listas para practicar, aparecerán aquí.",
  noStyleTitle: "Aún no hay estilos para practicar",
  noStyleText: "Vuelve pronto: estamos preparando el contenido.",
  errorTitle: "No pudimos cargar las canciones",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
} as const;

export type SongsViewProps = {
  /** Estilos publicados (segmentado si hay más de uno). */
  styles: readonly StyleOption[];
  currentStyle: StyleOption | null;
  /** `practice_songs` del estilo actual, en su orden. */
  songs: readonly PracticeSong[];
  initialFilters?: SongFilters;
  /** `mode` y `song` del configurador: se conservan al volver y al elegir (contrato del brief). */
  mode?: string | null;
  song?: string | null;
  /** La lectura falló: aviso con Reintentar. */
  loadError?: boolean;
  /** En `sample` (muestras de `/layouts`) el corazón no escribe nada. */
  variant?: "live" | "sample";
  userId?: string;
  /** Ruta base de los enlaces de estilo y del estado en la URL (la muestra usa la suya). */
  basePath?: string;
};

/**
 * Practicar · canciones (App-Canciones). Búsqueda y filtros en el cliente sobre la lista del
 * estilo (es corta), con la URL como estado (`?q=&difficulty=&favorites=1`) sin volver a pedir
 * datos. Elegir una fila abre el configurador con la canción; el corazón es un botón aparte que
 * alterna la favorita (`user_song_favorites`, RLS) de forma optimista y la revierte si falla.
 */
export function SongsView({
  styles,
  currentStyle,
  songs,
  initialFilters = EMPTY_FILTERS,
  mode = null,
  song = null,
  loadError = false,
  variant = "live",
  userId,
  basePath = "/app/practice/songs",
}: SongsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<SongFilters>(initialFilters);
  // Favorita según el alumno, por encima de lo que trajo el servidor.
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  // Desmarcadas con el filtro de favoritas puesto: siguen en la lista hasta cambiar los filtros
  // (que la fila no desaparezca bajo el dedo ni se pierda el foco).
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const [favoriteError, setFavoriteError] = useState(false);
  const pending = useRef(new Map<string, Promise<void>>());
  const ids = { search: useId(), count: useId() };

  const styleId = currentStyle?.id ?? null;
  const withFavorites = songs.map((s) => ({
    ...s,
    favorite: favorites[s.id] ?? s.favorite,
  }));
  const visible = filterSongs(
    withFavorites.map((s) =>
      kept.has(s.id) && filters.favorites ? { ...s, favorite: true } : s,
    ),
    filters,
  );
  const anyFavorite = withFavorites.some((s) => s.favorite || kept.has(s.id));

  function applyFilters(next: SongFilters) {
    setFilters(next);
    setKept(new Set());
    // Estado en la URL sin pedir datos otra vez (el router de Next sincroniza `history`).
    const search = songsSearch({ style: styleId, mode, song }, next);
    window.history.replaceState(null, "", `${pathname}${search}`);
  }

  function toggleLevel(level: DifficultyLevel, on: boolean) {
    const set = new Set(filters.difficulty);
    if (on) set.add(level);
    else set.delete(level);
    applyFilters({
      ...filters,
      difficulty: [...set].sort((a, b) => a - b),
    });
  }

  function toggleFavorite(item: PracticeSong) {
    const next = !item.favorite;
    setFavoriteError(false);
    setFavorites((f) => ({ ...f, [item.id]: next }));
    if (filters.favorites && !next) setKept((k) => new Set(k).add(item.id));
    if (filters.favorites && next)
      setKept((k) => {
        const copy = new Set(k);
        copy.delete(item.id);
        return copy;
      });
    if (variant === "sample" || !userId) return;
    // En fila por canción: dos toques rápidos escriben en orden y gana el último.
    const previous = pending.current.get(item.id) ?? Promise.resolve();
    const run = previous.then(async () => {
      const table = createClient().from("user_song_favorites");
      const { error } = next
        ? await table.insert({ user_id: userId, song_id: item.id })
        : await table.delete().eq("user_id", userId).eq("song_id", item.id);
      // Ya estaba (doble pestaña): el estado deseado se cumple.
      if (!error || error.code === "23505") return;
      if (error.code === "PGRST301" || error.message.includes("JWT")) {
        router.replace(signInPathFor(`${pathname}${window.location.search}`));
        return;
      }
      setFavorites((f) => ({ ...f, [item.id]: !next }));
      setFavoriteError(true);
    });
    pending.current.set(item.id, run);
  }

  const header = (
    <header className="flex flex-col gap-4">
      <Button asChild variant="quiet" className="self-start no-underline">
        <Link href={backHref({ style: styleId, song, mode })}>
          <ArrowLeft aria-hidden="true" strokeWidth={ICON_STROKE} />
          {COPY.back}
          <span className="sr-only">{COPY.backSr}</span>
        </Link>
      </Button>
      <h1 className="type-display">{COPY.title}</h1>
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
                    href={`${basePath}${songsSearch({ style: s.id, mode, song }, filters)}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-pill px-4 type-small font-medium text-text",
                      "transition-colors duration-state ease-standard motion-reduce:transition-none",
                      // Zona táctil de 48: cubre el padding del contenedor.
                      "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
                      active
                        ? "bg-primary font-semibold text-on-primary"
                        : "hover:bg-hover",
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
      ) : songs.length === 0 ? (
        <EmptyState
          title={COPY.emptyTitle(currentStyle.name)}
          text={COPY.emptyText}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <search className="flex flex-col gap-4">
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

            <fieldset>
              <legend className="sr-only">{COPY.filtersLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((level) => (
                  <Toggle
                    key={level}
                    variant="chip"
                    pressed={filters.difficulty.includes(level)}
                    onPressedChange={(on) => toggleLevel(level, on)}
                  >
                    {DIFFICULTY_NAMES[level]}
                  </Toggle>
                ))}
                <Toggle
                  variant="chip"
                  pressed={filters.favorites}
                  onPressedChange={(on) =>
                    applyFilters({ ...filters, favorites: on })
                  }
                >
                  {COPY.favorites}
                </Toggle>
              </div>
            </fieldset>
          </search>

          <p
            id={ids.count}
            aria-live="polite"
            className="type-small text-text-secondary tabular-nums"
          >
            {countLabel(visible.length)}
          </p>

          {favoriteError ? (
            <Alert variant="error">
              <AlertContent>
                <AlertDescription>{COPY.favoriteError}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {visible.length > 0 ? (
            <ul className="flex flex-col border-t border-divider">
              {visible.map((item) => (
                <SongRow
                  key={item.id}
                  song={item}
                  href={practiceHref(item.id, currentStyle.id, mode)}
                  onToggleFavorite={() => toggleFavorite(item)}
                />
              ))}
            </ul>
          ) : filters.favorites && !anyFavorite ? (
            <EmptyState
              title={COPY.noFavoritesTitle}
              text={COPY.noFavoritesText}
              action={
                <Button
                  variant="outline"
                  onClick={() => applyFilters({ ...filters, favorites: false })}
                >
                  {COPY.showAll}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={COPY.noResultsTitle}
              text={COPY.noResultsText}
              action={
                hasActiveFilters(filters) ? (
                  <Button
                    variant="outline"
                    onClick={() => applyFilters(EMPTY_FILTERS)}
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

/**
 * Fila de canción: el enlace (título en 2 líneas como máximo, artista en 1, "184 BPM · 4:05 ·
 * ▮▮▯ Media") y, aparte y sin anidar, el corazón de 48 con `aria-pressed`.
 */
function SongRow({
  song,
  href,
  onToggleFavorite,
}: {
  song: PracticeSong;
  href: string;
  onToggleFavorite: () => void;
}) {
  const facts = songFacts(song);
  const level =
    song.difficulty !== null ? difficultyName(song.difficulty) : null;
  return (
    <li className="flex items-center gap-2 border-b border-divider">
      <Link
        href={href}
        className={cn(
          "flex min-h-18 min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-2",
          "rounded-sm transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none",
        )}
      >
        <span className="line-clamp-2 type-body font-semibold text-text">
          {song.title}
        </span>
        <span className="truncate type-small text-text-secondary">
          {song.artist}
        </span>
        {facts || level ? (
          <span className="flex flex-wrap items-center gap-x-2 type-small text-text-secondary tabular-nums">
            {facts ? <span>{facts}</span> : null}
            {facts && level ? <span aria-hidden="true">·</span> : null}
            {level && song.difficulty !== null ? (
              <Difficulty
                level={song.difficulty}
                label={level}
                className="gap-1.5"
              />
            ) : null}
          </span>
        ) : null}
        {/* Sin rejilla o sin fin de baile (solo la ve el admin, D063): el configurador lo explica. */}
        {song.ready ? null : (
          <span className="type-small text-text-secondary">
            {COPY.notReady}
          </span>
        )}
      </Link>
      <button
        type="button"
        aria-pressed={song.favorite}
        aria-label={COPY.favoriteAdd(song.title)}
        onClick={onToggleFavorite}
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-pill",
          "transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none",
          song.favorite ? "text-gold-600" : "text-text-secondary",
        )}
      >
        <Heart
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className={cn("size-6", song.favorite && "fill-current")}
        />
      </button>
    </li>
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
