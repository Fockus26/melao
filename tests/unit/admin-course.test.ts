// Admin · Camino (lib/admin/course.ts): lectura de `admin_course`, números y lecciones anteriores,
// avisos con el core, fragmento que suena, borrador y orden local (igual que las funciones SQL).
import { describe, expect, test } from "bun:test";
import {
  courseErrorMessage,
  courseSearch,
  draftSongIssues,
  draftToPayload,
  fragmentText,
  isLessonDirty,
  lessonDraft,
  lessonHasWarnings,
  lessonNumbers,
  moveLessonLocal,
  moveUnitLocal,
  parseCourseData,
  previousStepIds,
  sequenceIssues,
  songFragment,
  validateLessonDraft,
} from "@/lib/admin/course";
import { LESSONS, SALSA_COURSE } from "../../app/layouts/admin-course/data";

const data = SALSA_COURSE;
const ids = (units: typeof data.units) =>
  units.map((u) => [u.id.slice(-2), u.lessons.map((l) => l.id.slice(-3))]);

describe("parseCourseData", () => {
  test("traduce el jsonb de admin_course", () => {
    const parsed = parseCourseData({
      style: {
        id: "s1",
        slug: "salsa",
        name: "Salsa",
        published: true,
        start_position_id: "p1",
        beats_per_phrase: 8,
        spoken_beats: [1, 2, 3, 5, 6, 7],
        call_beat: 5,
        call_span_beats: 2,
        lead_in_phrases: 1,
      },
      positions: [{ id: "p1", name: "Guapea" }],
      steps: [
        {
          id: "st1",
          slug: "guapea",
          name: "Guapea",
          category: "base",
          published: true,
          phrases: 1,
          start_position_id: "p1",
          end_position_id: "p1",
          can_start: true,
          can_end: true,
          repeatable: true,
        },
      ],
      songs: [
        {
          id: "so1",
          title: "Pista",
          artist: "Melao",
          published: false,
          visible: false,
          in_style: true,
          duration_ms: 1000,
          dance_end_ms: null,
          beat_grid: [{ beat: 0, tMs: 0 }],
          bpm: "160.0",
        },
      ],
      course: {
        id: "c1",
        title: "Curso",
        description: null,
        published: false,
        issues: ["no_lessons"],
      },
      units: [
        {
          id: "u1",
          position: 1,
          title: "Unidad",
          lessons: [
            {
              id: "l1",
              position: 1,
              title: "Lección",
              intro: null,
              practice_song_id: "so1",
              practice_phrases: 4,
              final_song_id: null,
              progress_count: 2,
              step_ids: ["st1"],
              issues: ["song_unavailable"],
            },
          ],
        },
      ],
    });
    expect(parsed?.style.config.spokenBeats).toEqual([1, 2, 3, 5, 6, 7]);
    expect(parsed?.steps[0]).toMatchObject({
      startPosition: "p1",
      canStart: true,
      category: "base",
    });
    expect(parsed?.songs[0].bpm).toBe(160);
    expect(parsed?.course?.description).toBe("");
    expect(parsed?.units[0].lessons[0]).toMatchObject({
      intro: "",
      progressCount: 2,
      stepIds: ["st1"],
      songIssues: ["song_unavailable"],
    });
  });

  test("null o sin estilo → null; sin curso → course null", () => {
    expect(parseCourseData(null)).toBeNull();
    expect(parseCourseData({ style: null })).toBeNull();
    expect(
      parseCourseData({ style: { id: "s" }, course: null })?.course,
    ).toBeNull();
  });
});

describe("camino", () => {
  test("números en todo el curso y pasos de las lecciones anteriores", () => {
    const n = lessonNumbers(data.units);
    expect(n.get(LESSONS.valid)).toBe(2);
    expect(n.get(LESSONS.noSong)).toBe(8);
    expect(previousStepIds(data.units, LESSONS.valid)).toEqual(
      data.units[0].lessons[0].stepIds,
    );
  });

  test("validación con el core: la válida no tiene avisos; el abanico sí", () => {
    expect(
      sequenceIssues(data, LESSONS.valid, data.units[0].lessons[1].stepIds),
    ).toEqual([]);
    const abanico = data.units[1].lessons[2];
    expect(
      sequenceIssues(data, abanico.id, abanico.stepIds)?.map((i) => i.code),
    ).toContain("step_no_end");
    expect(lessonHasWarnings(data, data.units[0].lessons[1])).toBe(false);
    expect(lessonHasWarnings(data, abanico)).toBe(true);
  });

  test("estilo sin posición inicial: no se valida (null)", () => {
    const noStart = {
      ...data,
      style: { ...data.style, startPositionId: null },
    };
    expect(sequenceIssues(noStart, LESSONS.valid, [])).toBeNull();
  });

  test("avisos de canción del borrador", () => {
    const songs = data.songs;
    expect(
      draftSongIssues({ practiceSongId: null, finalSongId: null }, songs),
    ).toEqual(["missing_song"]);
    expect(
      draftSongIssues(
        { practiceSongId: songs[0].id, finalSongId: songs[2].id },
        songs,
      ),
    ).toEqual(["song_unavailable"]);
    expect(
      draftSongIssues(
        { practiceSongId: songs[0].id, finalSongId: null },
        songs,
      ),
    ).toEqual([]);
  });
});

describe("fragmento", () => {
  const style = data.style.config;
  const song = data.songs[0]; // 160 BPM, el 1 en 1,5 s, fin de baile 195 s

  test("ventana de phraseWindow: desde la cuenta hasta la última frase", () => {
    const f = songFragment(song, style);
    // 375 ms por tiempo: la cuenta (beat −8) caería antes del principio → la frase 0 hace de
    // entrada (startPhrase 1); caben 64 frases hasta el fin de baile, 63 con pasos.
    expect(f?.phrases).toBe(63);
    expect(f?.startMs).toBe(1500);
    expect(f?.endMs).toBe(1500 + 8 * 64 * 375);
  });

  test("con tope de frases (mini práctica)", () => {
    expect(songFragment(song, style, 4)?.phrases).toBe(4);
    expect(fragmentText(song, style, 4)).toBe(
      "Suena de 0:01 a 0:16 · 4 frases.",
    );
  });

  test("sin rejilla: la duración", () => {
    expect(songFragment(data.songs[2], style)).toBeNull();
    expect(fragmentText(data.songs[2], style)).toContain("Dura 3:15");
  });
});

describe("borrador", () => {
  const lesson = data.units[0].lessons[1];

  test("sucio al cambiar el orden de los pasos", () => {
    const a = lessonDraft(lesson);
    expect(isLessonDirty(a, lessonDraft(lesson))).toBe(false);
    expect(isLessonDirty(a, { ...a, stepIds: [...a.stepIds].reverse() })).toBe(
      true,
    );
  });

  test("validación del título y payload", () => {
    const d = { ...lessonDraft(lesson), title: "   " };
    expect(validateLessonDraft(d).title).toBeDefined();
    expect(
      draftToPayload({
        ...d,
        title: " Hola ",
        practiceSongId: null,
        practicePhrases: 40,
      }),
    ).toMatchObject({ title: "Hola", practice_phrases: null });
    expect(
      draftToPayload({ ...d, practiceSongId: "x", practicePhrases: 40 })
        .practice_phrases,
    ).toBe(32);
  });

  test("errores de la base con texto propio", () => {
    expect(courseErrorMessage({ code: "MS023", message: "" })).toContain(
      "no se puede borrar",
    );
    expect(courseErrorMessage({ message: "Failed to fetch" })).toContain(
      "conexión",
    );
  });
});

describe("orden local (como admin_move_unit / admin_move_lesson)", () => {
  test("mover una unidad, acotado a la lista", () => {
    const [u1, u2, u3] = data.units.map((u) => u.id);
    expect(moveUnitLocal(data.units, u3, 1).map((u) => u.id)).toEqual([
      u3,
      u1,
      u2,
    ]);
    expect(moveUnitLocal(data.units, u1, 99).map((u) => u.id)).toEqual([
      u2,
      u3,
      u1,
    ]);
  });

  test("mover una lección dentro y entre unidades", () => {
    const [u1, u2] = data.units;
    const inside = moveLessonLocal(data.units, u1.lessons[2].id, u1.id, 1);
    expect(ids(inside)[0]).toEqual(["11", ["113", "111", "112"]]);
    const across = moveLessonLocal(data.units, u1.lessons[0].id, u2.id, 2);
    expect(ids(across).slice(0, 2)).toEqual([
      ["11", ["112", "113"]],
      ["12", ["121", "111", "122", "123"]],
    ]);
  });

  test("URL del contrato del Resumen", () => {
    expect(courseSearch({ style: "salsa-casino", lesson: "l1" })).toBe(
      "?style=salsa-casino&lesson=l1",
    );
    expect(courseSearch({ style: null }, { state: "path" })).toBe(
      "?state=path",
    );
  });
});
