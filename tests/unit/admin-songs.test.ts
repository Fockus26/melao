// Admin · Canciones (lib/admin/songs.ts): filtros de la lista, URL, borrador, validación y textos.
// Las reglas (qué bloquea publicar, licencia, dificultad) viven en Postgres: db-admin-songs.test.ts.
import { describe, expect, test } from "bun:test";
import {
  type AdminSongRow,
  adminSongsSearch,
  difficultyChoice,
  EMPTY_SONG_FILTERS,
  emptySongDraft,
  filterAdminSongs,
  isSongDraftDirty,
  mergeSongRows,
  NO_STYLE,
  parseAdminSongFilters,
  parseSongSelection,
  songDraftToPayload,
  songStatusCounts,
  songStyleCounts,
  songWriteErrorMessage,
  toSongIssues,
  validateSongDraft,
} from "@/lib/admin/songs";

const row = (over: Partial<AdminSongRow>): AdminSongRow => ({
  id: "s1",
  title: "Canción",
  artist: "Artista",
  published: false,
  styleSlugs: ["salsa-casino"],
  ready: true,
  hasAudio: true,
  bpm: 180,
  durationMs: 200000,
  licenseSource: "Sello",
  hasLicenseDocument: true,
  licenseExpiresAt: null,
  licenseStatus: "ok",
  lessonCount: 0,
  difficultyOverride: null,
  autoDifficulty: 3,
  difficulty: 3,
  ...over,
});

const ROWS = [
  row({
    id: "a",
    title: "Échale salsita",
    artist: "Conjunto Pío",
    published: true,
  }),
  row({
    id: "b",
    title: "Merengue de prueba",
    styleSlugs: ["merengue"],
    ready: false,
  }),
  row({
    id: "c",
    title: "Sin estilo",
    styleSlugs: [],
    licenseStatus: "expired",
  }),
  row({
    id: "d",
    title: "Dos estilos",
    styleSlugs: ["salsa-casino", "merengue"],
  }),
];

const STYLES = [
  {
    id: "s-salsa",
    slug: "salsa-casino",
    name: "Salsa casino",
    published: true,
  },
  { id: "s-mer", slug: "merengue", name: "Merengue", published: false },
];

describe("filtros", () => {
  test("búsqueda sin acentos en título o artista, todas las palabras", () => {
    const ids = (q: string) =>
      filterAdminSongs(ROWS, { ...EMPTY_SONG_FILTERS, q }).map((r) => r.id);
    expect(ids("echale")).toEqual(["a"]);
    expect(ids("pio salsita")).toEqual(["a"]);
    expect(ids("nada")).toEqual([]);
  });

  test("estado: uno a la vez, con contador sobre toda la lista", () => {
    const by = (status: (typeof EMPTY_SONG_FILTERS)["status"]) =>
      filterAdminSongs(ROWS, { ...EMPTY_SONG_FILTERS, status }).map(
        (r) => r.id,
      );
    expect(by("published")).toEqual(["a"]);
    expect(by("draft")).toEqual(["b", "c", "d"]);
    expect(by("not-ready")).toEqual(["b"]);
    expect(by("license-expired")).toEqual(["c"]);
    expect(songStatusCounts(ROWS)).toEqual({
      published: 1,
      draft: 3,
      "not-ready": 1,
      "license-expired": 1,
    });
  });

  test("estilos: varios = cualquiera; «Sin estilo» con `none`", () => {
    const by = (styles: string[]) =>
      filterAdminSongs(ROWS, { ...EMPTY_SONG_FILTERS, styles }).map(
        (r) => r.id,
      );
    expect(by(["merengue"])).toEqual(["b", "d"]);
    expect(by(["merengue", NO_STYLE])).toEqual(["b", "c", "d"]);
    expect(
      songStyleCounts(ROWS, STYLES).map((c) => [c.value, c.count]),
    ).toEqual([
      ["salsa-casino", 2],
      ["merengue", 2],
      [NO_STYLE, 1],
    ]);
    expect(songStyleCounts([ROWS[0]], STYLES).map((c) => c.value)).toEqual([
      "salsa-casino",
      "merengue",
    ]);
  });
});

describe("URL", () => {
  test("?song= uuid, new o nada (contrato del Resumen)", () => {
    const id = "C0000000-0000-4000-8000-000000000001";
    expect(parseSongSelection({ song: id })).toEqual({
      kind: "song",
      id: id.toLowerCase(),
    });
    expect(parseSongSelection({ song: "new" })).toEqual({ kind: "new" });
    expect(parseSongSelection({ song: "x" })).toEqual({ kind: "none" });
  });

  test("filtros de ida y vuelta; lo que no se entiende se ignora", () => {
    const f = parseAdminSongFilters({
      q: "pío",
      status: "license-expired",
      style: "salsa-casino,none,Mal Slug",
    });
    expect(f).toEqual({
      q: "pío",
      status: "license-expired",
      styles: ["salsa-casino", "none"],
    });
    expect(parseAdminSongFilters({ status: "otra" }).status).toBeNull();
    expect(
      adminSongsSearch({ song: "s1", filters: f }, { state: "list" }),
    ).toBe(
      "?state=list&song=s1&q=p%C3%ADo&status=license-expired&style=salsa-casino%2Cnone",
    );
    expect(adminSongsSearch({})).toBe("");
  });
});

describe("borrador", () => {
  test("nueva: automática y con los estilos dados", () => {
    expect(emptySongDraft(["s-salsa"])).toMatchObject({
      difficulty: "auto",
      styleIds: ["s-salsa"],
    });
    expect(difficultyChoice(null)).toBe("auto");
    expect(difficultyChoice(4)).toBe("4");
  });

  test("validación: título y artista, largos y fecha", () => {
    const d = emptySongDraft();
    expect(Object.keys(validateSongDraft(d))).toEqual(["title", "artist"]);
    expect(
      validateSongDraft({
        ...d,
        title: "T",
        artist: "A",
        licenseSource: "x".repeat(201),
        licenseExpiresAt: "2026-02-30",
      }),
    ).toEqual({
      licenseSource: "Máximo 200 caracteres.",
      licenseExpiresAt: "Escribe una fecha válida (día, mes y año).",
    });
    expect(
      validateSongDraft({
        ...d,
        title: "T",
        artist: "A",
        licenseExpiresAt: "2027-01-31",
      }),
    ).toEqual({});
  });

  test("payload recortado, override o null, estilos sin repetir; sucio sin espacios ni orden", () => {
    const d = {
      ...emptySongDraft(["b", "a", "a"]),
      title: " T ",
      artist: "A",
      difficulty: "2" as const,
    };
    expect(songDraftToPayload(d)).toEqual({
      song: {
        title: "T",
        artist: "A",
        difficulty_override: 2,
        license_source: "",
        license_notes: "",
        license_expires_at: "",
      },
      styleIds: ["b", "a"],
    });
    expect(
      songDraftToPayload({ ...d, difficulty: "auto" }).song.difficulty_override,
    ).toBeNull();
    expect(
      isSongDraftDirty(d, { ...d, title: "T", styleIds: ["a", "a", "b"] }),
    ).toBe(false);
    expect(isSongDraftDirty(d, { ...d, artist: "B" })).toBe(true);
  });
});

describe("lista local y textos", () => {
  test("lo guardado entra en orden de título y lo borrado sale", () => {
    const merged = mergeSongRows(
      ROWS,
      { z: row({ id: "z", title: "Abre la lista" }) },
      new Set(["c"]),
    );
    expect(merged.map((r) => r.id)).toEqual(["z", "d", "a", "b"]);
  });

  test("motivos conocidos en orden; errores con código propio", () => {
    expect(toSongIssues(["missing_grid", "otra", "license_expired"])).toEqual([
      "missing_grid",
      "license_expired",
    ]);
    expect(toSongIssues(null)).toEqual([]);
    expect(songWriteErrorMessage({ code: "MS204", message: "" })).toMatch(
      /lección/,
    );
    expect(songWriteErrorMessage({ message: "Failed to fetch" })).toMatch(
      /conexión/,
    );
  });
});
