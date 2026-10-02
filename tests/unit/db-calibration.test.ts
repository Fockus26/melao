// Calibrar audífonos (20261002170000_calibration.sql): `save_audio_latency()` guarda la latencia
// de quien llama por (plataforma, dispositivo), con `measured_at` del servidor y el rango del
// ajuste (−200…300, D142).
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  asAnon,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

let db: PGlite;
let ana: string; // sin calibraciones
let beto: string; // con una calibración vieja de su Bluetooth
let cesar: string; // admin

type Row = {
  user_id: string;
  platform: string;
  device_key: string;
  device_label: string | null;
  offset_ms: number;
  sd_ms: number | null;
  taps: number | null;
  measured_at: Date;
};

const save = (
  tx: Transaction,
  args: {
    key?: string;
    label?: string | null;
    offset: number;
    sd?: number | null;
    taps?: number | null;
  },
) =>
  tx.query<Row>(
    "select * from public.save_audio_latency('web', $1, $2, $3, $4, $5)",
    [
      args.key ?? "bluetooth:android",
      args.label ?? "Audífonos Bluetooth · Android",
      args.offset,
      args.sd ?? null,
      args.taps ?? null,
    ],
  );

const rowsOf = (tx: Transaction) =>
  tx.query<Row>(
    "select * from public.audio_latency order by device_key, measured_at",
  );

beforeAll(async () => {
  db = await createDb();
  [ana, beto, cesar] = await Promise.all(
    ["ana", "beto", "cesar"].map((n) => createUser(db, `${n}@example.com`)),
  );
  await db.query(
    "update public.profiles set app_role = 'admin' where id = $1",
    [cesar],
  );
  await db.query(
    `insert into public.audio_latency
       (user_id, platform, device_key, device_label, offset_ms, sd_ms, taps, measured_at)
     values ($1, 'web', 'bluetooth:android', 'Audífonos Bluetooth · Android', 120, 9, 8,
             '2026-09-01T12:00:00Z')`,
    [beto],
  );
}, DB_BOOT_TIMEOUT_MS);

describe("save_audio_latency", () => {
  test("crea la fila de quien llama con la hora del servidor", async () => {
    const [row] = await asUser(
      db,
      ana,
      async (tx) => (await save(tx, { offset: 180, sd: 14.2, taps: 8 })).rows,
    );
    expect(row).toMatchObject({
      user_id: ana,
      platform: "web",
      device_key: "bluetooth:android",
      offset_ms: 180,
      taps: 8,
    });
    expect(row.sd_ms).toBeCloseTo(14.2, 4);
    expect(Date.now() - row.measured_at.getTime()).toBeLessThan(60_000);
  });

  test("repetir el mismo dispositivo actualiza la fila y su measured_at", async () => {
    const rows = await asUser(db, beto, async (tx) => {
      await save(tx, { offset: 190, label: "Audífonos Bluetooth · Android" });
      return (await rowsOf(tx)).rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ offset_ms: 190, sd_ms: null, taps: null });
    expect(rows[0].measured_at.getTime()).toBeGreaterThan(
      new Date("2026-09-01T12:00:00Z").getTime(),
    );
  });

  test("otro dispositivo es otra fila; la más reciente es la nueva (D124)", async () => {
    const latest = await asUser(db, beto, async (tx) => {
      await save(tx, { key: "speaker:android", label: null, offset: 40 });
      const all = (await rowsOf(tx)).rows;
      const { rows } = await tx.query<{ device_key: string }>(
        `select device_key from public.audio_latency
          where user_id = $1 and platform = 'web'
          order by measured_at desc limit 1`,
        [beto],
      );
      return { all, latest: rows[0].device_key };
    });
    expect(latest.all).toHaveLength(2);
    expect(latest.latest).toBe("speaker:android");
  });

  test("el admin guarda la suya y no toca la de nadie", async () => {
    const rows = await asUser(db, cesar, async (tx) => {
      await save(tx, { offset: 0 });
      return (await rowsOf(tx)).rows;
    });
    // RLS de audio_latency: solo el dueño, también para el admin. La de Beto no cambió.
    expect(rows.map((r) => [r.user_id, r.offset_ms])).toEqual([[cesar, 0]]);
    const { rows: betoRows } = await db.query<Row>(
      "select offset_ms from public.audio_latency where user_id = $1",
      [beto],
    );
    expect(betoRows.map((r) => r.offset_ms)).toEqual([120]);
  });

  test("rango del ajuste: −200 y 300 valen; fuera, 22023", async () => {
    for (const offset of [-200, 300]) {
      const [row] = await asUser(
        db,
        ana,
        async (tx) => (await save(tx, { offset })).rows,
      );
      expect(row.offset_ms).toBe(offset);
    }
    for (const offset of [-201, 301, 1000]) {
      await expect(
        asUser(db, ana, (tx) => save(tx, { offset })),
      ).rejects.toThrow(/fuera de/);
    }
  });

  test("respeta los checks de la tabla (device_key vacío)", async () => {
    await expect(
      asUser(db, ana, (tx) => save(tx, { key: "", offset: 100 })),
    ).rejects.toThrow(/check/);
  });

  test("anon no puede llamarla", async () => {
    await expect(asAnon(db, (tx) => save(tx, { offset: 100 }))).rejects.toThrow(
      /permission denied/,
    );
  });
});
