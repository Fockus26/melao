// Resumen del admin (lib/admin/summary.ts, D154): el jsonb de admin_summary() a camelCase,
// los enlaces al editor de pasos y el texto de cada motivo.
import { describe, expect, test } from "bun:test";
import { formatDay, summaryCopy } from "@/components/admin/summary/copy";
import {
  ADMIN_SUMMARY_LINKS,
  itemHref,
  toAdminSummary,
} from "@/lib/admin/summary";

const RAW = {
  styles: [
    {
      id: "a1",
      slug: "salsa-casino",
      name: "Salsa casino",
      published: true,
      steps_published: 16,
      steps_total: 18,
      songs_published: 2,
      songs_total: 3,
      lessons_published: 6,
      lessons_total: 6,
    },
  ],
  totals: {
    steps_published: 16,
    steps_total: 18,
    songs_published: 2,
    songs_total: 4,
    lessons_published: 6,
    lessons_total: 6,
    students: 10,
    students_active: 4,
  },
  warnings: [
    {
      kind: "song",
      id: "c1",
      name: "Pista",
      style: "salsa-casino",
      reasons: ["license_expired"],
      expires_on: "2026-09-28",
    },
    { kind: "otra-cosa", id: "x", name: "?", style: null, reasons: [] },
  ],
  pending: [
    {
      kind: "step",
      id: "b1",
      name: "Exhibe",
      style: "salsa-casino",
      reasons: [],
    },
  ],
};

describe("toAdminSummary", () => {
  test("pasa a camelCase y omite tipos desconocidos", () => {
    const s = toAdminSummary(RAW);
    expect(s.styles[0]).toEqual({
      id: "a1",
      slug: "salsa-casino",
      name: "Salsa casino",
      published: true,
      stepsPublished: 16,
      stepsTotal: 18,
      songsPublished: 2,
      songsTotal: 3,
      lessonsPublished: 6,
      lessonsTotal: 6,
    });
    expect(s.totals).toMatchObject({
      songsTotal: 4,
      students: 10,
      studentsActive: 4,
    });
    expect(s.warnings).toEqual([
      {
        kind: "song",
        id: "c1",
        name: "Pista",
        style: "salsa-casino",
        reasons: ["license_expired"],
        expiresOn: "2026-09-28",
      },
    ]);
    expect(s.pending[0]).toMatchObject({
      kind: "step",
      reasons: [],
      expiresOn: null,
    });
  });

  test("sin datos: todo vacío y en cero", () => {
    const s = toAdminSummary(null);
    expect(s.styles).toEqual([]);
    expect(s.warnings).toEqual([]);
    expect(s.totals.students).toBe(0);
  });
});

describe("enlaces", () => {
  test("solo los pasos enlazan, al editor con estilo y paso (contrato con /admin/steps)", () => {
    const step = toAdminSummary(RAW).pending[0];
    expect(itemHref(step)).toBe("/admin/steps?style=salsa-casino&step=b1");
    expect(ADMIN_SUMMARY_LINKS.step("salsa-casino", "b1")).toBe(
      "/admin/steps?style=salsa-casino&step=b1",
    );
    expect(itemHref(toAdminSummary(RAW).warnings[0])).toBeNull();
    expect(itemHref({ ...step, style: null })).toBeNull();
  });
});

describe("copy", () => {
  test("motivos con fecha y desconocidos", () => {
    expect(formatDay("2026-09-28")).toContain("2026");
    expect(summaryCopy.reason("license_expired", "2026-09-28")).toContain(
      formatDay("2026-09-28"),
    );
    expect(summaryCopy.reason("algo-nuevo", null)).toBe("Revisar");
    expect(summaryCopy.count(1, "warnings")).toBe("1 aviso");
    expect(summaryCopy.count(3, "pending")).toBe("3 pendientes");
  });
});
