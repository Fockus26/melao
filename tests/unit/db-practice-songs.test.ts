// Práctica libre (20261001130000_practice_songs.sql, D117): public.practice_songs y
// private.song_difficulty, contra PGlite con el seed.
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
const SONG = {
  s1: "c0000000-0000-4000-8000-000000000001", // 160 BPM
  s2: "c0000000-0000-4000-8000-000000000002", // 180 BPM
  s3: "c0000000-0000-4000-8000-000000000003", // 200 BPM
  m4: "c0000000-0000-4000-8000-000000000004",
};

let db: PGlite;
let ana: string; // alumna
let beto: string; // alumno
let cesar: string; // admin

type Row = {
  song_id: string;
  title: string;
  artist: string;
  bpm: string;
  duration_ms: number;
  dance_end_ms: number | null;
  beat_grid: unknown;
  difficulty: number | null;
  favorite: boolean;
  sessions_30d: string | number;
  popularity: number;
  ready: boolean;
};

const songs = async (tx: Transaction, style = SALSA) =>
  (await tx.query<Row>("select * from public.practice_songs($1)", [style]))
    .rows;

/** Publica las canciones del seed (con fuente y documento de licencia ficticios). */
const publishAll = (tx: Transaction) =>
  tx.exec(`
    update public.songs set audio_path = 'prueba.mp3', license_source = 'prueba',
      license_document_path = 'licencia.pdf', published = true;
  `);

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
}, DB_BOOT_TIMEOUT_MS);

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
      await setup(tx);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
        uid,
      ]);
      await tx.exec("set local role authenticated");
      try {
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

describe("practice_songs", () => {
  test("anon no puede llamarla", async () => {
    await expect(asAnon(db, (tx) => songs(tx))).rejects.toThrow(
      /permission denied/,
    );
  });

  test("un alumno no ve canciones sin publicar (las del seed)", async () => {
    expect(await asUser(db, ana, (tx) => songs(tx))).toEqual([]);
  });

  test("el admin ve las del seed del estilo, por título, listas para practicar", async () => {
    const rows = await asUser(db, cesar, (tx) => songs(tx));
    expect(rows.map((r) => r.song_id)).toEqual([SONG.s1, SONG.s2, SONG.s3]);
    expect(rows.every((r) => r.ready)).toBe(true);
    expect(rows[0]).toMatchObject({
      title: "Pista de prueba 1 · casino lento",
      artist: "Melao (placeholder)",
      duration_ms: 210000,
      dance_end_ms: 195000,
      favorite: false,
      popularity: 0,
    });
    expect(Number(rows[0].bpm)).toBe(160);
    expect(Number(rows[0].sessions_30d)).toBe(0);
    expect(rows[0].beat_grid).toEqual([
      { beat: 0, tMs: 1500 },
      { beat: 512, tMs: 193500 },
    ]);
  });

  test("publicadas: el alumno las ve; la licencia vencida las oculta", async () => {
    const rows = await withData(
      ana,
      async (tx) => {
        await publishAll(tx);
        await tx.query(
          "update public.songs set license_expires_at = current_date - 1 where id = $1",
          [SONG.s2],
        );
      },
      (tx) => songs(tx),
    );
    expect(rows.map((r) => r.song_id)).toEqual([SONG.s1, SONG.s3]);
  });

  test("solo las del estilo pedido", async () => {
    const rows = await asUser(db, cesar, (tx) => songs(tx, MERENGUE));
    expect(rows.map((r) => r.song_id)).toContain(SONG.m4);
    expect(rows.map((r) => r.song_id)).not.toContain(SONG.s1);
  });

  test("favorita: solo las de quien llama", async () => {
    const rows = await withData(
      ana,
      async (tx) => {
        await publishAll(tx);
        await tx.query(
          "insert into public.user_song_favorites (user_id, song_id) values ($1, $2), ($3, $4)",
          [ana, SONG.s2, beto, SONG.s3],
        );
      },
      (tx) => songs(tx),
    );
    expect(rows.filter((r) => r.favorite).map((r) => r.song_id)).toEqual([
      SONG.s2,
    ]);
    // El admin lee los favoritos de todos por RLS, pero la función solo marca los suyos.
    const admin = await withData(
      cesar,
      (tx) =>
        tx.query(
          "insert into public.user_song_favorites (user_id, song_id) values ($1, $2)",
          [ana, SONG.s1],
        ),
      (tx) => songs(tx),
    );
    expect(admin.some((r) => r.favorite)).toBe(false);
  });

  test("popularidad: sesiones de 30 días de todos los alumnos", async () => {
    const rows = await withData(
      ana,
      async (tx) => {
        await publishAll(tx);
        await tx.query(
          `insert into public.practice_sessions (user_id, style_id, song_id, mode, seed, phrases_available, plan, created_at)
           values ($1, $3, $4, 'free', 1, 0, '[]', now()),
                  ($2, $3, $4, 'free', 2, 0, '[]', now()),
                  ($2, $3, $5, 'free', 3, 0, '[]', now() - interval '40 days')`,
          [ana, beto, SALSA, SONG.s3, SONG.s1],
        );
      },
      (tx) => songs(tx),
    );
    const s3 = rows.find((r) => r.song_id === SONG.s3);
    const s1 = rows.find((r) => r.song_id === SONG.s1);
    expect(Number(s3?.sessions_30d)).toBe(2);
    expect(Number(s1?.sessions_30d)).toBe(0);
    expect(s3?.popularity).toBeGreaterThan(s1?.popularity ?? 1);
  });

  test("ready = false sin rejilla suficiente o sin dance_end_ms", async () => {
    const rows = await withData(
      cesar,
      (tx) =>
        tx.query(
          `update public.songs set beat_grid = '[{"beat":0,"tMs":1500}]' where id = $1;`,
          [SONG.s1],
        ),
      (tx) => songs(tx),
    );
    expect(rows.find((r) => r.song_id === SONG.s1)?.ready).toBe(false);
    const rows2 = await withData(
      cesar,
      (tx) =>
        tx.query("update public.songs set dance_end_ms = null where id = $1", [
          SONG.s2,
        ]),
      (tx) => songs(tx),
    );
    expect(rows2.find((r) => r.song_id === SONG.s2)?.ready).toBe(false);
  });

  test("dificultad: override del admin, si no por bandas de BPM del estilo", async () => {
    const rows = await withData(
      cesar,
      async (tx) => {
        await tx.query(
          "update public.dance_styles set difficulty_bpm_bands = '{150,170,190}' where id = $1",
          [SALSA],
        );
        await tx.query(
          "update public.songs set difficulty_override = 1 where id = $1",
          [SONG.s3],
        );
      },
      (tx) => songs(tx),
    );
    const by = Object.fromEntries(rows.map((r) => [r.song_id, r.difficulty]));
    expect(by[SONG.s1]).toBe(2); // 160 ≤ 170
    expect(by[SONG.s2]).toBe(3); // 180 ≤ 190
    expect(by[SONG.s3]).toBe(1); // override (sin él: 200 > 190 → 4)
  });
});

describe("private.song_difficulty", () => {
  const diff = async (
    override: number | null,
    bpm: number | null,
    bands: number[] | null,
  ) =>
    (
      await db.query<{ d: number | null }>(
        "select private.song_difficulty($1::smallint, $2::numeric, $3::smallint[]) as d",
        [override, bpm, bands],
      )
    ).rows[0].d;

  test("sin bandas o sin BPM: null (salvo override)", async () => {
    expect(await diff(null, 180, null)).toBeNull();
    expect(await diff(null, null, [150, 170])).toBeNull();
    expect(await diff(4, null, null)).toBe(4);
  });

  test("el tope es inclusivo y por encima del último sube un nivel, máx. 5", async () => {
    expect(await diff(null, 150, [150, 170])).toBe(1);
    expect(await diff(null, 150.5, [150, 170])).toBe(2);
    expect(await diff(null, 200, [150, 170])).toBe(3);
    expect(await diff(null, 300, [100, 120, 140, 160, 180])).toBe(5);
  });
});
