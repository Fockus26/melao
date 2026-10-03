// Admin · Estilos (lib/admin/styles.ts): borrador, validación previa, bandas, payload de
// `admin_save_style`, catálogo con el core y textos de error (D163–D167).
import { describe, expect, test } from "bun:test";
import {
  type AdminStyleFull,
  adminStylesSearch,
  bandRangeLabel,
  bandsError,
  catalogIssueText,
  draftBands,
  emptyStyleDraft,
  isStyleDraftDirty,
  maxNoteBeat,
  parseStyleSelection,
  type StyleStep,
  stepsWithNotesBeyond,
  styleCatalogIssues,
  styleDraftToPayload,
  styleToDraft,
  styleWriteErrorMessage,
  toggleSpokenBeat,
  validateStyleDraft,
  withBeatsPerPhrase,
} from "@/lib/admin/styles";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";

const SALSA: AdminStyleFull = {
  id: "s1",
  slug: "salsa-casino",
  name: "Salsa casino",
  published: true,
  sortOrder: 1,
  hasRoles: true,
  beatsPerPhrase: 8,
  spokenBeats: [7, 1, 2, 3, 5, 6],
  callBeat: 5,
  callSpanBeats: 2,
  leadInPhrases: 1,
  bands: [170, 185, 200, 215],
  startPositionId: "guapea",
  stepCount: 2,
  stepsPublished: 1,
  songCount: 0,
  hasCourse: false,
  positions: [
    { id: "abierta", slug: "abierta", name: "Abierta", stepCount: 0 },
    { id: "guapea", slug: "guapea", name: "Guapea", stepCount: 2 },
  ],
};

const step = (over: Partial<StyleStep>): StyleStep => ({
  id: "x",
  name: "Paso",
  category: "base",
  startPositionId: "guapea",
  endPositionId: "guapea",
  phrases: 1,
  canStart: true,
  canEnd: true,
  repeatable: true,
  published: true,
  maxNoteBeat: 0,
  ...over,
});

describe("borrador", () => {
  test("un estilo nuevo arranca con la configuración de salsa casino y sin bandas", () => {
    const d = emptyStyleDraft(30);
    expect(d.beatsPerPhrase).toBe(SALSA_CASINO.beatsPerPhrase);
    expect(d.spokenBeats).toEqual([...SALSA_CASINO.spokenBeats]);
    expect(d.callBeat).toBe(SALSA_CASINO.callBeat);
    expect(d.bands).toEqual(["", "", "", ""]);
    expect(d.sortOrder).toBe("30");
  });

  test("del estilo al borrador: tiempos ordenados y bandas como texto", () => {
    const d = styleToDraft(SALSA);
    expect(d.spokenBeats).toEqual([1, 2, 3, 5, 6, 7]);
    expect(d.bands).toEqual(["170", "185", "200", "215"]);
    expect(isStyleDraftDirty(d, styleToDraft(SALSA))).toBe(false);
    expect(isStyleDraftDirty({ ...d, name: " Salsa casino " }, d)).toBe(false);
    expect(isStyleDraftDirty({ ...d, callBeat: 6 }, d)).toBe(true);
  });

  test("bajar los tiempos por frase quita tiempos hablados y corre el anuncio", () => {
    const d = withBeatsPerPhrase(styleToDraft(SALSA), 4);
    expect(d.spokenBeats).toEqual([1, 2, 3]);
    expect(d.callBeat).toBe(3);
    expect(d.callSpanBeats).toBe(2);
    expect(withBeatsPerPhrase({ ...d, callSpanBeats: 4 }, 2)).toMatchObject({
      callBeat: 1,
      callSpanBeats: 2,
    });
  });

  test("prender y apagar un tiempo", () => {
    expect(toggleSpokenBeat([1, 5], 3)).toEqual([1, 3, 5]);
    expect(toggleSpokenBeat([1, 3, 5], 3)).toEqual([1, 5]);
  });
});

describe("validación previa", () => {
  const ctx = { styleId: SALSA.id, styles: [SALSA] };

  test("un estilo válido no tiene errores", () => {
    expect(validateStyleDraft(styleToDraft(SALSA), ctx)).toEqual({});
  });

  test("nombre, slug, orden, tiempos y anuncio", () => {
    const d = styleToDraft(SALSA);
    const errors = validateStyleDraft(
      {
        ...d,
        name: " ",
        slug: "Con Mayúsculas",
        sortOrder: "-1",
        spokenBeats: [],
        callBeat: 8,
        callSpanBeats: 2,
      },
      ctx,
    );
    expect(Object.keys(errors).sort()).toEqual(
      ["call", "name", "slug", "sortOrder", "spokenBeats"].sort(),
    );
    expect(
      validateStyleDraft(
        { ...d, slug: "salsa-casino" },
        { ...ctx, styleId: null },
      ).slug,
    ).toBe("Ya hay un estilo con este slug.");
  });

  test("un estilo nuevo pide su posición inicial", () => {
    const errors = validateStyleDraft(
      { ...emptyStyleDraft(), name: "Bachata", slug: "bachata" },
      { styleId: null, styles: [SALSA] },
    );
    expect(Object.keys(errors).sort()).toEqual([
      "startPositionName",
      "startPositionSlug",
    ]);
  });

  test("bandas: vacías, completas y ascendentes en 40–300", () => {
    expect(bandsError(["", "", "", ""])).toBeNull();
    expect(bandsError(["120", "140", "160", "180"])).toBeNull();
    expect(bandsError(["120", "", "160", "180"])).toMatch(/Completa/);
    expect(bandsError(["30", "140", "160", "180"])).toMatch(/entre 40 y 300/);
    expect(bandsError(["120", "120", "160", "180"])).toMatch(/mayor/);
    expect(draftBands(["", " ", "", ""])).toBeNull();
    expect(draftBands(["120", "140", "160", "180"])).toEqual([
      120, 140, 160, 180,
    ]);
  });

  test("rango de cada nivel (misma regla que song_difficulty)", () => {
    const bands = ["170", "185", "200", "215"];
    expect(bandRangeLabel(bands, 1)).toBe("Hasta 170 BPM");
    expect(bandRangeLabel(bands, 2)).toBe("171–185 BPM");
    expect(bandRangeLabel(bands, 5)).toBe("Más de 215 BPM");
    expect(bandRangeLabel(["", "", "", ""], 5)).toBeNull();
  });
});

describe("payload de admin_save_style", () => {
  test("edición: sin posición nueva, bandas vacías = null", () => {
    const d = { ...styleToDraft(SALSA), bands: ["", "", "", ""] };
    const { style, startPosition } = styleDraftToPayload(d, SALSA.id);
    expect(style).toMatchObject({
      slug: "salsa-casino",
      spoken_beats: [1, 2, 3, 5, 6, 7],
      difficulty_bpm_bands: null,
      start_position_id: "guapea",
    });
    expect(startPosition).toBeNull();
  });

  test("estilo nuevo: crea su posición inicial", () => {
    const d = {
      ...emptyStyleDraft(),
      name: " Bachata ",
      slug: "bachata",
      startPositionName: " Cerrada ",
      startPositionSlug: "cerrada",
    };
    const { style, startPosition } = styleDraftToPayload(d, null);
    expect(style.name).toBe("Bachata");
    expect(style.start_position_id).toBeNull();
    expect(startPosition).toEqual({ name: "Cerrada", slug: "cerrada" });
  });
});

describe("catálogo y notas por tiempo", () => {
  test("validateCatalog del core, todos o solo publicados, en texto", () => {
    const steps = [
      step({ id: "a" }),
      step({
        id: "b",
        category: "salida",
        endPositionId: "abierta",
        canEnd: false,
        published: false,
      }),
    ];
    expect(styleCatalogIssues(steps, SALSA.positions, "guapea", false)).toEqual(
      [
        { code: "no_base_reachable", position: "abierta" },
        { code: "no_end_reachable", position: "abierta" },
      ],
    );
    const published = styleCatalogIssues(
      steps,
      SALSA.positions,
      "guapea",
      true,
    );
    expect(published).toEqual([
      { code: "no_base_reachable", position: "abierta" },
      { code: "no_end_reachable", position: "abierta" },
    ]);
    const name = (id: string) =>
      SALSA.positions.find((p) => p.id === id)?.name ?? id;
    expect(catalogIssueText(published[0], name)).toBe(
      "Desde «Abierta» no se llega a un paso base.",
    );
  });

  test("pasos con notas fuera de la frase", () => {
    expect(maxNoteBeat([{ beat: 1 }, { beat: 7 }, { beat: "x" }])).toBe(7);
    expect(maxNoteBeat(null)).toBe(0);
    const steps = [
      step({ id: "a", maxNoteBeat: 8 }),
      step({ id: "b", maxNoteBeat: 4 }),
    ];
    expect(stepsWithNotesBeyond(steps, 6).map((s) => s.id)).toEqual(["a"]);
  });
});

describe("URL y errores", () => {
  test("?style= nuevo, slug o nada", () => {
    expect(parseStyleSelection({ style: "new" })).toEqual({ kind: "new" });
    expect(parseStyleSelection({ style: "merengue" })).toEqual({
      kind: "slug",
      slug: "merengue",
    });
    expect(parseStyleSelection({ style: "../x" })).toEqual({
      kind: "slug",
      slug: null,
    });
    expect(adminStylesSearch("merengue", { state: "full" })).toBe(
      "?state=full&style=merengue",
    );
    expect(adminStylesSearch(null)).toBe("");
  });

  test("cada código propio tiene su texto", () => {
    const generic = styleWriteErrorMessage({ message: "" });
    for (const code of [
      "ME001",
      "ME002",
      "ME003",
      "ME004",
      "ME005",
      "ME006",
      "ME007",
      "ME008",
    ])
      expect(styleWriteErrorMessage({ code, message: "" })).not.toBe(generic);
    expect(
      styleWriteErrorMessage({ code: "23505", message: "" }, "position"),
    ).toMatch(/posición/);
  });
});
