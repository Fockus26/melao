import { beforeAll, describe, expect, test } from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import {
  asAnon,
  asService,
  asUser,
  createDb,
  createUser,
  DB_BOOT_TIMEOUT_MS,
} from "../db/harness";

let db: PGlite;
let ana: string; // alumna sin suscripción
let beto: string; // alumno con suscripción activa
let cesar: string; // admin

beforeAll(async () => {
  db = await createDb();
  ana = await createUser(db, "ana@example.com", { full_name: "Ana" });
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

describe("profiles", () => {
  test("el trigger crea el perfil al registrarse, con el nombre de Auth", async () => {
    const { rows } = await db.query<{
      display_name: string | null;
      app_role: string;
      theme: string;
    }>(
      "select display_name, app_role, theme from public.profiles where id = $1",
      [ana],
    );
    expect(rows).toEqual([
      { display_name: "Ana", app_role: "student", theme: "system" },
    ]);
  });

  test("un alumno solo ve su propio perfil", async () => {
    const rows = await asUser(
      db,
      ana,
      async (tx) => (await tx.query("select id from public.profiles")).rows,
    );
    expect(rows).toEqual([{ id: ana }]);
  });

  test("un admin ve todos los perfiles", async () => {
    const n = await asUser(
      db,
      cesar,
      async (tx) =>
        (await tx.query("select id from public.profiles")).rows.length,
    );
    expect(n).toBe(3);
  });

  test("anon no lee perfiles", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select id from public.profiles")),
    ).rejects.toThrow(/permission denied/);
  });

  test("el alumno edita sus preferencias", async () => {
    const theme = await asUser(db, ana, async (tx) => {
      await tx.query(
        "update public.profiles set theme = 'dark', dance_role = 'follower' where id = $1",
        [ana],
      );
      return (
        await tx.query<{ theme: string }>(
          "select theme from public.profiles where id = $1",
          [ana],
        )
      ).rows[0].theme;
    });
    expect(theme).toBe("dark");
  });

  test("el alumno no puede hacerse admin", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "update public.profiles set app_role = 'admin' where id = $1",
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("el alumno no edita el perfil de otro (RLS lo filtra)", async () => {
    const changed = await asUser(db, ana, async (tx) => {
      const r = await tx.query(
        "update public.profiles set theme = 'dark' where id = $1",
        [beto],
      );
      return r.affectedRows;
    });
    expect(changed).toBe(0);
  });

  test("set_app_role: solo un admin cambia roles", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query("select public.set_app_role($1, 'admin')", [ana]),
      ),
    ).rejects.toThrow(/solo un admin/);
    const role = await asUser(db, cesar, async (tx) => {
      await tx.query("select public.set_app_role($1, 'teacher')", [ana]);
      return (
        await tx.query<{ app_role: string }>(
          "select app_role from public.profiles where id = $1",
          [ana],
        )
      ).rows[0].app_role;
    });
    expect(role).toBe("teacher");
  });

  test("valida rangos: volumen 0–100", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "update public.profiles set coach_voice_volume = 150 where id = $1",
          [ana],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("audio_latency", () => {
  test("el dueño guarda y lee su calibración; otro alumno no la ve", async () => {
    await asUser(db, ana, async (tx) => {
      await tx.query(
        `insert into public.audio_latency (user_id, platform, device_key, offset_ms, sd_ms, taps)
         values ($1, 'android', 'bluetooth:Buds', 336, 48, 16)`,
        [ana],
      );
      expect(
        (await tx.query("select offset_ms from public.audio_latency")).rows,
      ).toEqual([{ offset_ms: 336 }]);
    });
    await db.query(
      "insert into public.audio_latency (user_id, platform, device_key, offset_ms) values ($1, 'web', 'speaker', 48)",
      [beto],
    );
    const seen = await asUser(
      db,
      ana,
      async (tx) =>
        (await tx.query("select id from public.audio_latency")).rows,
    );
    expect(seen).toEqual([]);
  });

  test("no se crea calibración a nombre de otro", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          "insert into public.audio_latency (user_id, platform, device_key, offset_ms) values ($1, 'web', 'x', 10)",
          [beto],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("plans", () => {
  test("anon ve los planes activos con los precios de D029", async () => {
    const rows = await asAnon(
      db,
      async (tx) =>
        (
          await tx.query(
            "select slug, price_cents, currency from public.plans order by sort_order",
          )
        ).rows,
    );
    expect(rows).toEqual([
      { slug: "basico", price_cents: 2000, currency: "USD" },
      { slug: "consultoria", price_cents: 4000, currency: "USD" },
    ]);
  });

  test("un alumno no cambia precios; un admin sí", async () => {
    const byStudent = await asUser(db, ana, async (tx) => {
      const r = await tx.query(
        "update public.plans set price_cents = 1 where slug = 'basico'",
      );
      return r.affectedRows;
    });
    expect(byStudent).toBe(0);
    const byAdmin = await asUser(db, cesar, async (tx) => {
      const r = await tx.query(
        "update public.plans set price_cents = 2500 where slug = 'basico'",
      );
      return r.affectedRows;
    });
    expect(byAdmin).toBe(1);
  });

  test("anon no escribe planes", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("update public.plans set price_cents = 0")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("subscriptions", () => {
  test("el alumno ve solo la suya", async () => {
    const mine = await asUser(
      db,
      beto,
      async (tx) =>
        (await tx.query("select user_id from public.subscriptions")).rows,
    );
    expect(mine).toEqual([{ user_id: beto }]);
    const others = await asUser(
      db,
      ana,
      async (tx) =>
        (await tx.query("select id from public.subscriptions")).rows,
    );
    expect(others).toEqual([]);
  });

  test("el cliente no puede crearse ni alargarse la suscripción (D015)", async () => {
    await expect(
      asUser(db, ana, (tx) =>
        tx.query(
          `insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
           select $1, id, 'active', 'placeholder', now() + interval '1 year' from public.plans limit 1`,
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, beto, (tx) =>
        tx.query(
          "update public.subscriptions set current_period_end = now() + interval '10 years'",
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  test("service_role (Edge Functions) sí escribe", async () => {
    const n = await asService(db, async (tx) => {
      const r = await tx.query(
        `insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
         select $1, id, 'active', 'placeholder', now() + interval '30 days' from public.plans where slug = 'basico'`,
        [ana],
      );
      return r.affectedRows;
    });
    expect(n).toBe(1);
  });

  test("una sola suscripción vigente por alumno", async () => {
    await expect(
      db.query(
        `insert into public.subscriptions (user_id, plan_id, status, provider, current_period_end)
         select $1, id, 'active', 'placeholder', now() + interval '30 days' from public.plans where slug = 'consultoria'`,
        [beto],
      ),
    ).rejects.toThrow(/subscriptions_one_active_per_user/);
  });

  test("has_active_subscription: activa y no vencida", async () => {
    const check = (uid: string) =>
      asUser(
        db,
        uid,
        async (tx) =>
          (
            await tx.query<{ ok: boolean }>(
              "select public.has_active_subscription() as ok",
            )
          ).rows[0].ok,
      );
    expect(await check(beto)).toBe(true);
    expect(await check(ana)).toBe(false);
    await db.query(
      "update public.subscriptions set current_period_start = now() - interval '60 days', current_period_end = now() - interval '1 day' where user_id = $1",
      [beto],
    );
    expect(await check(beto)).toBe(false);
  });

  test("anon no llama has_active_subscription", async () => {
    await expect(
      asAnon(db, (tx) => tx.query("select public.has_active_subscription()")),
    ).rejects.toThrow(/permission denied/);
  });
});
