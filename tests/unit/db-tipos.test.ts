// Los tipos generados (`bun run db:types`, contra el proyecto remoto) tienen que coincidir
// con lo que producen las migraciones del repo. Si una migración cambia y nadie regenera,
// este test lo dice en CI sin red: compara tablas, columnas, nulabilidad y enums.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { Constants } from "../../supabase/functions/_shared/database.types";
import { createDb } from "../db/harness";

const typesSource = readFileSync(
  join(
    import.meta.dir,
    "..",
    "..",
    "supabase",
    "functions",
    "_shared",
    "database.types.ts",
  ),
  "utf8",
  // En Windows con core.autocrlf la copia de trabajo llega en CRLF.
).replaceAll("\r\n", "\n");

/** Extrae `tabla → { columna → admite null }` de los bloques `Row` del archivo generado. */
function rowsFromTypes(
  source: string,
): Record<string, Record<string, boolean>> {
  const tablesBlock = source.slice(
    source.indexOf("    Tables: {"),
    source.indexOf("    Views: {"),
  );
  const result: Record<string, Record<string, boolean>> = {};
  const tableRe = /^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm;
  for (const [, table, body] of tablesBlock.matchAll(tableRe)) {
    const columns: Record<string, boolean> = {};
    for (const [, column, type] of body.matchAll(/^ {10}(\w+): (.+)$/gm)) {
      columns[column] = type.endsWith("| null");
    }
    result[table] = columns;
  }
  return result;
}

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

afterAll(async () => {
  await db.close();
});

describe("tipos generados vs. migraciones", () => {
  test("mismas tablas, columnas y nulabilidad", async () => {
    const { rows } = await db.query<{
      table_name: string;
      column_name: string;
      is_nullable: "YES" | "NO";
    }>(
      `select c.table_name, c.column_name, c.is_nullable
         from information_schema.columns c
         join information_schema.tables t
           on t.table_schema = c.table_schema and t.table_name = c.table_name
        where c.table_schema = 'public' and t.table_type = 'BASE TABLE'`,
    );
    const fromDb: Record<string, Record<string, boolean>> = {};
    for (const r of rows) {
      fromDb[r.table_name] ??= {};
      fromDb[r.table_name][r.column_name] = r.is_nullable === "YES";
    }
    expect(rowsFromTypes(typesSource)).toEqual(fromDb);
  });

  test("mismos enums y en el mismo orden", async () => {
    const { rows } = await db.query<{ name: string; labels: string[] }>(
      `select t.typname as name,
              array_agg(e.enumlabel order by e.enumsortorder) as labels
         from pg_type t
         join pg_enum e on e.enumtypid = t.oid
         join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
        group by t.typname`,
    );
    const fromDb = Object.fromEntries(rows.map((r) => [r.name, r.labels]));
    const fromTypes: Record<string, readonly string[]> = Constants.public.Enums;
    expect(fromTypes).toEqual(fromDb);
  });

  test("mismas funciones públicas", async () => {
    const { rows } = await db.query<{ name: string }>(
      `select distinct p.proname as name
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype`,
    );
    const block = typesSource.slice(
      typesSource.indexOf("    Functions: {"),
      typesSource.indexOf("    Enums: {"),
    );
    const fromTypes = [...block.matchAll(/^ {6}(\w+): \{/gm)].map((m) => m[1]);
    expect(fromTypes.sort()).toEqual(rows.map((r) => r.name).sort());
  });
});
