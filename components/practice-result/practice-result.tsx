"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { RatingButtons } from "@/components/indicators/rating-buttons";
import { RATING_LABELS } from "@/components/indicators/rating-labels";
import { FullscreenShell } from "@/components/layout/fullscreen-shell";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import {
  parseReviewCards,
  ratingProblem,
  returnDay,
} from "@/lib/lesson/lesson";
import { formatDuration, practiceHref } from "@/lib/practice/config";
import { edgeResultPorts } from "@/lib/practice-result/invoke";
import {
  buildPracticeReview,
  type PracticeResultData,
  type PracticeResultPorts,
  RESULT_LINKS,
  type ResultLine,
  type ResultStep,
  resultLines,
  type SavedReview,
  saveBlocker,
  splitSteps,
} from "@/lib/practice-result/result";
import type { SrsRating } from "@/supabase/functions/_shared/core/srs";
import { resultCopy } from "./copy";

export type PracticeResultProps = {
  data: PracticeResultData;
  /** Backend del resultado; la muestra pasa uno falso. */
  ports?: PracticeResultPorts;
  exitHref?: string;
  homeHref?: string;
  /** "Otra vez"; por defecto, el configurador con la misma canción y estilo. */
  againHref?: string;
  /** Reloj y zona fijos (muestra); por defecto, ahora y la zona del dispositivo. */
  now?: string;
  timeZone?: string;
  /** Muestra: pliegue de los opcionales abierto de entrada. */
  initialExpanded?: boolean;
};

type Saved = {
  reviews: SavedReview[];
  cards: { stepId: string; role: string; dueAt: string }[];
  /** `true` si se guardó ahora (no al cargar una sesión ya calificada). */
  justNow: boolean;
};

const TITLE_ID = "practice-result-title";
const SAVED_ID = "practice-result-saved";

/**
 * Práctica · resultado (handoff § Práctica · resultado, pantallas.md): columna de 640, X arriba a
 * la derecha, eyebrow, h1 con la canción y 3 datos con bordes. Calificación 1–4 por paso distinto
 * (D099: sin intervalos): los vencidos son obligatorios; los que no vencen van plegados y son
 * opcionales. Guardar → `review-steps` (context `practice`) y la misma pantalla pasa a mostrar la
 * fecha de regreso de cada paso (D125). Una sesión ya calificada se muestra así, sin recalificar.
 */
export function PracticeResult({
  data,
  ports = edgeResultPorts,
  exitHref = RESULT_LINKS.practice,
  homeHref = RESULT_LINKS.home,
  againHref = practiceHref({ styleId: data.styleId, songId: data.songId }),
  now: fixedNow,
  timeZone,
  initialExpanded = false,
}: PracticeResultProps) {
  const router = useRouter();
  const [now] = useState(() => (fixedNow ? new Date(fixedNow) : new Date()));
  const [saved, setSaved] = useState<Saved | null>(() =>
    data.saved ? { reviews: data.saved, cards: [], justNow: false } : null,
  );

  // Al guardar, el foco va al título del resumen (el formulario desaparece).
  const savedRef = useRef<HTMLHeadingElement>(null);
  const focusSaved = useRef(false);
  useEffect(() => {
    if (saved && focusSaved.current) {
      focusSaved.current = false;
      savedRef.current?.focus();
    }
  }, [saved]);

  return (
    <FullscreenShell
      bar={
        <>
          <span className="flex-1" />
          <IconButton asChild variant="outline" aria-label={resultCopy.close}>
            <Link href={exitHref}>
              <X aria-hidden="true" strokeWidth={ICON_STROKE} />
            </Link>
          </IconButton>
        </>
      }
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="type-eyebrow text-gold-700">
            {resultCopy.eyebrow(data.styleName)}
          </p>
          <h1
            id={TITLE_ID}
            tabIndex={-1}
            className="type-h1 break-words focus:outline-none"
          >
            {data.songTitle}
          </h1>
        </header>

        <Stats data={data} />

        {saved ? (
          <SavedView
            lines={resultLines(data, saved.reviews, saved.cards)}
            justNow={saved.justNow}
            headingRef={savedRef}
            now={now}
            timeZone={timeZone}
            againHref={againHref}
            homeHref={homeHref}
          />
        ) : (
          <RatingForm
            data={data}
            ports={ports}
            now={now}
            againHref={againHref}
            initialExpanded={initialExpanded}
            onSaved={(reviews, cards) => {
              focusSaved.current = true;
              setSaved({ reviews, cards, justNow: true });
              // Inicio y Curso leen las tarjetas nuevas.
              router.refresh();
            }}
          />
        )}
      </div>
    </FullscreenShell>
  );
}

/** Duración, pasos distintos y frases, en fila con filete arriba y abajo. */
function Stats({ data }: { data: PracticeResultData }) {
  const items = [
    [resultCopy.stats.duration, formatDuration(data.durationMs)],
    [resultCopy.stats.steps, String(data.steps.length)],
    [resultCopy.stats.phrases, String(data.phrases)],
  ] as const;
  return (
    <dl
      aria-label={resultCopy.stats.label}
      className="grid grid-cols-3 border-y border-divider"
    >
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-1 py-4 pr-3">
          <dt className="type-overline text-text-secondary">{label}</dt>
          <dd className="type-h3 tabular-nums text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RatingForm({
  data,
  ports,
  now,
  againHref,
  initialExpanded,
  onSaved,
}: {
  data: PracticeResultData;
  ports: PracticeResultPorts;
  now: Date;
  againHref: string;
  initialExpanded: boolean;
  onSaved: (
    reviews: SavedReview[],
    cards: { stepId: string; role: string; dueAt: string }[],
  ) => void;
}) {
  const [choices, setChoices] = useState<Record<string, SrsRating>>({});
  const [expanded, setExpanded] = useState(initialExpanded);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<
    "subscription" | "offline" | "error" | null
  >(null);
  const hintId = useId();
  const optionalId = useId();
  const { due, optional } = splitSteps(data.steps, now);
  // Sin vencidos no hay nada que plegar: los opcionales se ven de entrada.
  const showOptional = due.length === 0 || expanded;
  const blocker = saveBlocker(data.steps, choices, now);

  const choose = (id: string, rating: SrsRating | null) =>
    setChoices((c) => {
      const next = { ...c };
      if (rating === null) delete next[id];
      else next[id] = rating;
      return next;
    });

  const submit = async () => {
    if (blocker || sending) return;
    setSending(true);
    setProblem(null);
    const request = buildPracticeReview(data, choices, new Date());
    const result = await ports.reviewSteps(request);
    const cards =
      result.status >= 200 && result.status < 300
        ? parseReviewCards(result.body)
        : null;
    setSending(false);
    if (cards) {
      onSaved(
        request.reviews.map((r) => ({ stepId: r.stepId, rating: r.rating })),
        cards,
      );
    } else setProblem(result.status === 200 ? "error" : ratingProblem(result));
  };

  const renderStep = (step: ResultStep, isDue: boolean) => {
    const value = choices[step.id] ?? null;
    return (
      <div key={step.id} className="flex flex-col gap-2">
        <RatingButtons
          name={`rating-${step.id}`}
          legend={step.name}
          hint={isDue ? resultCopy.dueHint : resultCopy.optionalHint}
          value={value}
          onValueChange={(rating) => choose(step.id, rating)}
          disabled={sending}
        />
        {!isDue && value !== null ? (
          <Button
            variant="quiet"
            className="self-start"
            disabled={sending}
            onClick={() => choose(step.id, null)}
          >
            {resultCopy.clear}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <section aria-labelledby="result-rating" className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 id="result-rating" className="type-h2">
          {resultCopy.ratingTitle}
        </h2>
        <p className="type-body text-text-secondary">
          {due.length === 0
            ? resultCopy.ratingIntroNoneDue
            : resultCopy.ratingIntro}
        </p>
      </header>

      {due.length > 0 ? (
        <div className="flex flex-col gap-8">
          {due.map((s) => renderStep(s, true))}
        </div>
      ) : null}

      {optional.length > 0 && due.length > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={optionalId}
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex min-h-12 flex-wrap items-center gap-x-1 self-start rounded-sm text-left type-body"
        >
          <span className="text-text-secondary">
            {resultCopy.more(optional.length)}
          </span>
          <span className="text-text underline decoration-gold-500 decoration-1 underline-offset-5">
            {expanded ? resultCopy.hide : resultCopy.show}
          </span>
        </button>
      ) : null}

      {optional.length > 0 ? (
        <div
          id={optionalId}
          hidden={!showOptional}
          className="flex flex-col gap-8"
        >
          {optional.map((s) => renderStep(s, false))}
        </div>
      ) : null}

      {/* Error y motivo entran y salen con la altura animada (D103). */}
      <Reveal show={Boolean(problem)}>
        {problem ? (
          <Alert variant="error">
            <AlertContent>
              <AlertDescription>{resultCopy.error[problem]}</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}
      </Reveal>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href={againHref}>{resultCopy.again}</Link>
          </Button>
          <Button
            size="lg"
            disabled={Boolean(blocker)}
            aria-describedby={blocker ? hintId : undefined}
            loading={sending}
            loadingText={resultCopy.saving}
            onClick={submit}
          >
            {resultCopy.save}
          </Button>
        </div>
        <Reveal show={Boolean(blocker)}>
          <p id={hintId} className="type-small text-text-secondary">
            {blocker?.kind === "due"
              ? resultCopy.blocker.due(blocker.missing)
              : resultCopy.blocker.none}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function returnText(dueAt: string | null, now: Date, timeZone?: string) {
  const day = returnDay(dueAt, now, timeZone);
  if (day === null) return resultCopy.noDate;
  if (day === "today") return resultCopy.returnsToday;
  if (day === "tomorrow") return resultCopy.returnsTomorrow;
  return resultCopy.returnsOn(day.date);
}

/** Lo guardado: calificación y fecha de regreso por paso; "Otra vez" · "Terminar" (→ Inicio). */
function SavedView({
  lines,
  justNow,
  headingRef,
  now,
  timeZone,
  againHref,
  homeHref,
}: {
  lines: ResultLine[];
  justNow: boolean;
  headingRef: React.Ref<HTMLHeadingElement>;
  now: Date;
  timeZone?: string;
  againHref: string;
  homeHref: string;
}) {
  return (
    <section aria-labelledby={SAVED_ID} className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2
          id={SAVED_ID}
          ref={headingRef}
          tabIndex={-1}
          className="type-h2 focus:outline-none"
        >
          {resultCopy.savedTitle}
        </h2>
        <p className="type-body text-text-secondary">
          {justNow ? resultCopy.savedNow : resultCopy.savedBefore}
        </p>
      </header>
      <ul className="flex flex-col border-t border-divider">
        {lines.map((l) => (
          <li
            key={l.stepId}
            className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-divider py-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="type-body text-text">{l.name}</span>
              <span className="type-small text-text-secondary">
                {l.rating === null
                  ? resultCopy.notRated
                  : RATING_LABELS[l.rating]}
              </span>
            </span>
            <span className="type-small text-text-secondary">
              {returnText(l.dueAt, now, timeZone)}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" size="lg">
          <Link href={againHref}>{resultCopy.again}</Link>
        </Button>
        <Button asChild size="lg">
          <Link href={homeHref}>{resultCopy.finish}</Link>
        </Button>
      </div>
    </section>
  );
}
