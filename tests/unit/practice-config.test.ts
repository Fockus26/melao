// Configurador de Practicar (D117): modo de canción, "caben N figuras", petición a plan-session,
// errores de Empezar y la vista (sin reglas: viven en practice_songs y plan-session).
import { describe, expect, test } from "bun:test";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PracticeView,
  type PracticeViewProps,
} from "@/components/practice/practice-view";
import {
  buildPlanRequest,
  formatDuration,
  initialConfig,
  PRACTICE_LINKS,
  type PracticeSong,
  type PracticeStyle,
  parseAnchors,
  phrasesFor,
  pickSong,
  practiceHref,
  sessionIdFrom,
  songBlock,
  startProblem,
} from "@/lib/practice/config";
import { constantGrid } from "@/supabase/functions/_shared/core/grid";
import { phraseWindow } from "@/supabase/functions/_shared/core/phrases";
import { SALSA_CASINO } from "@/supabase/functions/_shared/core/style";

const grid = constantGrid(180, 2000);

const song = (id: string, patch: Partial<PracticeSong> = {}): PracticeSong => ({
  id,
  title: `Pista ${id}`,
  artist: "Melao (placeholder)",
  bpm: 180,
  durationMs: 200000,
  danceEndMs: 185000,
  beatGrid: grid,
  difficulty: 3,
  favorite: false,
  sessions30d: 0,
  popularity: 0,
  ready: true,
  ...patch,
});

const SONGS = [
  song("a", { difficulty: 1, sessions30d: 2 }),
  song("b", { difficulty: 3, favorite: true, sessions30d: 7 }),
  song("c", { difficulty: 4, sessions30d: 7 }),
  song("d", { difficulty: null, ready: false, sessions30d: 99 }),
];

const style = (songs = SONGS): PracticeStyle => ({
  id: "salsa",
  name: "Salsa casino",
  config: SALSA_CASINO,
  songs,
});

describe("initialConfig", () => {
  const styles = [{ id: "salsa" }, { id: "merengue" }];

  test("estilo del enlace; si no, el actual; si no, el primero", () => {
    expect(initialConfig(styles, "salsa", { style: "merengue" })?.styleId).toBe(
      "merengue",
    );
    expect(initialConfig(styles, "merengue", { style: "otro" })?.styleId).toBe(
      "merengue",
    );
    expect(initialConfig(styles, null, {})?.styleId).toBe("salsa");
    expect(initialConfig([], null, {})).toBeNull();
  });

  test("?song fija la canción (modo pick); sin ella, aleatoria; pasos según repaso", () => {
    expect(initialConfig(styles, null, { song: "b" })).toMatchObject({
      songMode: "pick",
      songId: "b",
      criterion: "review",
      maxDifficulty: 5,
      includeLearning: true,
    });
    expect(initialConfig(styles, null, { mode: "review" })).toMatchObject({
      songMode: "random",
      songId: null,
      criterion: "review",
    });
  });
});

describe("pickSong", () => {
  const opts = { songId: null, difficulty: 3, seed: 42 };

  test("pick: la del enlace, aunque no esté lista; otra id → null", () => {
    expect(pickSong(SONGS, "pick", { ...opts, songId: "d" })?.id).toBe("d");
    expect(pickSong(SONGS, "pick", { ...opts, songId: "x" })).toBeNull();
  });

  test("random: solo listas y la misma semilla da la misma", () => {
    const ids = new Set(
      Array.from(
        { length: 50 },
        (_, seed) => pickSong(SONGS, "random", { ...opts, seed })?.id,
      ),
    );
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
    expect(pickSong(SONGS, "random", opts)?.id).toBe(
      pickSong(SONGS, "random", opts)?.id,
    );
  });

  test("popular: más sesiones entre las listas; empate → la primera de la lista", () => {
    expect(pickSong(SONGS, "popular", opts)?.id).toBe("b");
  });

  test("favorites: solo favoritas listas; sin ninguna → null", () => {
    expect(pickSong(SONGS, "favorites", opts)?.id).toBe("b");
    expect(
      pickSong(
        SONGS.map((s) => ({ ...s, favorite: false })),
        "favorites",
        opts,
      ),
    ).toBeNull();
  });

  test("difficulty: la más cercana al tope; empate → la más fácil; sin dificultad no entra", () => {
    expect(pickSong(SONGS, "difficulty", opts)?.id).toBe("b");
    expect(pickSong(SONGS, "difficulty", { ...opts, difficulty: 5 })?.id).toBe(
      "c",
    );
    // 2 está a 1 de "a" (1) y de "b" (3): gana la más fácil.
    expect(pickSong(SONGS, "difficulty", { ...opts, difficulty: 2 })?.id).toBe(
      "a",
    );
    expect(
      pickSong(
        SONGS.map((s) => ({ ...s, difficulty: null })),
        "difficulty",
        opts,
      ),
    ).toBeNull();
  });
});

describe("phrasesFor", () => {
  test("es el N de phraseWindow del core", () => {
    expect(phrasesFor(SONGS[0], SALSA_CASINO)).toBe(
      phraseWindow(SALSA_CASINO, grid, 185000).phrases,
    );
    expect(phrasesFor(SONGS[0], SALSA_CASINO)).toBeGreaterThan(0);
  });

  test("sin rejilla válida o sin final del baile → null", () => {
    expect(
      phrasesFor({ beatGrid: null, danceEndMs: 1000 }, SALSA_CASINO),
    ).toBeNull();
    expect(
      phrasesFor({ beatGrid: grid, danceEndMs: null }, SALSA_CASINO),
    ).toBeNull();
    expect(
      phrasesFor(
        { beatGrid: [{ beat: 0, tMs: 0 }], danceEndMs: 1000 },
        SALSA_CASINO,
      ),
    ).toBeNull();
  });
});

describe("songBlock", () => {
  test("motivos por los que no se puede empezar", () => {
    const s = style();
    expect(songBlock(s, "random", SONGS[0])).toBeNull();
    expect(songBlock(s, "pick", null)).toBe("no-pick");
    expect(songBlock(s, "favorites", null)).toBe("no-favorites");
    expect(songBlock(s, "difficulty", null)).toBe("no-rated");
    expect(songBlock(style([SONGS[3]]), "favorites", null)).toBe("no-songs");
    expect(songBlock(s, "pick", SONGS[3])).toBe("not-ready");
    expect(songBlock(s, "pick", song("corta", { danceEndMs: 3000 }))).toBe(
      "too-short",
    );
  });
});

describe("buildPlanRequest", () => {
  const base = {
    styleId: "salsa",
    maxDifficulty: 3,
    includeLearning: false,
  };

  test("modo libre con el criterio como order (contrato con plan-session)", () => {
    expect(buildPlanRequest({ ...base, criterion: "popular" }, "b")).toEqual({
      styleId: "salsa",
      songId: "b",
      mode: "free",
      stepFilters: {
        maxDifficulty: 3,
        favoritesOnly: false,
        includeLearning: false,
        order: "popular",
      },
    });
  });

  test("favoritos = favoritesOnly con el orden de siempre", () => {
    expect(
      buildPlanRequest({ ...base, criterion: "favorites" }, "b").stepFilters,
    ).toMatchObject({ favoritesOnly: true, order: "review" });
  });
});

describe("respuesta de plan-session", () => {
  const err = (status: number, code: string) => ({
    status,
    body: { error: { code, message: "" } },
  });

  test("sessionId", () => {
    expect(sessionIdFrom({ sessionId: "s1" })).toBe("s1");
    expect(sessionIdFrom({})).toBeNull();
    expect(sessionIdFrom(null)).toBeNull();
  });

  test("errores → qué ve el alumno", () => {
    expect(startProblem({ status: 0, body: null })).toBe("offline");
    expect(startProblem(err(401, "unauthorized"))).toBe("auth");
    expect(startProblem(err(409, "no_steps"))).toBe("no-steps");
    expect(startProblem(err(409, "song_not_ready"))).toBe("soon");
    expect(startProblem(err(409, "song_too_short"))).toBe("soon");
    expect(startProblem(err(409, "style_not_ready"))).toBe("soon");
    expect(startProblem(err(402, "no_active_subscription"))).toBe(
      "subscription",
    );
    expect(startProblem(err(400, "invalid_input"))).toBe("error");
    expect(startProblem({ status: 500, body: null })).toBe("error");
  });
});

describe("presentación", () => {
  test("duración y enlaces", () => {
    expect(formatDuration(195000)).toBe("3:15");
    expect(formatDuration(61000)).toBe("1:01");
    expect(PRACTICE_LINKS.session("abc")).toBe("/app/practice/session?id=abc");
    expect(PRACTICE_LINKS.songs("salsa", true)).toBe(
      "/app/practice/songs?style=salsa&mode=review",
    );
    expect(practiceHref({ styleId: "salsa", songId: "b", review: true })).toBe(
      "/app/practice?style=salsa&song=b&mode=review",
    );
  });

  test("parseAnchors", () => {
    expect(parseAnchors([{ beat: 0, tMs: 10 }])).toEqual([
      { beat: 0, tMs: 10 },
    ]);
    expect(parseAnchors([{ beat: 0.5, tMs: 10 }])).toBeNull();
    expect(parseAnchors(null)).toBeNull();
  });
});

describe("PracticeView", () => {
  const props = (
    patch: Partial<PracticeViewProps> = {},
  ): PracticeViewProps => ({
    styles: [style()],
    initial: initialConfig([style()], "salsa", { song: "b" }),
    seed: 1,
    subscribed: true,
    ...patch,
  });
  // useRouter exige el router de la app montado: uno inerte basta para renderizar.
  const router = {
    back() {},
    forward() {},
    refresh() {},
    push() {},
    replace() {},
    prefetch() {},
  } as unknown as AppRouterInstance;
  const html = (p: PracticeViewProps) =>
    renderToStaticMarkup(
      createElement(
        AppRouterContext.Provider,
        { value: router },
        createElement(PracticeView, p),
      ),
    );

  test("grupos con legend, N figuras y Empezar habilitado", () => {
    const out = html(props());
    for (const legend of ["Estilo", "Canción", "Pasos"]) {
      expect(out).toContain(`>${legend}</legend>`);
    }
    const n = phrasesFor(SONGS[1], SALSA_CASINO);
    expect(out).toContain(`data-phrases="${n}"`);
    expect(out).toContain("figuras de 8 tiempos");
    expect(out).toContain("Pista b");
    const startTag = out.match(/<button[^>]*data-variant="primary"[^>]*>/)?.[0];
    expect(startTag).toBeDefined();
    expect(startTag).not.toContain('disabled=""');
    expect(out).toContain('href="/app/practice/songs?style=salsa"');
  });

  test("canción no lista: Empezar deshabilitado y el motivo enlazado", () => {
    const out = html(
      props({ initial: initialConfig([style()], "salsa", { song: "d" }) }),
    );
    expect(out).toContain("Esta canción aún no está lista");
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="[^"]+"/);
    expect(out).toContain("Sin canción lista");
  });

  test("sin suscripción: se ve todo y Empezar lleva a Planes", () => {
    const out = html(props({ subscribed: false }));
    expect(out).toContain('href="/plans"');
    expect(out).toContain("Activa tu plan");
    expect(out).not.toContain(">Empezar<");
  });

  test("sin estilos", () => {
    expect(html(props({ styles: [], initial: null }))).toContain(
      "Todavía no hay estilos publicados",
    );
  });
});
