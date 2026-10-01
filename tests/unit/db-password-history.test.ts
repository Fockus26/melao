// Historial de contraseñas (20260930160000_password_history.sql, D106–D108): el trigger en
// auth.users guarda el hash anterior y `password_recently_used` mira el actual + 2 anteriores.
// Los hashes son bcrypt de pgcrypto (como los de Supabase Auth), con coste bajo para ir rápido.
import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import {
  asAnon,
  asService,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

let db: PGlite;

/** Lo que hace Supabase Auth al cambiar la contraseña: reescribe `encrypted_password`. */
const setPassword = (id: string, password: string | null) =>
  db.query(
    `update auth.users
        set encrypted_password = case when $2::text is null then null
                                      else extensions.crypt($2, extensions.gen_salt('bf', 4)) end
      where id = $1`,
    [id, password],
  );

const recentlyUsed = async (tx: Transaction, id: string, candidate: string) =>
  (
    await tx.query<{ used: boolean }>(
      "select public.ef_password_recently_used($1, $2) as used",
      [id, candidate],
    )
  ).rows[0].used;

const historyCount = async (id: string) =>
  (
    await db.query<{ n: number }>(
      "select count(*)::int as n from private.password_history where user_id = $1",
      [id],
    )
  ).rows[0].n;

beforeAll(async () => {
  db = await createDb();
}, DB_BOOT_TIMEOUT_MS);

describe("password_history: trigger", () => {
  test("una cuenta sin contraseña (Google) no deja historial al poner la primera", async () => {
    const id = await createUser(db, "google@example.com");
    await setPassword(id, "Primera#1");
    expect(await historyCount(id)).toBe(0);
  });

  test("guarda el hash anterior y poda a los 2 más recientes", async () => {
    const id = await createUser(db, "poda@example.com");
    await setPassword(id, "Uno#1111");
    await setPassword(id, "Dos#2222");
    expect(await historyCount(id)).toBe(1);
    await setPassword(id, "Tres#3333");
    await setPassword(id, "Cuatro#44");
    await setPassword(id, "Cinco#555");
    expect(await historyCount(id)).toBe(2);
  });

  test("un update que no toca la contraseña no registra nada", async () => {
    const id = await createUser(db, "otro-campo@example.com");
    await setPassword(id, "Uno#1111");
    await db.query("update auth.users set email = $2 where id = $1", [
      id,
      "otro-campo-2@example.com",
    ]);
    await db.query(
      "update auth.users set encrypted_password = encrypted_password where id = $1",
      [id],
    );
    expect(await historyCount(id)).toBe(0);
  });

  test("borrar la cuenta borra su historial", async () => {
    const id = await createUser(db, "borrar@example.com");
    await setPassword(id, "Uno#1111");
    await setPassword(id, "Dos#2222");
    expect(await historyCount(id)).toBe(1);
    await db.query("delete from auth.users where id = $1", [id]);
    expect(await historyCount(id)).toBe(0);
  });
});

describe("password_recently_used: últimas 3", () => {
  test("la actual y las 2 anteriores fallan; la 1.ª vuelve a valer a la 4.ª", async () => {
    const id = await createUser(db, "ciclo@example.com");
    await setPassword(id, "Primera#1");
    await setPassword(id, "Segunda#2");
    await setPassword(id, "Tercera#3");

    await asService(db, async (tx) => {
      expect(await recentlyUsed(tx, id, "Primera#1")).toBe(true);
      expect(await recentlyUsed(tx, id, "Segunda#2")).toBe(true);
      expect(await recentlyUsed(tx, id, "Tercera#3")).toBe(true);
      expect(await recentlyUsed(tx, id, "Nueva#444")).toBe(false);
    });

    await setPassword(id, "Cuarta#44");
    await asService(db, async (tx) => {
      expect(await recentlyUsed(tx, id, "Primera#1")).toBe(false);
      expect(await recentlyUsed(tx, id, "Segunda#2")).toBe(true);
      expect(await recentlyUsed(tx, id, "Tercera#3")).toBe(true);
      expect(await recentlyUsed(tx, id, "Cuarta#44")).toBe(true);
    });
  });

  test("distingue mayúsculas y no mezcla usuarios", async () => {
    const ana = await createUser(db, "ana-ph@example.com");
    const beto = await createUser(db, "beto-ph@example.com");
    await setPassword(ana, "Secreta#1");
    await asService(db, async (tx) => {
      expect(await recentlyUsed(tx, ana, "secreta#1")).toBe(false);
      expect(await recentlyUsed(tx, beto, "Secreta#1")).toBe(false);
      expect(await recentlyUsed(tx, ana, "")).toBe(false);
    });
  });

  test("usuario inexistente o sin contraseña → false", async () => {
    const sin = await createUser(db, "sin-pass@example.com");
    await asService(db, async (tx) => {
      expect(await recentlyUsed(tx, sin, "Cualquiera#1")).toBe(false);
      expect(
        await recentlyUsed(
          tx,
          "99999999-9999-4999-8999-999999999999",
          "Cualquiera#1",
        ),
      ).toBe(false);
    });
  });
});

describe("permisos", () => {
  let id: string;
  beforeAll(async () => {
    id = await createUser(db, "permisos-ph@example.com");
    await setPassword(id, "Uno#1111");
    await setPassword(id, "Dos#2222");
  });

  test("anon y authenticated no ejecutan las funciones", async () => {
    for (const fn of [
      "public.ef_password_recently_used",
      "private.password_recently_used",
    ]) {
      await expect(
        asAnon(db, (tx) => tx.query(`select ${fn}($1, 'Uno#1111')`, [id])),
      ).rejects.toThrow(/permission denied/);
      await expect(
        asUser(db, id, (tx) => tx.query(`select ${fn}($1, 'Uno#1111')`, [id])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  test("nadie de la API lee el historial, ni service_role", async () => {
    await expect(
      asUser(db, id, (tx) =>
        tx.query("select * from private.password_history"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asService(db, (tx) => tx.query("select * from private.password_history")),
    ).rejects.toThrow(/permission denied/);
  });

  test("service_role ejecuta el puente y la función privada", async () => {
    await asService(db, async (tx) => {
      const { rows } = await tx.query<{ used: boolean }>(
        "select private.password_recently_used($1, 'Uno#1111') as used",
        [id],
      );
      expect(rows[0].used).toBe(true);
    });
  });
});
