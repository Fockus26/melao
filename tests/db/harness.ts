// Arnés de base de datos para los tests (D037): Postgres real en proceso (PGlite),
// el stub de Supabase y todas las migraciones de supabase/migrations en orden.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const root = join(import.meta.dir, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(
    readFileSync(join(import.meta.dir, "supabase-stub.sql"), "utf8"),
  );
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    } catch (error) {
      throw new Error(`migración ${file}: ${(error as Error).message}`);
    }
  }
  return db;
}

/** Crea un usuario de Auth (dispara el trigger de profiles) y devuelve su id. */
export async function createUser(
  db: PGlite,
  email: string,
  meta: Record<string, unknown> = {},
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return rows[0].id;
}

type Who =
  | { role: "anon" }
  | { role: "authenticated"; uid: string }
  | { role: "service_role" };

/**
 * Corre `fn` como lo haría la API de Supabase para ese rol, dentro de una transacción
 * que siempre se revierte: cada llamada ve la base tal como la dejó la preparación.
 */
export async function as<T>(
  db: PGlite,
  who: Who,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db
    .transaction(async (tx) => {
      const sub = who.role === "authenticated" ? who.uid : "";
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
        sub,
      ]);
      await tx.exec(`set local role ${who.role}`);
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

export const asAnon = <T>(db: PGlite, fn: (tx: Transaction) => Promise<T>) =>
  as(db, { role: "anon" }, fn);
export const asUser = <T>(
  db: PGlite,
  uid: string,
  fn: (tx: Transaction) => Promise<T>,
) => as(db, { role: "authenticated", uid }, fn);
export const asService = <T>(db: PGlite, fn: (tx: Transaction) => Promise<T>) =>
  as(db, { role: "service_role" }, fn);
