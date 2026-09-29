// Base compartida de las Edge Functions: HTTP, auth, errores de SQL y cliente.
import { describe, expect, test } from "bun:test";
import {
  bearerToken,
  requireUserId,
} from "../../supabase/functions/_shared/auth";
import { serviceKey } from "../../supabase/functions/_shared/client";
import { HttpError, jsonEndpoint } from "../../supabase/functions/_shared/http";
import { fromDbError } from "../../supabase/functions/_shared/sql-errors";

const echo = jsonEndpoint(
  async ({ body }) => ({ got: body }),
  () => {},
);

describe("jsonEndpoint", () => {
  test("preflight OPTIONS → 204 con CORS", async () => {
    const res = await echo(new Request("http://x/", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "authorization",
    );
  });

  test("POST con JSON → 200 JSON con CORS", async () => {
    const res = await echo(
      new Request("http://x/", { method: "POST", body: '{"a":1}' }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.json()).toEqual({ got: { a: 1 } });
  });

  test("otro método → 405; cuerpo no JSON → 400 invalid_json", async () => {
    const get = await echo(new Request("http://x/"));
    expect(get.status).toBe(405);
    expect((await get.json()).error.code).toBe("method_not_allowed");
    const bad = await echo(
      new Request("http://x/", { method: "POST", body: "{" }),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({
      error: { code: "invalid_json", message: expect.any(String) },
    });
  });

  test("HttpError sale tal cual; cualquier otro error, 500 sin detalles", async () => {
    const rule = jsonEndpoint(async () => {
      throw new HttpError(409, "conflicto", "Ya existe.");
    });
    const res = await rule(
      new Request("http://x/", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "conflicto", message: "Ya existe." },
    });

    const logged: unknown[] = [];
    const boom = jsonEndpoint(
      async () => {
        throw new Error("secreto interno");
      },
      (_m, e) => logged.push(e),
    );
    const crash = await boom(
      new Request("http://x/", { method: "POST", body: "{}" }),
    );
    expect(crash.status).toBe(500);
    const text = await crash.text();
    expect(text).not.toContain("secreto");
    expect(JSON.parse(text).error.code).toBe("internal");
    expect(logged).toHaveLength(1);
  });
});

describe("auth", () => {
  const req = (authorization?: string) =>
    new Request("http://x/", {
      method: "POST",
      headers: authorization ? { Authorization: authorization } : {},
    });

  test("sin Authorization o sin Bearer → 401", () => {
    for (const header of [undefined, "Basic abc", "Bearer", "Bearer a b"]) {
      expect(() => bearerToken(req(header))).toThrow(HttpError);
    }
    expect(bearerToken(req("Bearer abc.def"))).toBe("abc.def");
  });

  test("token que Auth no reconoce → 401 unauthorized", async () => {
    const auth = { userIdFromJwt: async () => null };
    const error = await requireUserId(req("Bearer x"), auth).catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 401, code: "unauthorized" });
  });
});

describe("fromDbError", () => {
  test("códigos de regla → su estado HTTP", () => {
    const cases: [string, number][] = [
      ["no_active_subscription", 403],
      ["session_not_found", 404],
      ["subscription_exists", 409],
      ["session_lesson_mismatch", 400],
    ];
    for (const [message, status] of cases) {
      expect(fromDbError({ code: "P0001", message })).toMatchObject({
        status,
        code: message,
      });
    }
  });

  test("otro error de base de datos → Error normal (500)", () => {
    const error = fromDbError({ code: "23505", message: "duplicate key" });
    expect(error).not.toBeInstanceOf(HttpError);
    expect(
      fromDbError({ code: "23505", message: "session_not_found" }),
    ).not.toBeInstanceOf(HttpError);
  });
});

describe("serviceKey", () => {
  const env = (vars: Record<string, string>) => (name: string) => vars[name];

  test("prefiere SUPABASE_SECRET_KEYS.default y cae a la clave heredada", () => {
    expect(
      serviceKey(
        env({
          SUPABASE_SECRET_KEYS: '{"default":"sb_secret_nueva"}',
          SUPABASE_SERVICE_ROLE_KEY: "heredada",
        }),
      ),
    ).toBe("sb_secret_nueva");
    expect(
      serviceKey(
        env({
          SUPABASE_SECRET_KEYS: "{",
          SUPABASE_SERVICE_ROLE_KEY: "heredada",
        }),
      ),
    ).toBe("heredada");
    expect(serviceKey(env({}))).toBeUndefined();
  });
});
