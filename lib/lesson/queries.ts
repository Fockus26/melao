import { cache } from "react";
import type { CoursePath, DanceRole } from "@/lib/course/path";
import { getCoursePath } from "@/lib/course/queries";
import { createClient } from "@/lib/supabase/server";
import type { Anchor } from "@/supabase/functions/_shared/core/grid";
import type {
  BeatNote,
  LessonData,
  LessonSong,
  LessonStep,
  VideoRole,
} from "./lesson";

/**
 * Lectura de la lección para su Server Component, con la sesión del alumno: RLS decide lo
 * visible (el alumno, lo publicado; el admin, todo). El bloqueo y la siguiente lección salen de
 * `course_path` (D092); aquí no se decide nada.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID.test(value);

export type LessonPage =
  | { kind: "open"; lesson: LessonData }
  | {
      kind: "locked";
      lesson: Pick<LessonData, "id" | "title" | "number" | "styleName">;
    };

function beatNotes(value: unknown): BeatNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((n) =>
    typeof n === "object" &&
    n !== null &&
    Number.isInteger((n as BeatNote).beat) &&
    typeof (n as BeatNote).note === "string"
      ? [{ beat: (n as BeatNote).beat, note: (n as BeatNote).note }]
      : [],
  );
}

function anchors(value: unknown): Anchor[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter(
    (a): a is Anchor =>
      typeof a === "object" &&
      a !== null &&
      Number.isInteger((a as Anchor).beat) &&
      Number.isFinite((a as Anchor).tMs),
  );
  return out.length === value.length ? out : null;
}

/** Siguiente lección del camino por número; `null` si es la última o no está en el camino. */
function nextInPath(path: CoursePath | null, lessonId: string) {
  const row = path?.lessons.find((l) => l.lessonId === lessonId);
  const next = row
    ? path?.lessons.find((l) => l.number === row.number + 1)
    : undefined;
  return next
    ? { id: next.lessonId, number: next.number, title: next.title }
    : null;
}

/** `null` si la lección no existe o el alumno no la ve (→ 404). Un error de lectura se lanza. */
export const getLessonPage = cache(
  async (
    lessonId: string,
    userId: string,
    profileRole: DanceRole | null,
  ): Promise<LessonPage | null> => {
    if (!isUuid(lessonId)) return null;
    const supabase = await createClient();
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select(
        `id, title, intro, practice_song_id, practice_phrases, final_song_id,
         unit:course_units!inner(course:courses!inner(style_id)),
         lesson_steps(position, step:steps(id, slug, name, category, beat_notes,
           step_videos(role, duration_ms)))`,
      )
      .eq("id", lessonId)
      .maybeSingle();
    if (error) throw new Error(`lesson: ${error.message}`);
    if (!lesson) return null;

    const styleId = lesson.unit.course.style_id;
    const [{ data: style, error: styleError }, path] = await Promise.all([
      supabase
        .from("dance_styles")
        .select(
          "name, has_roles, beats_per_phrase, spoken_beats, call_beat, call_span_beats, lead_in_phrases",
        )
        .eq("id", styleId)
        .maybeSingle(),
      getCoursePath(styleId),
    ]);
    if (styleError) throw new Error(`dance_styles: ${styleError.message}`);
    if (!style) return null;

    const row = path?.lessons.find((l) => l.lessonId === lessonId) ?? null;
    if (row?.status === "locked") {
      return {
        kind: "locked",
        lesson: {
          id: lesson.id,
          title: lesson.title,
          number: row.number,
          styleName: style.name,
        },
      };
    }

    const lessonSteps = [...lesson.lesson_steps]
      .sort((a, b) => a.position - b.position)
      .flatMap((ls) => (ls.step ? [ls.step] : []));
    const stepIds = lessonSteps.map((s) => s.id);
    const songIds = [lesson.practice_song_id, lesson.final_song_id].filter(
      (id): id is string => id !== null,
    );
    // Estilo sin roles: una tarjeta por paso con rol `leader` (D051).
    const cardRole: DanceRole | null = style.has_roles ? profileRole : "leader";

    const [songs, cards, names] = await Promise.all([
      songIds.length > 0
        ? supabase
            .from("songs")
            .select("id, bpm, beat_grid, dance_end_ms, duration_ms")
            .in("id", songIds)
        : Promise.resolve({ data: [], error: null }),
      stepIds.length > 0 && cardRole
        ? supabase
            .from("srs_cards")
            .select("step_id, due_at")
            // El admin lee las tarjetas de todos (RLS): solo las suyas.
            .eq("user_id", userId)
            .in("step_id", stepIds)
            .eq("role", cardRole)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("steps").select("id, slug, name").eq("style_id", styleId),
    ]);
    if (songs.error) throw new Error(`songs: ${songs.error.message}`);
    if (cards.error) throw new Error(`srs_cards: ${cards.error.message}`);
    if (names.error) throw new Error(`steps: ${names.error.message}`);

    const dueByStep = new Map(
      (cards.data ?? []).map((c) => [c.step_id, c.due_at]),
    );
    const steps: LessonStep[] = lessonSteps.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      free: !style.has_roles || s.category === "libre",
      beatNotes: beatNotes(s.beat_notes).sort((a, b) => a.beat - b.beat),
      videos: Object.fromEntries(
        s.step_videos.map((v) => [v.role as VideoRole, v.duration_ms]),
      ),
      dueAt: dueByStep.get(s.id) ?? null,
    }));
    const lessonSongs: LessonSong[] = (songs.data ?? []).map((s) => ({
      id: s.id,
      bpm: s.bpm,
      beatGrid: anchors(s.beat_grid),
      danceEndMs: s.dance_end_ms,
      durationMs: s.duration_ms,
    }));

    return {
      kind: "open",
      lesson: {
        id: lesson.id,
        title: lesson.title,
        intro: lesson.intro,
        number: row?.number ?? null,
        styleId,
        styleName: style.name,
        hasRoles: style.has_roles,
        style: {
          beatsPerPhrase: style.beats_per_phrase,
          spokenBeats: style.spoken_beats,
          callBeat: style.call_beat,
          callSpanBeats: style.call_span_beats,
          leadInPhrases: style.lead_in_phrases,
        },
        role: profileRole,
        practiceSongId: lesson.practice_song_id,
        practicePhrases: lesson.practice_phrases,
        finalSongId: lesson.final_song_id,
        songs: lessonSongs,
        steps,
        stepNames: Object.fromEntries(
          (names.data ?? []).map((s) => [s.id, { slug: s.slug, name: s.name }]),
        ),
        next: nextInPath(path, lessonId),
      },
    };
  },
);
