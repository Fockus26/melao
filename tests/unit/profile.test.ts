// Perfil: validación de la cuenta, cambio de correo (errores y vuelta del enlace), tema
// perfil ↔ navegador, suscripción y la vista. Las reglas de la suscripción viven en SQL
// (db-profile.test.ts); aquí solo su presentación.
import { describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveEmailChange } from "@/lib/auth/email-change";
import {
  EMAIL_CHANGE_NOTICES,
  emailChangeErrorCopy,
  emailChangeErrorResult,
} from "@/lib/auth/errors";
import {
  EMAIL_CHANGE_RESULTS,
  emailChangeCallbackUrl,
  emailChangeResultPath,
  isEmailChangeResult,
  safeNext,
} from "@/lib/auth/redirect";
import { EMAIL_EMPTY_ERROR, EMAIL_FORMAT_ERROR } from "@/lib/auth/validation";
import {
  checkAccount,
  initials,
  NAME_EMPTY_ERROR,
  NAME_LENGTH_ERROR,
  type ProfileAccount,
  type ProfileSubscription,
  themeToApply,
  toProfileSubscription,
} from "@/lib/profile/profile";

// Los controles usan `useRouter`: fuera del App Router, uno falso (se conserva el resto).
const navigation = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navigation,
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
}));
const { ProfileView } = await import("@/components/profile/profile-view");
type ProfileViewProps = Parameters<typeof ProfileView>[0];

const ACCOUNT: ProfileAccount = {
  name: "Laura Gómez",
  email: "laura@example.com",
  pendingEmail: null,
};

describe("checkAccount: nombre y correo", () => {
  test("sin cambios: nada que guardar", () => {
    expect(
      checkAccount(
        { name: "Laura Gómez", email: "laura@example.com" },
        ACCOUNT,
      ),
    ).toEqual({ errors: { name: null, email: null }, name: null, email: null });
  });

  test("recorta y detecta lo que cambió", () => {
    const r = checkAccount(
      { name: "  Laura G.  ", email: " laura@new.example.com " },
      ACCOUNT,
    );
    expect(r.name).toBe("Laura G.");
    expect(r.email).toBe("laura@new.example.com");
  });

  test("el mismo correo con otras mayúsculas, o el pendiente, no es un cambio", () => {
    expect(
      checkAccount({ name: "Laura Gómez", email: "LAURA@example.com" }, ACCOUNT)
        .email,
    ).toBeNull();
    expect(
      checkAccount(
        { name: "Laura Gómez", email: "nuevo@example.com" },
        { ...ACCOUNT, pendingEmail: "nuevo@example.com" },
      ).email,
    ).toBeNull();
  });

  test("nombre vacío o de más de 80 caracteres", () => {
    expect(
      checkAccount({ name: "   ", email: "a@b.co" }, ACCOUNT).errors.name,
    ).toBe(NAME_EMPTY_ERROR);
    const r = checkAccount({ name: "a".repeat(81), email: "a@b.co" }, ACCOUNT);
    expect(r.errors.name).toBe(NAME_LENGTH_ERROR);
    expect(r.name).toBeNull();
    // 80 exactos (los acentos cuentan como uno) sí.
    expect(
      checkAccount({ name: "á".repeat(80), email: "a@b.co" }, ACCOUNT).errors
        .name,
    ).toBeNull();
  });

  test("correo vacío o sin forma", () => {
    expect(checkAccount({ name: "Ana", email: "" }, ACCOUNT).errors.email).toBe(
      EMAIL_EMPTY_ERROR,
    );
    const r = checkAccount({ name: "Ana", email: "ana@" }, ACCOUNT);
    expect(r.errors.email).toBe(EMAIL_FORMAT_ERROR);
    expect(r.email).toBeNull();
  });

  test("sin nombre guardado, uno nuevo es un cambio", () => {
    expect(
      checkAccount(
        { name: "Ana", email: "laura@example.com" },
        { ...ACCOUNT, name: null },
      ).name,
    ).toBe("Ana");
  });
});

describe("initials", () => {
  test("dos primeras palabras, una, o la del correo", () => {
    expect(initials("Laura Gómez Ruiz", null)).toBe("LG");
    expect(initials("ángela", null)).toBe("Á");
    expect(initials(null, "beto@example.com")).toBe("B");
    expect(initials("  ", null)).toBe("?");
  });
});

describe("cambio de correo: errores de updateUser", () => {
  test("correo en uso: sin mandar a entrar ni a recuperar", () => {
    const copy = emailChangeErrorCopy({ code: "email_exists" });
    expect(copy.field).toBe("email");
    expect(copy.message).not.toMatch(/recupera|Entra/);
  });

  test("correo no autorizado por el SMTP por defecto", () => {
    expect(
      emailChangeErrorCopy({ code: "email_address_not_authorized" }).field,
    ).toBe("email");
  });

  test("lo demás, la tabla general (límite, red, inválido)", () => {
    expect(
      emailChangeErrorCopy({ code: "over_email_send_rate_limit" }).message,
    ).toMatch(/varios correos/);
    expect(emailChangeErrorCopy({ status: 0 }).message).toMatch(/conexión/);
    expect(emailChangeErrorCopy({ code: "email_address_invalid" }).field).toBe(
      "email",
    );
  });
});

describe("cambio de correo: vuelta del enlace (D134)", () => {
  test("la URL de vuelta lleva type=email_change y safeNext deja pasar el destino", () => {
    expect(emailChangeCallbackUrl("https://melao.app")).toBe(
      "https://melao.app/auth/callback?type=email_change",
    );
    for (const r of EMAIL_CHANGE_RESULTS) {
      expect(safeNext(emailChangeResultPath(r))).toBe(
        `/app/profile?email=${r}`,
      );
      expect(isEmailChangeResult(r)).toBe(true);
      expect(EMAIL_CHANGE_NOTICES[r].title.length).toBeGreaterThan(0);
    }
    expect(isEmailChangeResult("otro")).toBe(false);
  });

  test("motivo de error por código", () => {
    expect(emailChangeErrorResult("otp_expired")).toBe("link-expired");
    expect(emailChangeErrorResult("pkce_code_verifier_not_found")).toBe(
      "other-browser",
    );
    expect(emailChangeErrorResult(null)).toBe("access-failed");
  });

  const fakeAuth = (
    result: { user?: unknown; code?: string } = { user: { id: "u" } },
  ) => {
    const calls: string[] = [];
    const reply = {
      data: { user: result.user ?? null },
      error: result.code ? { code: result.code } : null,
    };
    return {
      calls,
      auth: async () => ({
        exchangeCodeForSession: async (code: string) => {
          calls.push(`code:${code}`);
          return reply;
        },
        verifyOtp: async (p: { token_hash: string; type: string }) => {
          calls.push(`otp:${p.token_hash}:${p.type}`);
          return reply;
        },
      }),
    };
  };
  const q = (s: string) => new URLSearchParams(s);

  test("con código (PKCE): confirmado", async () => {
    const f = fakeAuth();
    expect(
      await resolveEmailChange(q("type=email_change&code=abc"), f.auth),
    ).toBe("changed");
    expect(f.calls).toEqual(["code:abc"]);
  });

  test("primer enlace de los dos: falta el otro, sin tocar Auth", async () => {
    const f = fakeAuth();
    expect(
      await resolveEmailChange(
        q("type=email_change&message=Confirmation+link+accepted"),
        f.auth,
      ),
    ).toBe("confirm-other");
    expect(f.calls).toEqual([]);
  });

  test("con token: el primero sin usuario, el último con usuario", async () => {
    expect(
      await resolveEmailChange(
        q("type=email_change&token_hash=t1"),
        fakeAuth({ user: null }).auth,
      ),
    ).toBe("confirm-other");
    const f = fakeAuth();
    expect(await resolveEmailChange(q("token_hash=t2"), f.auth)).toBe(
      "changed",
    );
    expect(f.calls).toEqual(["otp:t2:email_change"]);
  });

  test("errores: de Supabase en la URL, del intercambio y sin nada", async () => {
    expect(
      await resolveEmailChange(
        q("type=email_change&error=access_denied&error_code=otp_expired"),
        fakeAuth().auth,
      ),
    ).toBe("link-expired");
    expect(
      await resolveEmailChange(
        q("code=abc"),
        fakeAuth({ code: "pkce_code_verifier_not_found" }).auth,
      ),
    ).toBe("other-browser");
    expect(
      await resolveEmailChange(q("type=email_change"), fakeAuth().auth),
    ).toBe("access-failed");
  });
});

describe("tema: manda el perfil al cargar (D136)", () => {
  test("si difieren, el del perfil; si coinciden o no es válido, nada", () => {
    expect(themeToApply("dark", "system")).toBe("dark");
    expect(themeToApply("system", "light")).toBe("system");
    expect(themeToApply("light", "light")).toBeNull();
    expect(themeToApply(null, "dark")).toBeNull();
    expect(themeToApply("sepia", "dark")).toBeNull();
  });
});

describe("suscripción: fila de my_subscription → card", () => {
  const row = {
    plan_name: "Básico",
    price_cents: 2000,
    currency: "USD",
    billing_interval: "month",
    state: "active",
    current_period_end: "2026-10-30T15:00:00Z",
  };

  test("con plan: precio por período", () => {
    expect(toProfileSubscription(row)).toEqual({
      planName: "Básico",
      price: "US$20 / mes",
      state: "active",
      currentPeriodEnd: "2026-10-30T15:00:00Z",
    });
  });

  test("plan ilegible: sin nombre ni precio; estado desconocido = vencido; sin fila = null", () => {
    expect(
      toProfileSubscription({
        ...row,
        plan_name: null,
        price_cents: null,
        currency: null,
        billing_interval: null,
        state: "raro",
      }),
    ).toMatchObject({ planName: null, price: null, state: "expired" });
    expect(toProfileSubscription(undefined)).toBeNull();
  });
});

describe("ProfileView", () => {
  const STYLES = ["Salsa casino", "Merengue", "Rueda de casino"].map(
    (name, i) => ({
      id: `s${i}`,
      name,
      hasRoles: true,
      chosen: true,
      hasCourse: true,
      lessonCount: 6,
      completedCount: 0,
    }),
  );
  const ACTIVE: ProfileSubscription = {
    planName: "Básico",
    price: "US$20 / mes",
    state: "active",
    currentPeriodEnd: "2026-10-30T15:00:00Z",
  };
  const base: ProfileViewProps = {
    account: ACCOUNT,
    role: "leader",
    styles: STYLES.slice(0, 2),
    currentStyle: STYLES[0],
    coach: { volume: 80, spokenCount: true },
    latency: { offsetMs: 124, measuredAt: "2026-09-28T21:30:00Z" },
    theme: "dark",
    subscription: ACTIVE,
    mode: "sample",
  };
  const render = (p: Partial<ProfileViewProps> = {}) =>
    renderToStaticMarkup(createElement(ProfileView, { ...base, ...p }));

  test("cuenta, editar con nombre accesible, progreso, calibrar y cerrar sesión", () => {
    const html = render();
    expect(html).toContain('aria-label="Editar nombre y correo"');
    expect(html).toContain('title="laura@example.com"');
    expect(html).toContain(">LG<");
    expect(html).toContain('href="/app/progress"');
    expect(html).toContain('href="/app/profile/calibration"');
    expect(html).toContain("124 ms");
    expect(html).toContain('action="/auth/logout"');
    expect(html).toContain("Cerrar sesión");
  });

  test("suscripción activa: pill con texto y sin Activa tu plan", () => {
    const html = render();
    expect(html).toContain("Activo");
    expect(html).toContain("Se renueva el");
    expect(html).not.toContain("Activa tu plan");
  });

  test("sin suscripción o vencida: Activa tu plan → /plans", () => {
    for (const subscription of [
      null,
      { ...ACTIVE, state: "expired" as const },
    ]) {
      const html = render({ subscription });
      expect(html).toContain("Activa tu plan");
      expect(html).toContain('href="/plans"');
    }
    expect(render({ subscription: null })).toContain("Sin plan activo");
    expect(render({ subscription: { ...ACTIVE, state: "expired" } })).toContain(
      "Vencido",
    );
  });

  test("sin calibrar", () => {
    expect(render({ latency: null })).toContain("Sin calibrar");
  });

  test("estilos: segmentado con 2, fila con Sheet con 3+, nada sin estilos", () => {
    const two = render();
    expect(two).toContain("Estilo con el que abre la app");
    // Rol (2) + estilo (2) + tema (3).
    expect(two.match(/role="radio"/g)?.length).toBe(7);
    const three = render({ styles: STYLES });
    expect(three).toContain("Cambiar el estilo con el que abre la app");
    expect(three.match(/role="radio"/g)?.length).toBe(5);
    expect(render({ styles: [], currentStyle: null })).not.toContain(
      "Estilo con el que abre la app",
    );
  });

  test("tema: el del perfil marcado, con la nota del escenario", () => {
    const html = render();
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Oscuro/);
    expect(html).toContain("La práctica siempre va en negro");
  });

  test("correo pendiente y aviso del enlace", () => {
    expect(
      render({ account: { ...ACCOUNT, pendingEmail: "nuevo@example.com" } }),
    ).toContain("Cambio pendiente a nuevo@example.com");
    const html = render({ notice: "changed" });
    expect(html).toContain("Correo actualizado");
    expect(render({ notice: "link-expired" })).toContain('role="alert"');
  });
});
