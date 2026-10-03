/**
 * Marca de fin de la práctica (`practice_sessions.completed_at`, D146–D147): cuándo se pone
 * (al acabar la canción, o Terminar / Continuar tras haber sonado), una sola vez, con un
 * reintento sin bloquear; y la actualización idempotente con un cliente falso (la de verdad, con
 * RLS y el `check`, la prueba `db-progreso.test.ts`).
 */

import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSessionCompletion,
  markSessionCompleted,
} from "@/lib/stage/completion";
import type { Database } from "@/supabase/functions/_shared/database.types";

const flush = () => new Promise((r) => setTimeout(r, 0));

function counter(fails = 0) {
  const calls: string[] = [];
  let left = fails;
  const mark = (id: string) => {
    calls.push(id);
    if (left > 0) {
      left--;
      return Promise.reject(new Error("sin conexión"));
    }
    return Promise.resolve();
  };
  return { calls, mark };
}

describe("cuándo cuenta como terminada (D146)", () => {
  test("Terminar sin haber sonado no marca", async () => {
    const c = counter();
    const t = createSessionCompletion("s1", c.mark);
    t.observe("preparing");
    t.observe("blocked");
    t.finish();
    await flush();
    expect(c.calls).toEqual([]);
  });

  test("Terminar tras haber sonado (aunque esté en pausa) marca", async () => {
    const c = counter();
    const t = createSessionCompletion("s1", c.mark);
    t.observe("blocked");
    t.observe("playing");
    t.observe("paused");
    t.finish();
    await flush();
    expect(c.calls).toEqual(["s1"]);
  });

  test("al acabar la canción marca sola, y Terminar después no repite", async () => {
    const c = counter();
    const t = createSessionCompletion("s1", c.mark);
    t.observe("playing");
    t.observe("ended");
    t.observe("playing");
    t.observe("ended");
    t.finish();
    await flush();
    expect(c.calls).toEqual(["s1"]);
  });

  test("si falla, reintenta una vez y no lanza", async () => {
    const once = counter(1);
    const a = createSessionCompletion("s1", once.mark);
    a.observe("playing");
    a.finish();
    await flush();
    expect(once.calls).toEqual(["s1", "s1"]);

    const twice = counter(5);
    const b = createSessionCompletion("s2", twice.mark);
    b.observe("ended");
    await flush();
    expect(twice.calls).toEqual(["s2", "s2"]);
  });

  test("sin escritura (muestra): nada", () => {
    const t = createSessionCompletion("s1", null);
    t.observe("playing");
    t.observe("ended");
    t.finish();
  });
});

// --- Cliente falso: registra la cadena de cada consulta ---------------------------------------

type Call = [method: string, ...args: unknown[]];

function fakeClient(responses: { error: unknown; data?: unknown }[]) {
  const queries: Call[][] = [];
  const from = (table: string) => {
    const chain: Call[] = [["from", table]];
    queries.push(chain);
    const step = (call: Call) => {
      chain.push(call);
      return builder;
    };
    const builder = {
      update: (v: unknown) => step(["update", v]),
      select: (v: unknown) => step(["select", v]),
      eq: (c: string, v: unknown) => step(["eq", c, v]),
      is: (c: string, v: unknown) => step(["is", c, v]),
      maybeSingle: () => builder,
      // biome-ignore lint/suspicious/noThenProperty: el builder de supabase-js es thenable.
      then: (ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) =>
        Promise.resolve(responses.shift() ?? { error: null, data: null }).then(
          ok,
          ko,
        ),
    };
    return builder;
  };
  return {
    client: { from } as unknown as SupabaseClient<Database>,
    queries,
  };
}

const NOW = new Date("2026-10-02T15:00:00.000Z");

describe("markSessionCompleted (D147)", () => {
  test("una actualización idempotente: solo si aún no tiene marca", async () => {
    const f = fakeClient([{ error: null }]);
    await markSessionCompleted(f.client, "s1", () => NOW);
    expect(f.queries).toEqual([
      [
        ["from", "practice_sessions"],
        ["update", { completed_at: NOW.toISOString() }],
        ["eq", "id", "s1"],
        ["is", "completed_at", null],
      ],
    ]);
  });

  test("reloj del dispositivo atrasado (check): usa created_at", async () => {
    const created = "2026-10-02T15:05:00.000Z";
    const f = fakeClient([
      { error: { code: "23514", message: "check" } },
      { error: null, data: { created_at: created } },
      { error: null },
    ]);
    await markSessionCompleted(f.client, "s1", () => NOW);
    expect(f.queries).toHaveLength(3);
    expect(f.queries[1]).toContainEqual(["select", "created_at"]);
    expect(f.queries[2]).toContainEqual(["update", { completed_at: created }]);
    expect(f.queries[2]).toContainEqual(["is", "completed_at", null]);
  });

  test("otro error: rechaza (la llamada reintenta)", async () => {
    const f = fakeClient([{ error: { code: "08006", message: "red" } }]);
    await expect(
      markSessionCompleted(f.client, "s1", () => NOW),
    ).rejects.toThrow("red");
  });
});
