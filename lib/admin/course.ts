import { parseAnchors } from "@/lib/practice/config";
import { formatDuration } from "@/lib/songs/songs";
import {
  type LessonCatalogStep,
  type LessonIssue,
  validateLesson,
} from "@/supabase/functions/_shared/core/combinaciones";
import {
  type Anchor,
  assertAnchors,
  beatToMs,
} from "@/supabase/functions/_shared/core/grid";
import { phraseWindow } from "@/supabase/functions/_shared/core/phrases";
import type { StyleConfig } from "@/supabase/functions/_shared/core/style";
import type { Json } from "@/supabase/functions/_shared/database.types";

/**
 * Admin · Camino (`/admin/course`): tipos de `admin_course`, borrador de la lección, textos de
 * los motivos y lo que la pantalla calcula para mostrar. Sin reglas de negocio propias: publicar,
 * borrar con progreso, el estilo de pasos y canciones y el orden viven en Postgres
 * (`20261003170000_admin_course.sql`, D168–D172); si la secuencia se puede bailar lo dice el core
 * (`validateLesson`, D173), el mismo TS que corre en las Edge Functions.
 */

export const ADMIN_COURSE_PATH = "/admin/course";

export type CourseStyle = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  startPositionId: string | null;
  config: StyleConfig;
};

export type CoursePosition = { id: string; name: string };

/** Paso del estilo con lo que usa la validación y la lista de la lección. */
export type CourseStep = LessonCatalogStep & { slug: string; name: string };

export type CourseSong = {
  id: string;
  title: string;
  artist: string;
  published: boolean;
  /** La ve el alumno: publicada y con licencia vigente. */
  visible: boolean;
  /** Tiene el estilo en `song_styles` (las de lecciones viejas pueden no tenerlo). */
  inStyle: boolean;
  durationMs: number | null;
  danceEndMs: number | null;
  beatGrid: Anchor[] | null;
  bpm: number | null;
};

export type LessonSongIssue = "missing_song" | "song_unavailable";

export type CourseLesson = {
  id: string;
  title: string;
  intro: string;
  practiceSongId: string | null;
  practicePhrases: number | null;
  finalSongId: string | null;
  /** Alumnos que la completaron (bloquea borrarla, D171). */
  progressCount: number;
  stepIds: string[];
  songIssues: LessonSongIssue[];
};

export type CourseUnit = { id: string; title: string; lessons: CourseLesson[] };

export type CourseIssue =
  | "no_lessons"
  | "lesson_without_steps"
  | "lesson_without_song";

export type CourseInfo = {
  id: string;
  title: string;
  description: string;
  published: boolean;
  issues: CourseIssue[];
};

export type AdminCourseData = {
  style: CourseStyle;
  positions: CoursePosition[];
  steps: CourseStep[];
  songs: CourseSong[];
  course: CourseInfo | null;
  units: CourseUnit[];
};

// ── Lectura de `admin_course` (jsonb) ───────────────────────────────────────

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null =>
  typeof v === "string" ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : null;

/** `admin_course(p_style_id)` → datos de la pantalla; `null` si el estilo no existe. */
export function parseCourseData(raw: Json | null): AdminCourseData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Raw;
  const s = obj(r.style);
  if (!s.id) return null;
  const course = r.course ? obj(r.course) : null;
  return {
    style: {
      id: str(s.id),
      slug: str(s.slug),
      name: str(s.name),
      published: s.published === true,
      startPositionId: strOrNull(s.start_position_id),
      config: {
        beatsPerPhrase: num(s.beats_per_phrase) ?? 8,
        spokenBeats: arr(s.spoken_beats).map((b) => num(b) ?? 0),
        callBeat: num(s.call_beat) ?? 5,
        callSpanBeats: num(s.call_span_beats) ?? 2,
        leadInPhrases: num(s.lead_in_phrases) ?? 1,
      },
    },
    positions: arr(r.positions).map((p) => ({
      id: str(obj(p).id),
      name: str(obj(p).name),
    })),
    steps: arr(r.steps).map((x) => {
      const p = obj(x);
      return {
        id: str(p.id),
        slug: str(p.slug),
        name: str(p.name),
        category: str(p.category) as CourseStep["category"],
        published: p.published === true,
        phrases: num(p.phrases) ?? 1,
        startPosition: str(p.start_position_id),
        endPosition: str(p.end_position_id),
        canStart: p.can_start === true,
        canEnd: p.can_end === true,
        repeatable: p.repeatable === true,
      };
    }),
    songs: arr(r.songs).map((x) => {
      const p = obj(x);
      return {
        id: str(p.id),
        title: str(p.title),
        artist: str(p.artist),
        published: p.published === true,
        visible: p.visible === true,
        inStyle: p.in_style === true,
        durationMs: num(p.duration_ms),
        danceEndMs: num(p.dance_end_ms),
        beatGrid: parseAnchors(p.beat_grid),
        bpm: num(p.bpm),
      };
    }),
    course: course
      ? {
          id: str(course.id),
          title: str(course.title),
          description: str(course.description),
          published: course.published === true,
          issues: arr(course.issues).map(String) as CourseIssue[],
        }
      : null,
    units: arr(r.units).map((x) => {
      const u = obj(x);
      return {
        id: str(u.id),
        title: str(u.title),
        lessons: arr(u.lessons).map((y) => {
          const l = obj(y);
          return {
            id: str(l.id),
            title: str(l.title),
            intro: str(l.intro),
            practiceSongId: strOrNull(l.practice_song_id),
            practicePhrases: num(l.practice_phrases),
            finalSongId: strOrNull(l.final_song_id),
            progressCount: num(l.progress_count) ?? 0,
            stepIds: arr(l.step_ids).map(String),
            songIssues: arr(l.issues).map(String) as LessonSongIssue[],
          };
        }),
      };
    }),
  };
}

// ── Camino: números, lecciones anteriores y avisos ─────────────────────────

/** Número de cada lección en todo el curso (1…N), como "Lección n" del alumno. */
export function lessonNumbers(
  units: readonly CourseUnit[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const u of units) for (const l of u.lessons) out.set(l.id, out.size + 1);
  return out;
}

export function findLesson(
  units: readonly CourseUnit[],
  lessonId: string,
): { unit: CourseUnit; unitIndex: number; lesson: CourseLesson } | null {
  for (const [unitIndex, unit] of units.entries()) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, unitIndex, lesson };
  }
  return null;
}

/** Pasos de las lecciones anteriores del curso (lo que `plan-session` suma a la lección). */
export function previousStepIds(
  units: readonly CourseUnit[],
  lessonId: string,
): string[] {
  const out: string[] = [];
  for (const u of units)
    for (const l of u.lessons) {
      if (l.id === lessonId) return out;
      out.push(...l.stepIds);
    }
  return out;
}

/**
 * Problemas de secuencia de la lección con el core (`validateLesson`). Estilo sin posición
 * inicial: no se puede validar (`null`; la pantalla lo dice).
 */
export function sequenceIssues(
  data: Pick<AdminCourseData, "style" | "steps" | "units">,
  lessonId: string,
  stepIds: readonly string[],
): LessonIssue[] | null {
  if (!data.style.startPositionId) return null;
  return validateLesson({
    startPosition: data.style.startPositionId,
    lessonStepIds: stepIds,
    previousStepIds: previousStepIds(data.units, lessonId),
    catalog: data.steps,
  });
}

/** Avisos de canción de un borrador (los mismos códigos que `admin_course`). */
export function draftSongIssues(
  draft: Pick<LessonDraft, "practiceSongId" | "finalSongId">,
  songs: readonly CourseSong[],
): LessonSongIssue[] {
  const ids = [draft.practiceSongId, draft.finalSongId].filter(
    (id): id is string => id !== null,
  );
  if (ids.length === 0) return ["missing_song"];
  const visible = new Set(songs.filter((s) => s.visible).map((s) => s.id));
  return ids.some((id) => !visible.has(id)) ? ["song_unavailable"] : [];
}

/** ¿La lección (guardada) tiene avisos? Para la pill del árbol. */
export function lessonHasWarnings(
  data: Pick<AdminCourseData, "style" | "steps" | "units">,
  lesson: CourseLesson,
): boolean {
  if (lesson.songIssues.length > 0) return true;
  const seq = sequenceIssues(data, lesson.id, lesson.stepIds);
  return seq === null || seq.length > 0;
}

// ── Textos (copy provisional, CONTENT_CHECKLIST fila 90) ────────────────────

const quote = (name: string) => `«${name}»`;

/** Una línea por problema de secuencia; los nombres salen de los pasos y posiciones del estilo. */
export function sequenceIssueText(
  issue: LessonIssue,
  names: { step: (id: string) => string; position: (id: string) => string },
): string {
  const step = issue.stepId ? quote(names.step(issue.stepId)) : "";
  const pos = issue.position ? names.position(issue.position) : "";
  switch (issue.code) {
    case "no_steps":
      return "La lección no tiene pasos.";
    case "step_unpublished":
      return `${step} está sin publicar: el alumno no lo ve.`;
    case "no_start_step":
      return `Ningún paso publicado puede abrir desde ${pos}, la posición inicial del estilo.`;
    case "step_unreachable":
      return `No se llega a ${step}: empieza en ${pos} y ningún paso de esta lección ni de las anteriores lleva ahí.`;
    case "step_no_end":
      return `Después de ${step} (termina en ${pos}) no se puede cerrar la combinación.`;
    case "no_base_reachable":
      return `Desde ${pos} no se vuelve a una posición con paso base.`;
  }
}

export const SONG_ISSUE_TEXT: Record<LessonSongIssue, string> = {
  missing_song: "No tiene canción de mini práctica ni final.",
  song_unavailable:
    "Usa una canción sin publicar o con la licencia vencida: el alumno no la puede practicar.",
};

export const COURSE_ISSUE_TEXT: Record<CourseIssue, string> = {
  no_lessons: "El curso no tiene lecciones.",
  lesson_without_steps: "Hay lecciones sin pasos.",
  lesson_without_song: "Hay lecciones sin canción.",
};

export type DbError = { code?: string; message: string };

export function courseErrorMessage(error: DbError): string {
  switch (error.code) {
    case "MS021":
      return "Todos los pasos de la lección tienen que ser del estilo del curso.";
    case "MS022":
      return "Esa canción no tiene el estilo del curso. Agrégaselo en Canciones o elige otra.";
    case "MS023":
      return "Algún alumno ya la completó: no se puede borrar.";
    case "MS024":
      return "Una lección solo se mueve entre unidades del mismo curso.";
    case "MS025":
      return "Al curso le falta algo para publicarse. Revisa los motivos.";
    case "22023":
      return "Algún dato no es válido (¿un paso repetido?). Recarga la página.";
    case "23514":
    case "22P02":
      return "Algún campo tiene un valor fuera de rango. Revisa el formulario.";
    case "23505":
      return "Ya hay un curso para este estilo. Recarga la página.";
    case "42501":
    case "PGRST301":
      return "Tu sesión venció o ya no eres admin. Vuelve a entrar.";
    case "P0002":
      return "Esto ya no existe. Recarga la página.";
    default:
      return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
  }
}

// ── Borrador de la lección ─────────────────────────────────────────────────

export const PRACTICE_PHRASES_MIN = 1;
export const PRACTICE_PHRASES_MAX = 32;
/** Frases de la mini práctica de una lección nueva (como el seed). */
export const PRACTICE_PHRASES_DEFAULT = 4;

export type LessonDraft = {
  title: string;
  intro: string;
  stepIds: string[];
  practiceSongId: string | null;
  practicePhrases: number;
  finalSongId: string | null;
};

export function lessonDraft(lesson: CourseLesson): LessonDraft {
  return {
    title: lesson.title,
    intro: lesson.intro,
    stepIds: [...lesson.stepIds],
    practiceSongId: lesson.practiceSongId,
    practicePhrases: lesson.practicePhrases ?? PRACTICE_PHRASES_DEFAULT,
    finalSongId: lesson.finalSongId,
  };
}

export function isLessonDirty(a: LessonDraft, b: LessonDraft): boolean {
  return (
    a.title !== b.title ||
    a.intro !== b.intro ||
    a.practiceSongId !== b.practiceSongId ||
    a.practicePhrases !== b.practicePhrases ||
    a.finalSongId !== b.finalSongId ||
    a.stepIds.join() !== b.stepIds.join()
  );
}

export type LessonField = "title" | "intro";

/** Lo que el formulario puede decir antes de mandar (la base lo vuelve a comprobar). */
export function validateLessonDraft(
  draft: LessonDraft,
): Partial<Record<LessonField, string>> {
  const errors: Partial<Record<LessonField, string>> = {};
  const title = draft.title.trim();
  if (title.length === 0) errors.title = "Escribe el título de la lección.";
  else if (title.length > 120) errors.title = "Máximo 120 caracteres.";
  if (draft.intro.trim().length > 2000)
    errors.intro = "Máximo 2000 caracteres.";
  return errors;
}

export const clampPhrases = (n: number) =>
  Math.min(
    PRACTICE_PHRASES_MAX,
    Math.max(PRACTICE_PHRASES_MIN, Math.round(Number.isFinite(n) ? n : 1)),
  );

/** `p_lesson` de `admin_save_lesson`. La mini práctica sin canción no guarda frases. */
export function draftToPayload(draft: LessonDraft) {
  return {
    title: draft.title.trim(),
    intro: draft.intro.trim(),
    practice_song_id: draft.practiceSongId,
    practice_phrases: draft.practiceSongId
      ? clampPhrases(draft.practicePhrases)
      : null,
    final_song_id: draft.finalSongId,
  };
}

/** Título de unidad, lección o curso: 1–120 sin espacios a los lados. */
export function titleError(title: string): string | null {
  const t = title.trim();
  if (t.length === 0) return "Escribe un título.";
  if (t.length > 120) return "Máximo 120 caracteres.";
  return null;
}

// ── Fragmento que suena ────────────────────────────────────────────────────

export type SongFragment = {
  /** Desde la primera frase de cuenta (o el principio). */
  startMs: number;
  /** Fin de la última frase con pasos. */
  endMs: number;
  phrases: number;
};

/**
 * Qué suena de la canción (motor-de-ritmo §3): la ventana de `phraseWindow`, con `cap` frases
 * como mucho (la mini práctica usa `min(N, practice_phrases)`, como `plan-session`). Sin rejilla
 * válida o sin fin de baile, `null`: la pantalla muestra la duración.
 */
export function songFragment(
  song: Pick<CourseSong, "beatGrid" | "danceEndMs">,
  style: StyleConfig,
  cap?: number,
): SongFragment | null {
  if (!song.beatGrid || song.danceEndMs === null) return null;
  try {
    assertAnchors(song.beatGrid);
    const win = phraseWindow(style, song.beatGrid, song.danceEndMs);
    const phrases =
      cap === undefined ? win.phrases : Math.min(win.phrases, cap);
    const bpp = style.beatsPerPhrase;
    return {
      startMs: Math.max(
        0,
        beatToMs(song.beatGrid, bpp * (win.startPhrase - style.leadInPhrases)),
      ),
      endMs: beatToMs(song.beatGrid, bpp * (win.startPhrase + phrases)),
      phrases,
    };
  } catch {
    return null;
  }
}

/** Frases que caben en la canción (sin tope); `null` sin rejilla o sin fin de baile. */
export function songPhrases(
  song: Pick<CourseSong, "beatGrid" | "danceEndMs">,
  style: StyleConfig,
): number | null {
  return songFragment(song, style)?.phrases ?? null;
}

export function fragmentText(
  song: Pick<CourseSong, "beatGrid" | "danceEndMs" | "durationMs">,
  style: StyleConfig,
  cap?: number,
): string {
  const f = songFragment(song, style, cap);
  if (f)
    return f.phrases === 0
      ? "No cabe ninguna frase completa en esta canción."
      : `Suena de ${formatDuration(f.startMs)} a ${formatDuration(f.endMs)} · ${f.phrases === 1 ? "1 frase" : `${f.phrases} frases`}.`;
  return song.durationMs
    ? `Dura ${formatDuration(song.durationMs)}. El fragmento se calcula al marcar el ritmo y el fin de baile.`
    : "Sin audio todavía: el fragmento se calcula al marcar el ritmo y el fin de baile.";
}

/** Nombre de la canción en un selector, con su estado si el alumno no la puede usar. */
export function songOptionLabel(song: CourseSong): string {
  const state = !song.inStyle
    ? " (sin este estilo)"
    : !song.published
      ? " (sin publicar)"
      : !song.visible
        ? " (licencia vencida)"
        : "";
  return `${song.title} · ${song.artist}${state}`;
}

// ── Orden local (optimista, igual que `admin_move_unit` / `admin_move_lesson`) ──

/** Mueve un elemento a `position` (1-based, acotada). */
function moveIn<T>(list: readonly T[], from: number, position: number): T[] {
  const out = [...list];
  const [item] = out.splice(from, 1);
  const at = Math.max(0, Math.min(position - 1, out.length));
  out.splice(at, 0, item);
  return out;
}

export function moveUnitLocal(
  units: readonly CourseUnit[],
  unitId: string,
  position: number,
): CourseUnit[] {
  const from = units.findIndex((u) => u.id === unitId);
  return from < 0 ? [...units] : moveIn(units, from, position);
}

export function moveLessonLocal(
  units: readonly CourseUnit[],
  lessonId: string,
  unitId: string,
  position: number,
): CourseUnit[] {
  const found = findLesson(units, lessonId);
  if (!found || !units.some((u) => u.id === unitId)) return [...units];
  return units.map((u) => {
    if (u.id === unitId) {
      const rest = u.lessons.filter((l) => l.id !== lessonId);
      const at = Math.max(0, Math.min(position - 1, rest.length));
      return {
        ...u,
        lessons: [...rest.slice(0, at), found.lesson, ...rest.slice(at)],
      };
    }
    if (u.id === found.unit.id)
      return { ...u, lessons: u.lessons.filter((l) => l.id !== lessonId) };
    return u;
  });
}

// ── URL ─────────────────────────────────────────────────────────────────────

/** `?style=<slug>&lesson=<uuid>` (contrato del Resumen); lo vacío no va. */
export function courseSearch(
  state: { style?: string | null; lesson?: string | null },
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(extra);
  if (state.style) params.set("style", state.style);
  if (state.lesson) params.set("lesson", state.lesson);
  const s = params.toString();
  return s ? `?${s}` : "";
}
