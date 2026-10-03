// Admin · Usuarios (lib/admin/users.ts): filtros de la URL, páginas y mapeo de filas (D156–D157).
import { describe, expect, test } from "bun:test";
import {
  EMPTY_COUNTS,
  filteredTotal,
  hasActiveUserFilters,
  pageCount,
  pageOffset,
  pageRange,
  parseUserFilters,
  shortDate,
  toAdminUser,
  toUserStateCounts,
  USER_STATE_PILLS,
  userCountLabel,
  usersSearch,
} from "@/lib/admin/users";

describe("filtros en la URL", () => {
  test("lee q, state y page; lo que no entiende lo ignora", () => {
    expect(
      parseUserFilters({ q: "ana", state: "past_due", page: "3" }),
    ).toEqual({
      q: "ana",
      state: "past_due",
      page: 3,
    });
    expect(parseUserFilters({ state: "activo", page: "-2" })).toEqual({
      q: "",
      state: null,
      page: 1,
    });
    expect(parseUserFilters({ page: "abc", q: ["uno", "dos"] })).toEqual({
      q: "uno",
      state: null,
      page: 1,
    });
    expect(parseUserFilters({ q: "x".repeat(300) }).q).toHaveLength(120);
  });

  test("escribe solo lo que no es por defecto, y vuelve a leerse igual", () => {
    expect(usersSearch({ q: "", state: null, page: 1 })).toBe("");
    const search = usersSearch({ q: " Núñez ", state: "none", page: 2 });
    expect(search).toBe("?q=N%C3%BA%C3%B1ez&state=none&page=2");
    expect(
      parseUserFilters(Object.fromEntries(new URLSearchParams(search))),
    ).toEqual({ q: "Núñez", state: "none", page: 2 });
  });

  test("filtros activos", () => {
    expect(hasActiveUserFilters({ q: "  ", state: null, page: 4 })).toBe(false);
    expect(hasActiveUserFilters({ q: "", state: "expired", page: 1 })).toBe(
      true,
    );
  });
});

describe("páginas", () => {
  test("25 por página, al menos una", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
    expect(pageOffset(1)).toBe(0);
    expect(pageOffset(3)).toBe(50);
    expect(pageRange(2, 25)).toBe("26–50");
    expect(pageRange(3, 10)).toBe("51–60");
    expect(pageRange(1, 0)).toBe("");
  });

  test("el total es el del chip elegido", () => {
    const counts = { ...EMPTY_COUNTS, all: 60, past_due: 8 };
    expect(filteredTotal(counts, null)).toBe(60);
    expect(filteredTotal(counts, "past_due")).toBe(8);
  });
});

describe("filas", () => {
  test("admin_users → AdminUser; estado desconocido = sin plan", () => {
    const row = {
      user_id: "u1",
      display_name: null,
      email: "ana@example.com",
      app_role: "teacher" as const,
      dance_role: null,
      created_at: "2026-09-01T00:00:00Z",
      last_sign_in_at: null,
      plan_name: null,
      state: "raro",
      current_period_end: null,
      total_count: 1,
    };
    expect(toAdminUser(row)).toEqual({
      id: "u1",
      name: null,
      email: "ana@example.com",
      appRole: "teacher",
      danceRole: null,
      createdAt: "2026-09-01T00:00:00Z",
      lastSignInAt: null,
      planName: null,
      state: "none",
      currentPeriodEnd: null,
    });
    expect(toAdminUser({ ...row, state: "past_due" }).state).toBe("past_due");
  });

  test("contadores; sin fila, ceros", () => {
    expect(toUserStateCounts(undefined)).toEqual(EMPTY_COUNTS);
    expect(
      toUserStateCounts({
        all_count: 6,
        active_count: 1,
        past_due_count: 1,
        canceled_count: 1,
        expired_count: 1,
        none_count: 2,
      }),
    ).toEqual({
      all: 6,
      active: 1,
      past_due: 1,
      canceled: 1,
      expired: 1,
      none: 2,
    });
  });
});

describe("textos", () => {
  test("cada estado tiene pill con texto", () => {
    expect(USER_STATE_PILLS.none.label).toBe("Sin plan");
    expect(USER_STATE_PILLS.past_due).toEqual({
      label: "Pago pendiente",
      variant: "warning",
    });
  });

  test("contador y fecha corta", () => {
    expect(userCountLabel(1)).toBe("1 usuario");
    expect(userCountLabel(0)).toBe("0 usuarios");
    expect(shortDate("2026-10-30T12:00:00Z", "UTC")).toMatch(/30.*oct.*2026/);
  });
});
