// Admin · Camino (20261003170000_admin_course.sql, D168–D173) contra PGlite con el seed: la lectura
// `admin_course`, altas al final, reordenar unidades y lecciones sin romper el `unique … deferrable`,
// guardar una lección con sus pasos, las reglas de estilo, publicar el curso y borrar con progreso.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  asAnon,
  asUser,
  applySeed,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const SALSA_COURSE = "d0000000-0000-4000-8000-000000000001";
const UNIT_1 = "d1000000-0000-4000-8000-000000000011";
const UNIT_2 = "d1000000-0000-4000-8000-000000000012";
const MERENGUE_UNIT = "d1000000-0000-4000-8000-000000000021";
const L111 = "d2000000-0000-4000-8000-000000000111";
const L112 = "d2000000-0000-4000-8000-000000000112";
const L113 = "d2000000-0000-4000-8000-000000000113";
const L121 = "d2000000-0000-4000-8000-000000000121";
const SONG_SALSA = "c0000000-0000-4000-8000-000000000001";
const SONG_MERENGUE = "c0000000-0000-4000-8000-000000000004";

let db: PGlite;
let ana: string; // alumna
let cesar: string; // admin

/** Código SQLSTATE del error que lanza `fn`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

type CourseJson = {
  course: { id: string; published: boolean; issues: string[] } | null;
  units: {
    id: string;
    position: number;
    title: string;
    lessons: {
      id: string;
      position: number;
      step_ids: string[];
      progress_count: number;
      issues: string[];
    }[];
  }[];
  steps: { id: string; slug: string }[];
  songs: { id: string; in_style: boolean; visible: boolean }[];
};

const read = async (tx: Transaction, style = SALSA) =>
  (
    await tx.query<{ data: CourseJson | null }>(
      "select public.admin_course($1) as data",
      [style],
    )
  ).rows[0].data;

const order = async (tx: Transaction, course = SALSA_COURSE) =>
  (
    await tx.query<{ unit: string; lessons: string[] | null }>(
      `select u.id as unit, array_agg(l.id order by l.position) filter (where l.id is not null) as lessons
       from public.course_units u left join public.lessons l on l.unit_id = u.id
       where u.course_id = $1 group by u.id, u.position order by u.position`,
      [course],
    )
  ).rows.map((r) => [r.unit, r.lessons ?? []]);

const stepId = async (tx: Transaction, slug: string, style = SALSA) =>
  (
    await tx.query<{ id: string }>(
      "select id from public.steps where style_id = $1 and slug = $2",
      [style, slug],
    )
  ).rows[0].id;

const saveLesson = (
  tx: Transaction,
  lesson: string,
  fields: Record<string, unknown>,
  steps: string[],
) =>
  tx.query("select public.admin_save_lesson($1, $2, $3)", [
    lesson,
    JSON.stringify({
      title: "La guapea",
      intro: "",
      practice_song_id: SONG_SALSA,
      practice_phrases: 4,
      final_song_id: SONG_SALSA,
      ...fields,
    }),
    steps,
  ]);

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  ana = await createUser(db, "ana@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
  // Ana completó la primera lección de salsa.
  await db.query(
    "insert into public.lesson_progress (user_id, lesson_id) values ($1, $2)",
    [ana, L111],
  );
}, DB_BOOT_TIMEOUT_MS);

describe("admin_course", () => {
  test("una lectura: curso, unidades y lecciones en orden, pasos y canciones", async () => {
    const data = await asUser(db, cesar, (tx) => read(tx));
    expect(data?.course?.id).toBe(SALSA_COURSE);
    expect(data?.course?.issues).toEqual([]);
    expect(data?.units.map((u) => u.id)).toEqual([UNIT_1, UNIT_2]);
    expect(data?.units[0].lessons.map((l) => l.id)).toEqual([L111, L112, L113]);
    const l112 = data?.units[0].lessons[1];
    expect(l112?.step_ids.length).toBe(3);
    expect(data?.units[0].lessons[0].progress_count).toBe(1);
    // Las canciones del seed no están publicadas: aviso de canción no disponible.
    expect(l112?.issues).toEqual(["song_unavailable"]);
    expect(data?.songs.every((s) => s.in_style && !s.visible)).toBe(true);
    expect(data?.steps.length).toBeGreaterThan(5);
  });

  test("estilo inexistente → null; alumno → 42501; anónimo sin permiso", async () => {
    expect(
      await asUser(db, cesar, (tx) =>
        read(tx, "00000000-0000-4000-8000-000000000000"),
      ),
    ).toBeNull();
    expect(await codeOf(() => asUser(db, ana, (tx) => read(tx)))).toBe("42501");
    expect(await codeOf(() => asAnon(db, (tx) => read(tx)))).toBe("42501");
  });

  test("estilo sin curso: course null y sin unidades", async () => {
    const data = await asUser(db, cesar, async (tx) => {
      await tx.query("delete from public.courses where style_id = $1", [
        MERENGUE,
      ]);
      return read(tx, MERENGUE);
    });
    expect(data?.course).toBeNull();
    expect(data?.units).toEqual([]);
  });
});

describe("altas al final", () => {
  test("admin_add_unit y admin_add_lesson toman la última posición + 1", async () => {
    const result = await asUser(db, cesar, async (tx) => {
      const unit = (
        await tx.query<{ id: string }>(
          "select public.admin_add_unit($1, $2) as id",
          [SALSA_COURSE, "  Rueda de a dos  "],
        )
      ).rows[0].id;
      const lesson = (
        await tx.query<{ id: string }>(
          "select public.admin_add_lesson($1, $2) as id",
          [UNIT_1, "Repaso"],
        )
      ).rows[0].id;
      const rows = await tx.query<{ position: number; title: string }>(
        "select position, title from public.course_units where id = $1 union all select position, title from public.lessons where id = $2",
        [unit, lesson],
      );
      return rows.rows;
    });
    expect(result).toEqual([
      { position: 3, title: "Rueda de a dos" },
      { position: 4, title: "Repaso" },
    ]);
  });

  test("la alumna no crea unidades", async () => {
    expect(
      await codeOf(() =>
        asUser(db, ana, (tx) =>
          tx.query("select public.admin_add_unit($1, 'X')", [SALSA_COURSE]),
        ),
      ),
    ).toBe("42501");
  });
});

describe("reordenar", () => {
  test("mover una unidad renumera sin romper el unique", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      await tx.query("select public.admin_move_unit($1, 1)", [UNIT_2]);
      // El unique diferido se comprueba al cerrar: se fuerza aquí.
      await tx.exec("set constraints all immediate");
      return order(tx);
    });
    expect(got.map(([u]) => u)).toEqual([UNIT_2, UNIT_1]);
  });

  test("la posición se acota a la lista", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      await tx.query("select public.admin_move_unit($1, 99)", [UNIT_1]);
      await tx.exec("set constraints all immediate");
      return order(tx);
    });
    expect(got.map(([u]) => u)).toEqual([UNIT_2, UNIT_1]);
  });

  test("mover una lección dentro de su unidad", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      await tx.query("select public.admin_move_lesson($1, $2, 1)", [
        L113,
        UNIT_1,
      ]);
      await tx.exec("set constraints all immediate");
      return order(tx);
    });
    expect(got[0][1]).toEqual([L113, L111, L112]);
  });

  test("mover una lección a otra unidad cierra el hueco del origen", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      await tx.query("select public.admin_move_lesson($1, $2, 2)", [
        L112,
        UNIT_2,
      ]);
      await tx.exec("set constraints all immediate");
      const positions = await tx.query<{ position: number }>(
        "select position from public.lessons where unit_id = $1 order by position",
        [UNIT_1],
      );
      return { order: await order(tx), positions: positions.rows };
    });
    expect(got.order[0][1]).toEqual([L111, L113]);
    expect(got.order[1][1].slice(0, 2)).toEqual([L121, L112]);
    expect(got.positions.map((p) => p.position)).toEqual([1, 2]);
  });

  test("a una unidad de otro curso → 22023; lección inexistente → P0002", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("select public.admin_move_lesson($1, $2, 1)", [
            L112,
            MERENGUE_UNIT,
          ]),
        ),
      ),
    ).toBe("22023");
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("select public.admin_move_lesson($1, $2, 1)", [
            "00000000-0000-4000-8000-000000000000",
            UNIT_1,
          ]),
        ),
      ),
    ).toBe("P0002");
  });

  test("cambiar de curso por la tabla también se bloquea (MS024)", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("update public.lessons set unit_id = $2 where id = $1", [
            L112,
            MERENGUE_UNIT,
          ]),
        ),
      ),
    ).toBe("MS024");
  });

  test("la alumna no reordena", async () => {
    expect(
      await codeOf(() =>
        asUser(db, ana, (tx) =>
          tx.query("select public.admin_move_unit($1, 1)", [UNIT_2]),
        ),
      ),
    ).toBe("42501");
  });
});

describe("admin_save_lesson", () => {
  test("guarda los datos y los pasos en el orden dado", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      const [a, b, c] = await Promise.all([
        stepId(tx, "dile-que-no"),
        stepId(tx, "guapea"),
        stepId(tx, "dile-que-si"),
      ]);
      await saveLesson(
        tx,
        L112,
        { title: " Cerrada ", intro: "  ", practice_phrases: 8 },
        [c, a, b],
      );
      await tx.exec("set constraints all immediate");
      const lesson = await tx.query<{
        title: string;
        intro: string | null;
        practice_phrases: number;
      }>(
        "select title, intro, practice_phrases from public.lessons where id = $1",
        [L112],
      );
      const steps = await tx.query<{ step_id: string }>(
        "select step_id from public.lesson_steps where lesson_id = $1 order by position",
        [L112],
      );
      return {
        lesson: lesson.rows[0],
        steps: steps.rows.map((r) => r.step_id),
        expected: [c, a, b],
      };
    });
    expect(got.lesson).toEqual({
      title: "Cerrada",
      intro: null,
      practice_phrases: 8,
    });
    expect(got.steps).toEqual(got.expected);
  });

  test("paso de otro estilo → MS021", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) =>
          saveLesson(tx, L112, {}, [await stepId(tx, "basico", MERENGUE)]),
        ),
      ),
    ).toBe("MS021");
  });

  test("canción sin el estilo del curso → MS022", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) =>
          saveLesson(tx, L112, { final_song_id: SONG_MERENGUE }, [
            await stepId(tx, "guapea"),
          ]),
        ),
      ),
    ).toBe("MS022");
  });

  test("paso repetido → 22023; frases fuera de 1–32 → 23514", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          const g = await stepId(tx, "guapea");
          return saveLesson(tx, L112, {}, [g, g]);
        }),
      ),
    ).toBe("22023");
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) =>
          saveLesson(tx, L112, { practice_phrases: 33 }, [
            await stepId(tx, "guapea"),
          ]),
        ),
      ),
    ).toBe("23514");
  });

  test("la alumna no guarda lecciones", async () => {
    expect(
      await codeOf(() =>
        asUser(db, ana, (tx) => saveLesson(tx, L112, {}, [])),
      ),
    ).toBe("42501");
  });
});

describe("publicar el curso", () => {
  test("con una lección sin pasos ni canción: motivos y MS025 al publicar", async () => {
    const got = await asUser(db, cesar, async (tx) => {
      await tx.query("update public.courses set published = false where id = $1", [
        SALSA_COURSE,
      ]);
      await tx.query("select public.admin_add_lesson($1, 'Vacía')", [UNIT_2]);
      const data = await read(tx);
      const code = await codeOf(() =>
        tx.query("update public.courses set published = true where id = $1", [
          SALSA_COURSE,
        ]),
      );
      return { issues: data?.course?.issues, code };
    });
    expect(got.issues).toEqual(["lesson_without_steps", "lesson_without_song"]);
    expect(got.code).toBe("MS025");
  });

  test("un curso nuevo sin lecciones no se crea publicado", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, async (tx) => {
          await tx.query("delete from public.courses where style_id = $1", [
            MERENGUE,
          ]);
          return tx.query(
            "insert into public.courses (style_id, title, published) values ($1, 'Merengue', true)",
            [MERENGUE],
          );
        }),
      ),
    ).toBe("MS025");
  });
});

describe("borrar", () => {
  test("una lección que alguien completó no se borra (MS023), ni su unidad", async () => {
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.lessons where id = $1", [L111]),
        ),
      ),
    ).toBe("MS023");
    expect(
      await codeOf(() =>
        asUser(db, cesar, (tx) =>
          tx.query("delete from public.course_units where id = $1", [UNIT_1]),
        ),
      ),
    ).toBe("MS023");
  });

  test("sin progreso se borran la lección y la unidad con sus lecciones", async () => {
    const left = await asUser(db, cesar, async (tx) => {
      await tx.query("delete from public.lessons where id = $1", [L112]);
      await tx.query("delete from public.course_units where id = $1", [UNIT_2]);
      return order(tx);
    });
    expect(left).toEqual([[UNIT_1, [L111, L113]]]);
  });

  test("la alumna no borra (la RLS no le deja filas)", async () => {
    const left = await asUser(db, ana, async (tx) => {
      await tx.query("delete from public.lessons where id = $1", [L113]);
      return (
        await tx.query("select 1 from public.lessons where id = $1", [L113])
      ).rows.length;
    });
    expect(left).toBe(1);
  });
});
