import { describe, expect, test } from "bun:test";
import {
  ACTIVATION_COPY,
  activationOutcome,
  checkoutConditions,
} from "@/lib/plans/activation";
import {
  checkoutPath,
  PLAN_FEATURES,
  PLAN_SLUG_RE,
  planFeatures,
} from "@/lib/plans/features";
import {
  billingInterval,
  formatPrice,
  formatPricePer,
  INTERVAL_COPY,
} from "@/lib/plans/format";

describe("formatPrice (D084)", () => {
  test("USD entero, sin decimales y con US$ pegado", () => {
    expect(formatPrice(2000)).toBe("US$20");
    expect(formatPrice(4000, "USD")).toBe("US$40");
  });

  test("precio 0 (Total hoy)", () => {
    expect(formatPrice(0)).toBe("US$0");
  });

  test("con centavos, dos decimales; miles con coma (es-419)", () => {
    expect(formatPrice(1999)).toBe("US$19.99");
    expect(formatPrice(123450)).toBe("US$1,234.50");
  });

  test("la moneda se normaliza a mayúsculas", () => {
    expect(formatPrice(2000, "usd")).toBe("US$20");
  });

  test("otra moneda conserva el formato de Intl", () => {
    expect(formatPrice(2000, "EUR")).toContain("20");
    expect(formatPrice(2000, "EUR")).not.toContain("US$");
  });

  test("precio por período", () => {
    expect(formatPricePer(2000, "USD", "month")).toBe("US$20 / mes");
    expect(formatPricePer(20000, "USD", "year")).toBe("US$200 / año");
  });
});

describe("períodos", () => {
  test("month / year; lo desconocido cae en mensual", () => {
    expect(billingInterval("month")).toBe("month");
    expect(billingInterval("year")).toBe("year");
    expect(billingInterval("week")).toBe("month");
  });

  test("copy de cada período", () => {
    expect(INTERVAL_COPY.month.per).toBe("al mes");
    expect(INTERVAL_COPY.year.per).toBe("al año");
    expect(checkoutConditions("month")[0]).toBe("Renovación mensual");
    expect(checkoutConditions("year")[0]).toBe("Renovación anual");
    expect(checkoutConditions("year")).toHaveLength(2);
  });
});

describe("planFeatures", () => {
  test("5 filas; sin profesor, las 2 de consultoría no van incluidas", () => {
    const rows = planFeatures(false);
    expect(rows).toHaveLength(PLAN_FEATURES.length);
    expect(rows.map((r) => r.included)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  test("con profesor, todo incluido", () => {
    expect(planFeatures(true).every((r) => r.included)).toBe(true);
  });
});

describe("rutas", () => {
  test("checkoutPath codifica el slug", () => {
    expect(checkoutPath("basico")).toBe("/checkout?plan=basico");
    expect(checkoutPath("a&b")).toBe("/checkout?plan=a%26b");
  });

  test("slug con la forma de activate-subscription", () => {
    expect(PLAN_SLUG_RE.test("consultoria")).toBe(true);
    expect(PLAN_SLUG_RE.test("")).toBe(false);
    expect(PLAN_SLUG_RE.test("Basico")).toBe(false);
    expect(PLAN_SLUG_RE.test("//evil")).toBe(false);
  });
});

describe("activationOutcome (api.md › activate-subscription)", () => {
  const ok = {
    subscription: {
      plan: "basico",
      status: "active",
      currentPeriodEnd: "2026-10-29T00:00:00Z",
      priceCents: 2000,
      currency: "USD",
      billingInterval: "month",
    },
  };

  test("200 con suscripción activa → activo", () => {
    expect(activationOutcome({ status: 200, body: ok })).toEqual({
      kind: "active",
      subscription: {
        plan: "basico",
        currentPeriodEnd: "2026-10-29T00:00:00Z",
      },
    });
  });

  test("200 con cuerpo raro o estado no activo → error", () => {
    expect(activationOutcome({ status: 200, body: null })).toEqual({
      kind: "error",
      offline: false,
    });
    expect(
      activationOutcome({
        status: 200,
        body: { subscription: { ...ok.subscription, status: "expired" } },
      }).kind,
    ).toBe("error");
  });

  test("409 subscription_exists → otro plan vigente (D049)", () => {
    expect(
      activationOutcome({
        status: 409,
        body: { error: { code: "subscription_exists", message: "…" } },
      }),
    ).toEqual({ kind: "conflict" });
  });

  test("409 con otro código → error genérico", () => {
    expect(
      activationOutcome({
        status: 409,
        body: { error: { code: "no_plan", message: "…" } },
      }).kind,
    ).toBe("error");
  });

  test("401 → sesión vencida", () => {
    expect(
      activationOutcome({
        status: 401,
        body: { error: { code: "unauthorized", message: "…" } },
      }),
    ).toEqual({ kind: "unauthorized" });
  });

  test("404 plan_not_found → plan no disponible", () => {
    expect(
      activationOutcome({
        status: 404,
        body: { error: { code: "plan_not_found", message: "…" } },
      }),
    ).toEqual({ kind: "plan-unavailable" });
  });

  test("500, 400 o sin cuerpo → error con reintento", () => {
    for (const status of [400, 500, 502])
      expect(activationOutcome({ status, body: null })).toEqual({
        kind: "error",
        offline: false,
      });
  });

  test("status 0 → sin conexión", () => {
    expect(activationOutcome({ status: 0, body: null })).toEqual({
      kind: "error",
      offline: true,
    });
  });

  test("todo estado de fallo tiene copy con título, cuerpo y acción", () => {
    for (const copy of Object.values(ACTIVATION_COPY)) {
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.action.length).toBeGreaterThan(0);
    }
  });
});
