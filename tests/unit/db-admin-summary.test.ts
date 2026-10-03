// Resumen del admin (20261003130000_admin_summary.sql, D154–D155): public.admin_summary contra
// PGlite con el seed. Solo el admin; contadores por estilo y en total; cada aviso y cada
// pendiente aparece cuando debe y no cuando no.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  applySeed,
  asAnon,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

const SALSA = "a0000000-0000-4000-8000-000000000001";
const MERENGUE = "a0000000-0000-4000-8000-000000000002";
const GUAPEA = "b1000000-0000-4000-8000-000000000001";
const SONG_1 = "c0000000-0000-4000-8000-000000000001"; // práctica y final de "La guapea"
const SONG_2 = "c0000000-0000-4000-8000-000000000002";
const SALSA_COURSE = "d0000000-0000-4000-8000-000000000001";
const LESSON_GUAPEA = "d2000000-0000-4000-8000-000000000111";
const NEW_STYLE = "a0000000-0000-4000-8000-0000000000d1";

let db: PGlite;
let ana: string; // alumna sin suscripción
let beto: string; // alumno con suscripción activa
let cesar: string; // admin

type Item = {
  kind: string;
  id: string;
  name: string;
  style: string | null;
  reasons: string[];
  expires_on?: string | null;
};
type StyleCounts = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  steps_published: number;
  steps_total: number;
  songs_published: number;
  songs_total: number;
  lessons_published: number;
  lessons_total: number;
};
type Summary = {
  styles: StyleCounts[];
  totals: Omit<StyleCounts, "id" | "slug" | "name" | "published"> & {
    students: number;
    students_active: number;
  };
  warnings: Item[];
  pending: Item[];
};

const summary = async (tx: Transaction) =>
  (await tx.query<{ s: Summary }>("select public.admin_summary() as s")).rows[0]
    .s;

/** Prepara como superusuario y consulta como `uid`; la transacción siempre se revierte. */
async function withData<T>(
  uid: string,
  setup: (tx: Transaction) => Promise<unknown>,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      try {
        // Un fallo de la preparación también se informa (no queda como "undefined").
        await setup(tx);
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
          uid,
        ]);
        await tx.exec("set local role authenticated");
        result = await fn(tx);
      } catch (error) {
        failure = error;
      }
      await tx.rollback();
    })
    .catch(() => {});
  if (failure) throw failure;
  return result as T;
}

const adminSummary = (setup: (tx: Transaction) => Promise<unknown>) =>
  withData(cesar, setup, summary);

const find = (items: Item[], id: string) => items.find((i) => i.id === id);

/** Canción lista para publicar (cumple `songs_publish_requirements`), con vencimiento. */
const publishSong = (
  tx: Transaction,
  id: string,
  expiresInDays: number | null,
) =>
  tx.query(
    `update public.songs set audio_path = 'songs/' || id || '.mp3',
       license_source = 'Licencia de prueba', license_document_path = 'licencias/' || id || '.pdf',
       license_expires_at = case when $2::int is null then null else current_date + $2::int end,
       published = true
     where id = $1`,
    [id, expiresInDays],
  );

const video = (tx: Transaction, step: string, role: string) =>
  tx.query(
    `insert into public.step_videos (step_id, role, video_path)
     values ($1::uuid, $2::public.video_role, 'videos/' || $1::text || '-' || $2::text || '.mp4')`,
    [step, role],
  );

beforeAll(async () => {
  db = await createDb();
  await applySeed(db);
  ana = await createUser(db, "ana@example.com");
  beto = await createUser(db, "beto@example.com");
  cesar = await createUser(db, "cesar@example.com");
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
  await db.query(
    `insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
     select $1, id, 'active', 'placeholder', now() + interval '30 days' from public.plans where slug = 'basico'`,
    [beto],
  );
}, DB_BOOT_TIMEOUT_MS);

describe("admin_summary", () => {
  test("anónimo no puede llamarla", async () => {
    await expect(asAnon(db, summary)).rejects.toThrow(/permission denied/);
  });

  test("un alumno recibe 42501", async () => {
    await expect(asUser(db, ana, summary)).rejects.toMatchObject({
      code: "42501",
    });
  });

  test("contadores por estilo y en total con el seed", async () => {
    const { rows } = await db.query<{ style_id: string; n: number }>(
      "select style_id, count(*)::int as n from public.steps group by style_id",
    );
    const steps = new Map(rows.map((r) => [r.style_id, r.n]));
    const s = await asUser(db, cesar, summary);

    expect(s.styles.map((x) => x.slug)).toEqual(["salsa-casino", "merengue"]);
    expect(s.styles[0]).toMatchObject({
      id: SALSA,
      published: true,
      steps_published: steps.get(SALSA),
      steps_total: steps.get(SALSA),
      songs_published: 0,
      songs_total: 3,
      lessons_published: 6,
      lessons_total: 6,
    });
    expect(s.styles[1]).toMatchObject({ id: MERENGUE, songs_total: 2 });
    const allSteps = (steps.get(SALSA) ?? 0) + (steps.get(MERENGUE) ?? 0);
    expect(s.totals).toEqual({
      steps_published: allSteps,
      steps_total: allSteps,
      songs_published: 0,
      songs_total: 5,
      lessons_published: 12,
      lessons_total: 12,
      students: 2,
      students_active: 1,
    });
  });

  test("seed: pasos publicados sin video, lecciones con canciones no visibles, canciones en borrador", async () => {
    const s = await asUser(db, cesar, summary);
    const stepWarnings = s.warnings.filter((w) => w.kind === "step");
    expect(stepWarnings).toHaveLength(s.totals.steps_published);
    expect(find(s.warnings, GUAPEA)).toEqual({
      kind: "step",
      id: GUAPEA,
      name: "Guapea",
      style: "salsa-casino",
      reasons: ["missing_video"],
      expires_on: null,
    });
    const lessons = s.warnings.filter((w) => w.kind === "lesson");
    expect(lessons).toHaveLength(12);
    expect(lessons.every((l) => l.reasons.join() === "song_unavailable")).toBe(
      true,
    );
    // En el orden del curso: salsa primero, unidad 1 lección 1.
    expect(lessons[0]).toMatchObject({ id: LESSON_GUAPEA, name: "La guapea" });
    // Avisos por tipo: pasos, luego lecciones (no hay canciones publicadas).
    expect(s.warnings.map((w) => w.kind).indexOf("lesson")).toBe(
      stepWarnings.length,
    );

    expect(s.pending.map((p) => p.kind)).toEqual(Array(5).fill("song"));
    expect(find(s.pending, SONG_1)).toEqual({
      kind: "song",
      id: SONG_1,
      name: "Pista de prueba 1 · casino lento",
      style: "salsa-casino",
      reasons: ["missing_audio", "missing_license"],
    });
  });

  test("video completo: uno `both`, o líder y seguidor", async () => {
    const leaderOnly = await adminSummary((tx) => video(tx, GUAPEA, "leader"));
    expect(find(leaderOnly.warnings, GUAPEA)?.reasons).toEqual([
      "missing_video",
    ]);
    const both = await adminSummary(async (tx) => {
      await video(tx, GUAPEA, "leader");
      await video(tx, GUAPEA, "follower");
    });
    expect(find(both.warnings, GUAPEA)).toBeUndefined();
    const single = await adminSummary((tx) => video(tx, GUAPEA, "both"));
    expect(find(single.warnings, GUAPEA)).toBeUndefined();
  });

  test("licencia: vencida y por vencer (≤ 30 días) avisan; vigente o sin fecha, no", async () => {
    const s = await adminSummary(async (tx) => {
      await publishSong(tx, SONG_1, -1);
      await publishSong(tx, SONG_2, 30);
      await publishSong(tx, "c0000000-0000-4000-8000-000000000003", 31);
      await publishSong(tx, "c0000000-0000-4000-8000-000000000004", null);
    });
    expect(find(s.warnings, SONG_1)).toMatchObject({
      kind: "song",
      reasons: ["license_expired"],
    });
    expect(find(s.warnings, SONG_1)?.expires_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(find(s.warnings, SONG_2)?.reasons).toEqual(["license_expiring"]);
    expect(
      find(s.warnings, "c0000000-0000-4000-8000-000000000003"),
    ).toBeUndefined();
    expect(
      find(s.warnings, "c0000000-0000-4000-8000-000000000004"),
    ).toBeUndefined();
    expect(s.totals.songs_published).toBe(4);
    expect(s.styles[0].songs_published).toBe(3);
    // Publicadas ya no son pendientes.
    expect(find(s.pending, SONG_1)).toBeUndefined();
    // "La guapea" usa SONG_1, vencida: sigue sin canción visible.
    expect(find(s.warnings, LESSON_GUAPEA)?.reasons).toEqual([
      "song_unavailable",
    ]);
  });

  test("lección: canción visible sin aviso; paso sin publicar y sin canciones, con aviso", async () => {
    const ok = await adminSummary((tx) => publishSong(tx, SONG_1, null));
    expect(find(ok.warnings, LESSON_GUAPEA)).toBeUndefined();

    const broken = await adminSummary(async (tx) => {
      await tx.query(
        "update public.steps set published = false where id = $1",
        [GUAPEA],
      );
      await tx.query(
        "update public.lessons set practice_song_id = null, final_song_id = null where id = $1",
        [LESSON_GUAPEA],
      );
    });
    expect(find(broken.warnings, LESSON_GUAPEA)?.reasons).toEqual([
      "step_unpublished",
      "missing_song",
    ]);
    // El paso sin publicar pasa a pendientes, con lo que le falta.
    expect(find(broken.warnings, GUAPEA)).toBeUndefined();
    expect(find(broken.pending, GUAPEA)).toEqual({
      kind: "step",
      id: GUAPEA,
      name: "Guapea",
      style: "salsa-casino",
      reasons: ["missing_video"],
    });
    expect(broken.styles[0].steps_published).toBe(
      broken.styles[0].steps_total - 1,
    );
  });

  test("paso en borrador con video completo: pendiente sin motivos (listo para publicar)", async () => {
    const s = await adminSummary(async (tx) => {
      await tx.query(
        "update public.steps set published = false where id = $1",
        [GUAPEA],
      );
      await video(tx, GUAPEA, "both");
    });
    expect(find(s.pending, GUAPEA)?.reasons).toEqual([]);
  });

  test("curso sin publicar: sus lecciones no cuentan como publicadas ni avisan", async () => {
    const s = await adminSummary((tx) =>
      tx.query("update public.courses set published = false where id = $1", [
        SALSA_COURSE,
      ]),
    );
    expect(s.styles[0]).toMatchObject({
      lessons_published: 0,
      lessons_total: 6,
    });
    expect(s.totals.lessons_published).toBe(6);
    expect(find(s.warnings, LESSON_GUAPEA)).toBeUndefined();
  });

  test("estilo sin publicar: pendiente, con la posición inicial si le falta", async () => {
    const s = await adminSummary((tx) =>
      tx.query(
        `insert into public.dance_styles (id, slug, name, spoken_beats, published, sort_order)
         values ($1, 'bachata', 'Bachata', '{1,2,3,5,6,7}', false, 3)`,
        [NEW_STYLE],
      ),
    );
    expect(s.styles.map((x) => x.slug)).toEqual([
      "salsa-casino",
      "merengue",
      "bachata",
    ]);
    expect(s.styles[2]).toMatchObject({
      published: false,
      steps_total: 0,
      lessons_total: 0,
    });
    expect(find(s.pending, NEW_STYLE)).toEqual({
      kind: "style",
      id: NEW_STYLE,
      name: "Bachata",
      style: "bachata",
      reasons: ["missing_start_position"],
    });
    expect(s.pending.at(-1)?.id).toBe(NEW_STYLE);
  });

  test("suscripción vencida no cuenta como activa; el admin no es alumno", async () => {
    const s = await adminSummary((tx) =>
      tx.query(
        `update public.subscriptions set current_period_start = now() - interval '60 days',
           current_period_end = now() - interval '1 day' where user_id = $1`,
        [beto],
      ),
    );
    expect(s.totals).toMatchObject({ students: 2, students_active: 0 });
  });
});
