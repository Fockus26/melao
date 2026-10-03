// Admin · Pasos (D149–D153): lógica pura del editor y de las subidas. Lo que decide la base
// (publicar, borrar, prerequisitos) se prueba en db-admin-steps.test.ts.
import { describe, expect, test } from "bun:test";
import {
  type AdminStepRow,
  adminStepsSearch,
  beatNotesToDraft,
  categoryCounts,
  draftToPayload,
  EMPTY_ADMIN_FILTERS,
  emptyDraft,
  filterAdminSteps,
  isDraftDirty,
  mergeRows,
  nextSortOrder,
  parseAdminStepFilters,
  parseSelection,
  slugify,
  statusCounts,
  toIssues,
  validateDraft,
  videoSlots,
  writeErrorMessage,
} from "@/lib/admin/steps";
import {
  acceptFor,
  bucketMimeTypes,
  extensionsLabel,
  type StoragePort,
  UPLOAD_MAX_BYTES,
  validateUpload,
  versionedObjectName,
} from "@/lib/admin/storage";
import {
  formatDuration,
  objectFileName,
  unlinkAndRemove,
  uploadAndLink,
} from "@/lib/admin/upload";

const row = (over: Partial<AdminStepRow>): AdminStepRow => ({
  id: "1",
  slug: "guapea",
  name: "Guapea",
  category: "base",
  difficulty: 1,
  published: true,
  sortOrder: 10,
  videosComplete: true,
  hasVoiceClip: false,
  lessonCount: 0,
  ...over,
});

const ROWS = [
  row({ id: "1" }),
  row({
    id: "2",
    slug: "enchufla",
    name: "Enchufla",
    category: "salida",
    sortOrder: 20,
    videosComplete: false,
  }),
  row({
    id: "3",
    slug: "sombrero",
    name: "Sombrero",
    category: "figura",
    published: false,
    sortOrder: 30,
    videosComplete: false,
  }),
];

describe("slug y borrador", () => {
  test("slugify: sin acentos, ñ, guiones y tope de 60", () => {
    expect(slugify("Paséala")).toBe("paseala");
    expect(slugify("  Vuelta a la derecha!! ")).toBe("vuelta-a-la-derecha");
    expect(slugify("Montaña rusa")).toBe("montana-rusa");
    expect(slugify("x".repeat(70))).toHaveLength(60);
    expect(slugify("¿?")).toBe("");
  });

  test("validateDraft: obligatorios, rangos, slug único en el estilo", () => {
    const draft = {
      ...emptyDraft({ beatsPerPhrase: 8 }),
      name: "Enchufla",
      slug: "enchufla",
      startPositionId: "p1",
      endPositionId: "p2",
      phrases: "17",
      sortOrder: "-1",
    };
    expect(validateDraft(draft, { stepId: null, rows: ROWS })).toEqual({
      slug: "Ya hay un paso con este slug en el estilo.",
      phrases: "Entre 1 y 16 frases.",
      sortOrder: "Un número entero entre 0 y 32767.",
    });
    // El mismo paso puede conservar su slug.
    expect(
      validateDraft(
        { ...draft, phrases: "2", sortOrder: "20" },
        { stepId: "2", rows: ROWS },
      ),
    ).toEqual({});
    const empty = validateDraft(emptyDraft({ beatsPerPhrase: 8 }), {
      stepId: null,
      rows: [],
    });
    expect(Object.keys(empty).sort()).toEqual([
      "endPositionId",
      "name",
      "slug",
      "startPositionId",
    ]);
    expect(
      validateDraft(
        { ...draft, slug: "Con Espacio", variationOf: "9" },
        { stepId: "9", rows: [] },
      ),
    ).toMatchObject({
      slug: "Solo minúsculas sin acentos, números y guiones.",
      variationOf: "Un paso no puede ser variación de sí mismo.",
    });
  });

  test("notas por tiempo: ida y vuelta, solo las que tienen texto", () => {
    const notes = beatNotesToDraft(
      [
        { beat: 1, note: "Atrás" },
        { beat: 5, note: "Adelante" },
        { beat: 9, note: "Fuera de la frase" },
        "basura",
      ],
      8,
    );
    expect(notes).toEqual(["Atrás", "", "", "", "Adelante", "", "", ""]);
    const draft = {
      ...emptyDraft({ beatsPerPhrase: 8 }),
      name: " Guapea ",
      beatNotes: notes.map((n, i) => (i === 2 ? "  " : n)),
      prerequisites: ["a", "self"],
      phrases: "2",
      sortOrder: "15",
    };
    const { step, prerequisites } = draftToPayload(draft, "self");
    expect(step.beat_notes).toEqual([
      { beat: 1, note: "Atrás" },
      { beat: 5, note: "Adelante" },
    ]);
    expect(step).toMatchObject({ name: "Guapea", phrases: 2, sort_order: 15 });
    expect(prerequisites).toEqual(["a"]);
  });

  test("isDraftDirty ignora espacios de más y el orden de los prerequisitos", () => {
    const base = {
      ...emptyDraft({ beatsPerPhrase: 8 }),
      prerequisites: ["a", "b"],
    };
    expect(
      isDraftDirty(base, { ...base, name: "  ", prerequisites: ["b", "a"] }),
    ).toBe(false);
    expect(isDraftDirty(base, { ...base, canEnd: true })).toBe(true);
  });

  test("videoSlots: ambos roles en libre o sin roles; el sobrante se muestra", () => {
    expect(videoSlots(true, "figura", [])).toEqual(["leader", "follower"]);
    expect(videoSlots(true, "libre", [])).toEqual(["both"]);
    expect(videoSlots(false, "figura", [])).toEqual(["both"]);
    expect(
      videoSlots(true, "figura", [
        { role: "both", path: "x", durationMs: null, aspect: "16:9" },
      ]),
    ).toEqual(["leader", "follower", "both"]);
  });

  test("nextSortOrder deja hueco de 10", () => {
    expect(nextSortOrder(ROWS)).toBe(40);
    expect(nextSortOrder([])).toBe(10);
  });
});

describe("lista: filtros, contadores y URL", () => {
  test("estado (uno), categorías y búsqueda por nombre o slug", () => {
    const ids = (f: Partial<typeof EMPTY_ADMIN_FILTERS>) =>
      filterAdminSteps(ROWS, { ...EMPTY_ADMIN_FILTERS, ...f }).map((r) => r.id);
    expect(ids({})).toEqual(["1", "2", "3"]);
    expect(ids({ status: "draft" })).toEqual(["3"]);
    expect(ids({ status: "published" })).toEqual(["1", "2"]);
    expect(ids({ status: "no-video" })).toEqual(["2", "3"]);
    expect(ids({ categories: ["salida", "figura"] })).toEqual(["2", "3"]);
    expect(ids({ q: "SOMBRE" })).toEqual(["3"]);
    expect(ids({ q: "enchu", status: "draft" })).toEqual([]);
  });

  test("contadores sobre toda la lista", () => {
    expect(statusCounts(ROWS)).toEqual({
      published: 2,
      draft: 1,
      "no-video": 2,
    });
    expect(categoryCounts(ROWS)).toEqual([
      { category: "base", count: 1 },
      { category: "salida", count: 1 },
      { category: "figura", count: 1 },
    ]);
  });

  test("contrato con el Resumen: ?style=&step= y ?style=&status=draft", () => {
    const uuid = "6f1c2a4e-1b2c-4d3e-8f90-0123456789ab";
    expect(parseSelection({ style: "salsa-casino", step: uuid })).toEqual({
      kind: "step",
      id: uuid,
    });
    expect(parseSelection({ step: "new" })).toEqual({ kind: "new" });
    expect(parseSelection({ step: "../x" })).toEqual({ kind: "none" });
    expect(
      parseAdminStepFilters({ style: "salsa-casino", status: "draft" }),
    ).toEqual({ q: "", status: "draft", categories: [] });
    expect(
      adminStepsSearch({
        style: "salsa-casino",
        filters: { ...EMPTY_ADMIN_FILTERS, status: "draft" },
      }),
    ).toBe("?style=salsa-casino&status=draft");
  });

  test("URL ↔ filtros, en inglés y sin lo que no se entiende", () => {
    const filters = parseAdminStepFilters({
      q: "vuelta",
      status: "raro",
      category: "exit,turn,nada",
    });
    expect(filters).toEqual({
      q: "vuelta",
      status: null,
      categories: ["vuelta", "salida"],
    });
    expect(
      adminStepsSearch(
        { style: "merengue", step: "new", filters },
        { state: "list" },
      ),
    ).toBe("?state=list&style=merengue&step=new&q=vuelta&category=turn%2Cexit");
    expect(adminStepsSearch({})).toBe("");
  });

  test("mergeRows: lo guardado pisa, lo nuevo entra en orden, lo borrado sale", () => {
    const merged = mergeRows(
      ROWS,
      {
        "2": { ...ROWS[1], published: false },
        "9": row({ id: "9", name: "Abanico", sortOrder: 25 }),
      },
      new Set(["1"]),
    );
    expect(merged.map((r) => [r.id, r.published])).toEqual([
      ["2", false],
      ["9", true],
      ["3", false],
    ]);
  });

  test("motivos y errores en texto", () => {
    expect(toIssues(["missing_video_leader", "otro"])).toEqual([
      "missing_video_leader",
    ]);
    expect(toIssues(null)).toEqual([]);
    expect(writeErrorMessage({ code: "MS001", message: "" })).toContain(
      "video de cada rol",
    );
    expect(writeErrorMessage({ code: "23505", message: "" })).toContain("slug");
    expect(writeErrorMessage({ message: "Failed to fetch" })).toContain(
      "conexión",
    );
  });
});

describe("subidas", () => {
  const file = (name: string, size: number, type = "") => ({
    name,
    size,
    type,
  });

  test("tipo por extensión y alias del navegador; 50 MB; vacío", () => {
    expect(
      validateUpload("step-videos", file("paso.MP4", 10, "video/mp4")),
    ).toEqual({ ok: true, ext: "mp4", contentType: "video/mp4" });
    expect(
      validateUpload("voice-clips", file("clip.m4a", 10, "audio/x-m4a")),
    ).toEqual({ ok: true, ext: "m4a", contentType: "audio/mp4" });
    expect(
      validateUpload("song-licenses", file("lic.jpeg", 10, "image/jpeg")),
    ).toEqual({ ok: true, ext: "jpg", contentType: "image/jpeg" });
    expect(validateUpload("step-videos", file("paso.mov", 10))).toEqual({
      ok: false,
      reason: "wrong_type",
    });
    // Extensión cambiada a mano: el tipo del navegador no cuadra.
    expect(
      validateUpload("step-videos", file("paso.mp4", 10, "audio/mpeg")),
    ).toEqual({ ok: false, reason: "wrong_type" });
    expect(
      validateUpload("songs", file("tema.mp3", UPLOAD_MAX_BYTES + 1)),
    ).toEqual({ ok: false, reason: "too_large" });
    expect(validateUpload("songs", file("tema.mp3", UPLOAD_MAX_BYTES)).ok).toBe(
      true,
    );
    expect(validateUpload("songs", file("tema.mp3", 0))).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  test("accept, tipos del bucket y su nombre legible", () => {
    expect(acceptFor("step-videos")).toBe(".mp4,.webm,video/mp4,video/webm");
    expect(bucketMimeTypes("song-licenses")).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);
    expect(extensionsLabel("voice-clips")).toBe("MP3, M4A o WAV");
    expect(extensionsLabel("song-licenses")).toBe("PDF, JPG o PNG");
  });

  test("nombre versionado: uno distinto en cada subida", () => {
    const a = versionedObjectName("abc", "leader", "mp4", new Date(1_000));
    const b = versionedObjectName("abc", "leader", "mp4", new Date(2_000));
    expect(a).toMatch(/^abc\/leader-[0-9a-z]+\.mp4$/);
    expect(a).not.toBe(b);
    expect(objectFileName(a)).toBe(a.slice(4));
  });

  test("formatDuration", () => {
    expect(formatDuration(4200)).toBe("0:04");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
    expect(formatDuration(null)).toBeNull();
  });

  function fakeStorage(fail: { upload?: boolean } = {}) {
    const calls: string[] = [];
    const storage: StoragePort = {
      async upload(bucket, path) {
        calls.push(`upload ${bucket}/${path}`);
        return { error: fail.upload ? { message: "red" } : null };
      },
      async remove(bucket, paths) {
        calls.push(`remove ${bucket}/${paths.join(",")}`);
        return { error: null };
      },
      async signedUrl() {
        return null;
      },
    };
    return { storage, calls };
  }

  test("uploadAndLink: sube, apunta la fila y borra el anterior", async () => {
    const { storage, calls } = fakeStorage();
    const out = await uploadAndLink({
      storage,
      bucket: "step-videos",
      path: "s/leader-2.mp4",
      file: new Blob(["x"]),
      contentType: "video/mp4",
      previousPath: "s/leader-1.mp4",
      link: async (path) => {
        calls.push(`link ${path}`);
        return { error: null };
      },
    });
    expect(out).toEqual({ ok: true, path: "s/leader-2.mp4" });
    expect(calls).toEqual([
      "upload step-videos/s/leader-2.mp4",
      "link s/leader-2.mp4",
      "remove step-videos/s/leader-1.mp4",
    ]);
  });

  test("uploadAndLink: si la fila no se apunta, borra lo subido y conserva el anterior", async () => {
    const { storage, calls } = fakeStorage();
    const out = await uploadAndLink({
      storage,
      bucket: "step-videos",
      path: "s/leader-2.mp4",
      file: new Blob(["x"]),
      contentType: "video/mp4",
      previousPath: "s/leader-1.mp4",
      link: async () => ({ error: { code: "42501", message: "no" } }),
    });
    expect(out).toMatchObject({ ok: false, stage: "link", code: "42501" });
    expect(calls).toEqual([
      "upload step-videos/s/leader-2.mp4",
      "remove step-videos/s/leader-2.mp4",
    ]);
  });

  test("uploadAndLink: falla la subida, no toca la fila", async () => {
    const { storage } = fakeStorage({ upload: true });
    let linked = false;
    const out = await uploadAndLink({
      storage,
      bucket: "songs",
      path: "x.mp3",
      file: new Blob(["x"]),
      contentType: "audio/mpeg",
      previousPath: null,
      link: async () => {
        linked = true;
        return { error: null };
      },
    });
    expect(out).toMatchObject({ ok: false, stage: "upload" });
    expect(linked).toBe(false);
  });

  test("unlinkAndRemove: si la base se niega, el archivo se queda", async () => {
    const { storage, calls } = fakeStorage();
    const refused = await unlinkAndRemove({
      storage,
      bucket: "step-videos",
      path: "s/follower-1.mp4",
      unlink: async () => ({ error: { code: "MS001", message: "publicado" } }),
    });
    expect(refused).toMatchObject({ ok: false, code: "MS001" });
    expect(calls).toEqual([]);
    const ok = await unlinkAndRemove({
      storage,
      bucket: "step-videos",
      path: "s/follower-1.mp4",
      unlink: async () => ({ error: null }),
    });
    expect(ok).toEqual({ ok: true });
    expect(calls).toEqual(["remove step-videos/s/follower-1.mp4"]);
  });
});
