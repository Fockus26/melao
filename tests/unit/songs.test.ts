// Practicar · canciones: búsqueda (acentos), filtros, URL, formato de la fila y la vista
// (sin reglas: la dificultad y lo visible salen de `practice_songs`).
import { describe, expect, test } from "bun:test";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SongsView, type SongsViewProps } from "@/components/songs/songs-view";
import type { StyleOption } from "@/lib/course/path";
import {
  backHref,
  countLabel,
  EMPTY_FILTERS,
  filterSongs,
  formatBpm,
  formatDuration,
  hasActiveFilters,
  matchesQuery,
  normalizeText,
  type PracticeSong,
  parseFilters,
  passthroughMode,
  practiceHref,
  songFacts,
  songsSearch,
} from "@/lib/songs/songs";

const song = (over: Partial<PracticeSong> & { id: string }): PracticeSong => ({
  title: "Canción",
  artist: "Artista",
  bpm: 180,
  durationMs: 200_000,
  difficulty: 3,
  favorite: false,
  ready: true,
  ...over,
});

const SONGS: PracticeSong[] = [
  song({
    id: "a",
    title: "Pista rápida",
    artist: "Los Van Van",
    difficulty: 4,
    favorite: true,
  }),
  song({ id: "b", title: "El Pío", artist: "Orquesta Aragón", difficulty: 2 }),
  song({ id: "c", title: "Sin dificultad", difficulty: null }),
];

describe("búsqueda", () => {
  test("normaliza acentos, diéresis, mayúsculas y espacios", () => {
    expect(normalizeText("  Pingüino   RÁPIDO ñ ")).toBe("pinguino rapido n");
  });

  test("sin acento encuentra con acento y al revés", () => {
    expect(matchesQuery(SONGS[0], "rapida")).toBe(true);
    expect(matchesQuery(SONGS[1], "pio")).toBe(true);
    expect(matchesQuery(song({ id: "x", title: "Pio" }), "Pío")).toBe(true);
  });

  test("cada palabra en título o artista, en cualquier orden", () => {
    expect(matchesQuery(SONGS[1], "aragon pio")).toBe(true);
    expect(matchesQuery(SONGS[1], "aragon salsa")).toBe(false);
    expect(matchesQuery(SONGS[1], "   ")).toBe(true);
  });
});

describe("filterSongs", () => {
  test("sin filtros, todas en su orden", () => {
    expect(filterSongs(SONGS, EMPTY_FILTERS).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("niveles: cualquiera de los elegidos; sin dificultad no entra", () => {
    const f = { ...EMPTY_FILTERS, difficulty: [2, 4] as const };
    expect(filterSongs(SONGS, f).map((s) => s.id)).toEqual(["a", "b"]);
  });

  test("favoritas y búsqueda se combinan", () => {
    expect(
      filterSongs(SONGS, { q: "van", difficulty: [], favorites: true }).map(
        (s) => s.id,
      ),
    ).toEqual(["a"]);
    expect(
      filterSongs(SONGS, { q: "pio", difficulty: [], favorites: true }),
    ).toEqual([]);
  });

  test("hasActiveFilters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "  " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, favorites: true })).toBe(true);
  });
});

describe("URL", () => {
  test("parseFilters ignora lo que no entiende", () => {
    expect(
      parseFilters({ q: "pío", difficulty: "4,2,9,x,2", favorites: "1" }),
    ).toEqual({ q: "pío", difficulty: [2, 4], favorites: true });
    expect(parseFilters({ difficulty: ["3", "1"], favorites: "si" })).toEqual({
      q: "",
      difficulty: [3],
      favorites: false,
    });
  });

  test("songsSearch conserva estilo, mode y canción y solo los filtros activos", () => {
    expect(songsSearch({ style: "s1" }, EMPTY_FILTERS)).toBe("?style=s1");
    expect(
      songsSearch(
        { style: "s1", mode: "review", song: "c9" },
        { q: "el pío", difficulty: [2, 3], favorites: true },
      ),
    ).toBe(
      "?style=s1&mode=review&song=c9&q=el+p%C3%ADo&difficulty=2%2C3&favorites=1",
    );
    expect(songsSearch({}, EMPTY_FILTERS)).toBe("");
  });

  test("elegir lleva al configurador con canción, estilo y mode", () => {
    expect(practiceHref("c1", "s1")).toBe("/app/practice?song=c1&style=s1");
    expect(practiceHref("c1", "s1", "review")).toBe(
      "/app/practice?song=c1&style=s1&mode=review",
    );
  });

  test("volver conserva lo que traía", () => {
    expect(backHref({})).toBe("/app/practice");
    expect(backHref({ style: "s1", song: "c1", mode: "review" })).toBe(
      "/app/practice?style=s1&song=c1&mode=review",
    );
  });

  test("mode: solo algo con forma de modo", () => {
    expect(passthroughMode("review")).toBe("review");
    expect(passthroughMode(["review", "x"])).toBe("review");
    expect(passthroughMode("<script>")).toBeNull();
    expect(passthroughMode(undefined)).toBeNull();
  });
});

describe("formato de la fila", () => {
  test("BPM sin decimales de más", () => {
    expect(formatBpm(184)).toBe("184 BPM");
    expect(formatBpm(150.4)).toBe("150.4 BPM");
  });

  test("duración m:ss hacia abajo", () => {
    expect(formatDuration(245_000)).toBe("4:05");
    expect(formatDuration(59_999)).toBe("0:59");
    expect(formatDuration(600_000)).toBe("10:00");
  });

  test('"184 BPM · 4:05" y lo que falta se omite', () => {
    expect(songFacts({ bpm: 184, durationMs: 245_000 })).toBe("184 BPM · 4:05");
    expect(songFacts({ bpm: null, durationMs: 245_000 })).toBe("4:05");
    expect(songFacts({ bpm: null, durationMs: null })).toBe("");
  });

  test("contador", () => {
    expect(countLabel(0)).toBe("0 canciones");
    expect(countLabel(1)).toBe("1 canción");
    expect(countLabel(12)).toBe("12 canciones");
  });
});

const STYLE = (id: string, name: string): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 0,
  completedCount: 0,
});
const STYLES = [STYLE("s1", "Salsa casino"), STYLE("s2", "Merengue")];

// `useRouter` exige el router de la app montado: un router de mentira basta para pintar.
const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
} as unknown as AppRouterInstance;

const render = (props: Partial<SongsViewProps> = {}) =>
  renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(SongsView, {
        styles: STYLES,
        currentStyle: STYLES[0],
        songs: SONGS,
        variant: "sample",
        ...props,
      }),
    ),
  );

describe("SongsView", () => {
  test("fila: enlace al configurador y corazón aparte con nombre y aria-pressed", () => {
    const html = render({ mode: "review" });
    expect(html).toContain(
      'href="/app/practice?song=a&amp;style=s1&amp;mode=review"',
    );
    expect(html).toContain(
      'aria-pressed="true" aria-label="Agregar Pista rápida a favoritas"',
    );
    expect(html).toContain(
      'aria-pressed="false" aria-label="Agregar El Pío a favoritas"',
    );
    // El botón no va dentro del enlace.
    expect(html).not.toMatch(/<a [^>]*>(?:(?!<\/a>)[\s\S])*<button/);
    expect(html).toContain("180 BPM · 3:20");
    expect(html).toContain("Difícil");
  });

  test("contador vivo, búsqueda con etiqueta y chips de filtro", () => {
    const html = render();
    expect(html).toMatch(/aria-live="polite"[^>]*>3 canciones</);
    expect(html).toContain("<search");
    expect(html).toContain("Buscar canciones");
    expect(html).toContain("Muy fácil");
    expect(html).toContain("Favoritas");
  });

  test("segmentado de estilo solo con más de uno", () => {
    expect(render()).toContain('aria-current="page"');
    expect(render({ styles: STYLES.slice(0, 1) })).not.toContain(
      'aria-current="page"',
    );
  });

  test("sin resultados ofrece quitar filtros", () => {
    const html = render({
      initialFilters: { q: "bachata", difficulty: [], favorites: false },
    });
    expect(html).toContain("No hay canciones con estos filtros");
    expect(html).toContain("Quitar filtros");
  });

  test("sin favoritas", () => {
    const html = render({
      songs: SONGS.map((s) => ({ ...s, favorite: false })),
      initialFilters: { ...EMPTY_FILTERS, favorites: true },
    });
    expect(html).toContain("Todavía no tienes favoritas");
    expect(html).toContain("Ver todas");
  });

  test("estilo sin canciones, sin estilos y error", () => {
    expect(render({ songs: [] })).toContain(
      "Aún no hay canciones de Salsa casino",
    );
    expect(render({ currentStyle: null, styles: [] })).toContain(
      "Aún no hay estilos para practicar",
    );
    const error = render({ songs: [], loadError: true });
    expect(error).toContain('role="alert"');
    expect(error).toContain("Reintentar");
  });

  test("canción sin preparar lo dice", () => {
    expect(
      render({ songs: [song({ id: "z", ready: false, bpm: null })] }),
    ).toContain("Aún no está lista");
  });
});
