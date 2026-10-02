import type { StyleOption } from "@/lib/course/path";

/**
 * Tipos y presentación de Progreso (`/app/progress`). Sin reglas de negocio (D003): qué vence
 * cada día, cuántos pasos hay por estado y qué paso cuesta más llegan ya resueltos de las
 * funciones SQL (`review_forecast`, `step_status_counts`, `hardest_steps`, `style_progress`).
 * Aquí solo se elige el estilo del enlace, se escala la gráfica y se arma el texto.
 */

/** Una fila de `review_forecast`: día de calendario del dispositivo (`YYYY-MM-DD`). */
export type ForecastDay = { day: string; dueCount: number };

export type StepStatusCounts = {
  unknown: number;
  learning: number;
  known: number;
  total: number;
};

/** Una sesión reciente propia (`practice_sessions`, D132). */
export type RecentSession = {
  id: string;
  mode: "free" | "lesson";
  styleName: string | null;
  /** `null` si la canción ya no es visible (licencia vencida, despublicada). */
  songTitle: string | null;
  lessonTitle: string | null;
  createdAt: string;
};

/** Cuántas sesiones recientes muestra Progreso (D132). */
export const RECENT_SESSIONS_LIMIT = 5;

/** Cuántos pasos de "Lo que más te cuesta" muestra Progreso (Inicio muestra 3). */
export const HARDEST_LIMIT = 5;

/** Días de la gráfica de próximos repasos (handoff: 7 barras). */
export const FORECAST_DAYS = 7;

/** Destinos de Progreso (D077: rutas en inglés). */
export const PROGRESS_LINKS = {
  progress: (styleId?: string) =>
    styleId
      ? `/app/progress?style=${encodeURIComponent(styleId)}`
      : "/app/progress",
  /** "Practicar estos": el configurador en modo repaso, como Repasar (pantallas.md). */
  practiceReview: (styleId: string) =>
    `/app/practice?style=${encodeURIComponent(styleId)}&mode=review`,
  lesson: (id: string) => `/app/lessons/${id}`,
  course: "/app/course",
  step: (slug: string) => `/app/steps/${slug}`,
  result: (sessionId: string) =>
    `/app/practice/result?id=${encodeURIComponent(sessionId)}`,
} as const;

/**
 * Estilo de la pantalla: el de `?style=` si es uno publicado; si no, el actual (el mismo de
 * Inicio y Curso, `pickCurrentStyle`). `null` sin estilos.
 */
export function pickProgressStyle(
  options: readonly StyleOption[],
  requested: string | undefined,
  current: StyleOption | null,
): StyleOption | null {
  return options.find((s) => s.id === requested) ?? current;
}

/** Fila de `step_status_counts` → conteos (sin fila, todo en cero). */
export function toStatusCounts(
  row:
    | {
        unknown_count: number;
        learning_count: number;
        known_count: number;
        total: number;
      }
    | undefined,
): StepStatusCounts {
  return {
    unknown: row?.unknown_count ?? 0,
    learning: row?.learning_count ?? 0,
    known: row?.known_count ?? 0,
    total: row?.total ?? 0,
  };
}

/**
 * Primer día en un estilo: no completó ninguna lección, no marcó pasos, no tiene nada difícil
 * ni sesiones. Entonces Progreso invita a la lección 1 en vez de mostrar todo en cero.
 */
export function isFirstDay({
  completedLessons,
  counts,
  hardestCount,
  sessionCount,
}: {
  completedLessons: number;
  counts: StepStatusCounts;
  hardestCount: number;
  sessionCount: number;
}): boolean {
  return (
    completedLessons === 0 &&
    counts.learning === 0 &&
    counts.known === 0 &&
    hardestCount === 0 &&
    sessionCount === 0
  );
}

// ── Gráfica de próximos repasos ─────────────────────────────────────────────────

// Copy provisional (CONTENT_CHECKLIST fila 73).
export const FORECAST_COPY = {
  today: "Hoy",
  todayLower: "hoy",
  reviews: (n: number) =>
    n === 0 ? "ninguno" : n === 1 ? "1 repaso" : `${n} repasos`,
  label: "Repasos por día, de hoy a 7 días",
} as const;

export type ForecastBar = {
  day: string;
  count: number;
  /** Alto relativo al día con más repasos (0–1); 0 sin repasos (se dibuja la línea de 2 px). */
  ratio: number;
  isToday: boolean;
  /** Bajo la barra: "Hoy" o el día corto ("vie"). */
  shortLabel: string;
  /** Para el nombre accesible: "hoy" o el día largo ("viernes"). */
  longLabel: string;
};

/** `YYYY-MM-DD` → mediodía UTC de ese día: así el día de la semana no depende de la zona. */
const noonUtc = (day: string) => new Date(`${day.slice(0, 10)}T12:00:00Z`);

const weekday = (day: string, width: "short" | "long") =>
  new Intl.DateTimeFormat("es-419", { weekday: width, timeZone: "UTC" })
    .format(noonUtc(day))
    .replace(/\.$/, "");

/**
 * Barras de la gráfica a partir de `review_forecast` (ya en días del dispositivo, hoy primero).
 * La altura es relativa al día con más repasos; los días se nombran desde la fecha, no desde
 * el reloj del cliente (la función ya decidió cuál es hoy).
 */
export function forecastBars(days: readonly ForecastDay[]): ForecastBar[] {
  const max = Math.max(0, ...days.map((d) => d.dueCount));
  return days.map((d, i) => {
    const count = Math.max(0, Math.floor(d.dueCount));
    const isToday = i === 0;
    return {
      day: d.day,
      count,
      ratio: max > 0 ? count / max : 0,
      isToday,
      shortLabel: isToday ? FORECAST_COPY.today : weekday(d.day, "short"),
      longLabel: isToday ? FORECAST_COPY.todayLower : weekday(d.day, "long"),
    };
  });
}

export const forecastTotal = (days: readonly ForecastDay[]) =>
  days.reduce((sum, d) => sum + Math.max(0, d.dueCount), 0);

/** Nombre accesible de la gráfica: enumera los días ("hoy, 3 repasos; viernes, ninguno; …"). */
export function forecastAriaLabel(bars: readonly ForecastBar[]): string {
  const days = bars
    .map((b) => `${b.longLabel}, ${FORECAST_COPY.reviews(b.count)}`)
    .join("; ");
  return `${FORECAST_COPY.label}: ${days}.`;
}
