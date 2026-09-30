import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import type { Enums } from "@/supabase/functions/_shared/database.types";

/**
 * Tipos y presentación del curso para Inicio, Curso y Lección. Sin reglas de negocio (D003):
 * qué lección sigue, qué está bloqueado y qué paso cuesta más llegan ya resueltos de las
 * funciones SQL (`course_path`, `due_steps`, `hardest_steps`, `style_progress`). Aquí solo se
 * cuentan filas y se arma el texto.
 */

export type DanceRole = Enums<"dance_role">;

/** Estados del camino (D092); coinciden con los de PathNode salvo el repaso. */
export type LessonStatus = "completed" | "current" | "available" | "locked";

export type PathLesson = {
  unitId: string;
  unitPosition: number;
  unitTitle: string;
  lessonId: string;
  lessonPosition: number;
  /** 1…N en todo el curso. */
  number: number;
  title: string;
  stepCount: number;
  status: LessonStatus;
};

export type CoursePath = {
  courseId: string;
  lessonCount: number;
  lessons: PathLesson[];
};

/** Un estilo del selector ("Elige tu estilo"). */
export type StyleOption = {
  id: string;
  name: string;
  hasRoles: boolean;
  /** Lo eligió en la Bienvenida. */
  chosen: boolean;
  hasCourse: boolean;
  lessonCount: number;
  completedCount: number;
};

export type DueStep = { id: string; slug: string; name: string };

export type HardStep = {
  id: string;
  slug: string;
  name: string;
  /** Dificultad del paso, 1–5. */
  difficulty: number;
  lastRating: SrsRating;
  lastReviewedAt: string;
};

/**
 * Estilo actual del alumno: `profiles.default_style_id` si sigue publicado; si no, el primero
 * que eligió en la Bienvenida; si no, el primero publicado. `null` sin estilos publicados.
 */
export function pickCurrentStyle(
  options: readonly StyleOption[],
  defaultStyleId: string | null | undefined,
): StyleOption | null {
  return (
    options.find((s) => s.id === defaultStyleId) ??
    options.find((s) => s.chosen) ??
    options[0] ??
    null
  );
}

const LESSON_STATUSES: readonly LessonStatus[] = [
  "completed",
  "current",
  "available",
  "locked",
];

/** Estado de una fila de `course_path`; uno desconocido se trata como bloqueado. */
export function toLessonStatus(value: string): LessonStatus {
  return (LESSON_STATUSES as readonly string[]).includes(value)
    ? (value as LessonStatus)
    : "locked";
}

export type CourseSummary = {
  lessonCount: number;
  completedCount: number;
  /** La lección actual (`current`); `null` con el curso terminado o vacío. */
  current: PathLesson | null;
  finished: boolean;
  /** Avance de la unidad de la lección actual (lecciones completadas de la unidad). */
  unit: { position: number; title: string; done: number; total: number } | null;
};

/** Resume el camino para Inicio: lección actual, conteos y avance de su unidad. */
export function summarizeCourse(path: CoursePath | null): CourseSummary {
  const lessons = path?.lessons ?? [];
  const completedCount = lessons.filter((l) => l.status === "completed").length;
  const current = lessons.find((l) => l.status === "current") ?? null;
  const unitLessons = current
    ? lessons.filter((l) => l.unitId === current.unitId)
    : [];
  return {
    lessonCount: lessons.length,
    completedCount,
    current,
    finished: lessons.length > 0 && completedCount === lessons.length,
    unit: current
      ? {
          position: current.unitPosition,
          title: current.unitTitle,
          done: unitLessons.filter((l) => l.status === "completed").length,
          total: unitLessons.length,
        }
      : null,
  };
}

// ── Texto (provisional, CONTENT_CHECKLIST fila 54) ──────────────────────────────

const ROLE_LABELS: Record<DanceRole, string> = {
  leader: "Líder",
  follower: "Seguidor",
};

/** "Líder · 3 de 6 lecciones" · "Merengue: curso en preparación" · sin rol si el estilo no tiene. */
export function styleProgressLine(
  style: StyleOption,
  role: DanceRole | null | undefined,
): string {
  const progress = style.hasCourse
    ? `${style.completedCount} de ${style.lessonCount} lecciones`
    : "Curso en preparación";
  return style.hasRoles && role
    ? `${ROLE_LABELS[role]} · ${progress}`
    : progress;
}

/**
 * Minutos estimados de un repaso: ~1 por paso, mínimo 3 (una canción corta). Es solo una
 * estimación de texto; la sesión real la arma plan-session con la canción.
 */
export function reviewMinutes(dueCount: number): number {
  return Math.max(3, Math.ceil(dueCount));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "hoy" · "ayer" · "hace 3 días" · "hace 2 semanas" · "hace más de un mes", por días de calendario UTC. */
export function relativeDays(iso: string, now: Date): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "hace un tiempo";
  const day = (d: Date) =>
    Math.floor(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS,
    );
  const days = Math.max(0, day(now) - day(then));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 14) return `hace ${days} días`;
  if (days < 31) return `hace ${Math.floor(days / 7)} semanas`;
  return "hace más de un mes";
}

/** Nombres de los pasos en una línea: "Guapea, Enchufla y 3 más". */
export function stepNamesLine(steps: readonly { name: string }[], max = 3) {
  const names = steps.slice(0, max).map((s) => s.name);
  const rest = steps.length - names.length;
  if (rest > 0) return `${names.join(", ")} y ${rest} más`;
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
