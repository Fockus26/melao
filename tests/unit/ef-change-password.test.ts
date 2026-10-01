// change-password con puertos falsos (D106–D108): auth, entrada, regla D075, historial y que
// la contraseña solo llegue a los puertos. Más los vectores de la regla, que cumplen el core y
// la UI (`lib/auth/validation.ts`) por igual.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { changePasswordErrorCopy } from "@/lib/auth/change-password";
import { checkPassword } from "@/lib/auth/validation";
import type { AuthPort } from "../../supabase/functions/_shared/auth";
import {
  failedPasswordRules,
  isValidPassword,
} from "../../supabase/functions/_shared/core/password";
import {
  type ChangePasswordPort,
  createHandler,
  weakPassword,
} from "../../supabase/functions/change-password/handler";

const USER = "11111111-1111-4111-8111-111111111111";

const auth: AuthPort = {
  userIdFromJwt: async (jwt) => (jwt === "valido" ? USER : null),
};

function post(body: unknown, token: string | null = "valido") {
  return new Request("http://x/", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
}

async function read(res: Response) {
  // biome-ignore lint/suspicious/noExplicitAny: respuesta JSON de prueba
  return { status: res.status, body: (await res.json()) as any };
}

/** Puerto falso: "últimas 3" = las que haya en `recent`; cambiar empuja la nueva. */
function fakePort(recent: string[]) {
  const updates: [string, string][] = [];
  const port: ChangePasswordPort = {
    async recentlyUsed(userId, password) {
      expect(userId).toBe(USER);
      return recent.slice(-3).includes(password);
    },
    async updatePassword(userId, password) {
      updates.push([userId, password]);
      recent.push(password);
    },
  };
  return { port, updates };
}

describe("change-password", () => {
  test("sin sesión → 401 y no toca datos", async () => {
    const { port, updates } = fakePort([]);
    const handler = createHandler({ auth, data: port });
    for (const token of [null, "otro"]) {
      const res = await read(
        await handler(post({ password: "Nueva#2026" }, token)),
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("unauthorized");
    }
    expect(updates).toHaveLength(0);
  });

  test("entrada inválida → 400 invalid_input", async () => {
    const { port, updates } = fakePort([]);
    const handler = createHandler({ auth, data: port });
    const largo = `Aa1!${"a".repeat(69)}`; // 73 bytes
    for (const body of [
      {},
      { password: 3 },
      { password: "" },
      [],
      { password: largo },
    ]) {
      const res = await read(await handler(post(body)));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("invalid_input");
    }
    expect(updates).toHaveLength(0);
  });

  test("no cumple D075 → 422 weak_password, sin mirar el historial", async () => {
    let checked = false;
    const handler = createHandler({
      auth,
      data: {
        async recentlyUsed() {
          checked = true;
          return false;
        },
        async updatePassword() {
          throw new Error("no debería cambiar");
        },
      },
    });
    const res = await read(await handler(post({ password: "debil123" })));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("weak_password");
    expect(checked).toBe(false);
  });

  test("repite una de las últimas 3 → 422 password_reused; la 4.ª vuelve a valer", async () => {
    const recent = ["Primera#1", "Segunda#2", "Tercera#3"];
    const { port, updates } = fakePort(recent);
    const handler = createHandler({ auth, data: port });

    for (const password of recent) {
      const res = await read(await handler(post({ password })));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("password_reused");
    }
    expect(updates).toHaveLength(0);

    const ok = await read(await handler(post({ password: "Cuarta#44" })));
    expect(ok).toEqual({ status: 200, body: { ok: true } });
    expect(updates).toEqual([[USER, "Cuarta#44"]]);

    const vuelve = await read(await handler(post({ password: "Primera#1" })));
    expect(vuelve.status).toBe(200);
  });

  test("el alumno sale del JWT, no del cuerpo", async () => {
    const { port, updates } = fakePort([]);
    const handler = createHandler({ auth, data: port });
    await handler(post({ password: "Nueva#2026", userId: "otro" }));
    expect(updates).toEqual([[USER, "Nueva#2026"]]);
  });

  test("Auth rechaza (weak_password) → 422; otro fallo → 500 sin la contraseña", async () => {
    const logs: unknown[] = [];
    const weak = createHandler({
      auth,
      data: {
        recentlyUsed: async () => false,
        updatePassword: async () => {
          throw weakPassword();
        },
      },
    });
    const res = await read(await weak(post({ password: "Nueva#2026" })));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("weak_password");

    // jsonEndpoint toma console.error al crearse: se sustituye antes.
    const original = console.error;
    console.error = (...args: unknown[]) => logs.push(args);
    const broken = createHandler({
      auth,
      data: {
        recentlyUsed: async () => false,
        updatePassword: async () => {
          throw new Error("auth.admin.updateUserById: 500 ?");
        },
      },
    });
    try {
      const fail = await read(await broken(post({ password: "Nueva#2026" })));
      expect(fail.status).toBe(500);
      expect(fail.body.error.code).toBe("internal");
      expect(JSON.stringify(fail.body)).not.toContain("Nueva#2026");
    } finally {
      console.error = original;
    }
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs.map(String))).not.toContain("Nueva#2026");
  });
});

describe("vectores password-reglas", () => {
  const vector = JSON.parse(
    readFileSync(
      join(import.meta.dir, "../../docs/spec/vectors/password-reglas.json"),
      "utf8",
    ),
  ) as { entrada: { casos: string[] }; salida: { fallan: string[][] } };

  vector.entrada.casos.forEach((password, i) => {
    const want = vector.salida.fallan[i];
    test(`${JSON.stringify(password)} → ${want.join(", ") || "válida"}`, () => {
      expect(failedPasswordRules(password)).toEqual(want as never);
      expect(isValidPassword(password)).toBe(want.length === 0);
      // La UI refleja la misma regla (lib/auth/validation.ts).
      const ui = checkPassword(password);
      expect(ui.rules.filter((r) => !r.met).map((r) => r.id)).toEqual(
        want as never,
      );
      expect(ui.valid).toBe(want.length === 0);
    });
  });
});

describe("changePasswordErrorCopy (cliente)", () => {
  const body = (code: string) => ({ error: { code, message: "x" } });

  test("password_reused y weak_password marcan el campo", () => {
    const reused = changePasswordErrorCopy(422, body("password_reused"));
    expect(reused.field).toBe("password");
    expect(reused.message).toContain("últimas tres");
    expect(changePasswordErrorCopy(422, body("weak_password")).field).toBe(
      "password",
    );
  });

  test("sin sesión, sin conexión y genérico", () => {
    expect(changePasswordErrorCopy(401, body("unauthorized")).message).toMatch(
      /sesión terminó/,
    );
    expect(changePasswordErrorCopy(0, null).message).toMatch(/conexión/);
    expect(changePasswordErrorCopy(500, body("internal")).message).toMatch(
      /de nuestro lado/,
    );
    expect(changePasswordErrorCopy(502, "html").field).toBeNull();
  });
});
