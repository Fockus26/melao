import { cache } from "react";
import type { DanceRole } from "@/lib/course/path";
import { isUuid } from "@/lib/lesson/queries";
import {
  parseBeatGrid,
  parseStoredPlan,
  recomputeTimeline,
} from "@/lib/stage/practice-session";
import { UNKNOWN_STEP } from "@/lib/stage/session-source";
import { createClient } from "@/lib/supabase/server";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import {
  dancedMs,
  dancedPhrases,
  type PracticeResultData,
  type ResultStep,
} from "./result";

const isRating = (v: number): v is SrsRating => v >= 1 && v <= 4;

/**
 * Lectura del resultado para su Server Component, con la sesión del alumno. Sin reglas de
 * negocio: RLS deja leer lo propio (y al admin, todo), así que se filtra además por `user_id`.
 * Solo sesiones libres (`mode = free`): la de una lección se califica en la lección. La duración
 * sale de la línea de tiempo recalculada con el core, como en la sesión (no se guarda).
 * Android/iOS hacen las mismas lecturas con el SDK.
 */
export const getPracticeResult = cache(
  async (
    sessionId: string,
    userId: string,
    profileRole: DanceRole | null,
  ): Promise<PracticeResultData | null> => {
    if (!isUuid(sessionId)) return null;
    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from("practice_sessions")
      .select(
        `id, plan, style_id, song_id,
         style:dance_styles(name, has_roles, beats_per_phrase, spoken_beats, call_beat, call_span_beats, lead_in_phrases),
         song:songs(title, beat_grid),
         practice_session_steps(step_id, phrases, step:steps(slug, name))`,
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("mode", "free")
      .maybeSingle();
    if (error) throw new Error(`practice_sessions: ${error.message}`);
    // Ajena, inexistente, de una lección o con estilo/canción que ya no ve → 404.
    if (!session?.style || !session.song) return null;

    const plan = parseStoredPlan(session.plan);
    const beatGrid = parseBeatGrid(session.song.beat_grid);
    // `plan-session` ya validó plan y rejilla al crearla: si no están, es un dato roto.
    if (!plan || plan.length === 0 || !beatGrid) {
      throw new Error("practice_sessions: plan o rejilla inválidos");
    }

    const { style } = session;
    const sessionSteps = session.practice_session_steps;
    const stepIds = sessionSteps.map((s) => s.step_id);
    // Estilo sin roles: una tarjeta por paso con rol `leader` (D051).
    const cardRole: DanceRole | null = style.has_roles ? profileRole : "leader";

    const [reviews, cards] = await Promise.all([
      supabase
        .from("step_reviews")
        .select("step_id, rating")
        // El admin lee los repasos de todos (RLS): solo los suyos.
        .eq("user_id", userId)
        .eq("session_id", sessionId),
      stepIds.length > 0 && cardRole
        ? supabase
            .from("srs_cards")
            .select("step_id, due_at")
            .eq("user_id", userId)
            .in("step_id", stepIds)
            .eq("role", cardRole)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (reviews.error)
      throw new Error(`step_reviews: ${reviews.error.message}`);
    if (cards.error) throw new Error(`srs_cards: ${cards.error.message}`);

    const dueByStep = new Map(
      (cards.data ?? []).map((c) => [c.step_id, c.due_at]),
    );
    const names = Object.fromEntries(
      sessionSteps.map((s) => [
        s.step_id,
        { slug: s.step?.slug ?? s.step_id, name: s.step?.name ?? UNKNOWN_STEP },
      ]),
    );
    // Orden de aparición en el plan.
    const firstAt = new Map<string, number>();
    plan.forEach((p, i) => {
      if (!firstAt.has(p.stepId)) firstAt.set(p.stepId, i);
    });
    const steps: ResultStep[] = [...sessionSteps]
      .sort(
        (a, b) =>
          (firstAt.get(a.step_id) ?? Number.MAX_SAFE_INTEGER) -
          (firstAt.get(b.step_id) ?? Number.MAX_SAFE_INTEGER),
      )
      .map((s) => ({
        id: s.step_id,
        name: names[s.step_id].name,
        phrases: s.phrases,
        dueAt: dueByStep.get(s.step_id) ?? null,
      }));

    const saved = (reviews.data ?? []).flatMap((r) =>
      isRating(r.rating) ? [{ stepId: r.step_id, rating: r.rating }] : [],
    );

    const timeline = recomputeTimeline(
      {
        beatsPerPhrase: style.beats_per_phrase,
        spokenBeats: style.spoken_beats,
        callBeat: style.call_beat,
        callSpanBeats: style.call_span_beats,
        leadInPhrases: style.lead_in_phrases,
      },
      beatGrid,
      plan,
      names,
    );

    return {
      sessionId: session.id,
      styleId: session.style_id,
      styleName: style.name,
      songId: session.song_id,
      songTitle: session.song.title,
      hasRoles: style.has_roles,
      role: profileRole,
      durationMs: dancedMs(timeline),
      phrases: dancedPhrases(plan),
      steps,
      saved: saved.length > 0 ? saved : null,
    };
  },
);
