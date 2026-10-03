"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useId, useReducer, useSyncExternalStore } from "react";
import { Difficulty } from "@/components/indicators/difficulty";
import { RATING_LABELS } from "@/components/indicators/rating-labels";
import {
  STEP_STATUS_LABELS,
  type StepStatusValue,
} from "@/components/indicators/step-status";
import { INDICATOR_STROKE } from "@/components/indicators/stroke";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { PROFILE_PATH, signInPathFor } from "@/lib/auth/redirect";
import { difficultyName } from "@/lib/difficulty";
import { PLANS_PATH } from "@/lib/plans/features";
import { dueInDays, STATUS_OPTIONS } from "@/lib/steps/catalog";
import {
  CATEGORY_SINGULAR,
  CONTEXT_LABELS,
  catalogHref,
  dueAtFromCards,
  groupRelated,
  initialStatusState,
  phrasesLabel,
  type StepDetail,
  type StepStatusPort,
  shortDate,
  statusReducer,
  statusRequest,
  statusSaveResult,
  stepHref,
} from "@/lib/steps/detail";
import { edgeStepStatusPort } from "@/lib/steps/detail-invoke";
import type { UserStepsPort } from "@/lib/steps/favorite";
import { cn } from "@/lib/utils";
import {
  STEP_FAVORITE_COPY,
  StepFavoriteButton,
  useStepFavorites,
} from "../step-favorite";
import { detailCopy } from "./copy";
import { StepVideo } from "./step-video";

export type StepDetailViewProps = {
  step: StepDetail;
  /** Estilo actual del alumno (para los enlaces con `?style=` si el paso es de otro). */
  currentStyleId: string | null;
  /** Suscripción activa: sin ella, "Tu estado" se ve pero no se cambia (D036). */
  canChangeStatus: boolean;
  /** En `sample` (muestras de `/layouts`) nada escribe: el estado y el corazón cambian solo aquí. */
  variant?: "live" | "sample";
  userId?: string;
  /** Fija "ahora" (muestras y tests); si no, el reloj del dispositivo. */
  now?: string;
  /** Para tests. */
  statusPort?: StepStatusPort;
  favoritePort?: UserStepsPort;
};

/**
 * Pasos · detalle (App-Paso). Barra con volver y favorito; eyebrow de categoría, nombre,
 * dificultad y duración. En 1 columna (2 desde `lg`): a la izquierda el video por rol y la
 * descripción; a la derecha Tu estado (3 chips que llaman a `review-steps`, optimistas, D141),
 * Por tiempos, Posición, Relacionados (enlaces a su detalle) e Historial con el próximo repaso.
 * Todo lo que tiene reglas viene de `step_detail` (D138–D140).
 */
export function StepDetailView({
  step,
  currentStyleId,
  canChangeStatus,
  variant = "live",
  userId,
  now,
  statusPort,
  favoritePort,
}: StepDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const favorites = useStepFavorites({ userId, variant, port: favoritePort });
  const [status, dispatch] = useReducer(
    statusReducer,
    initialStatusState(step.status, step.dueAt),
  );
  const level = difficultyName(step.difficulty);

  async function changeStatus(next: StepStatusValue) {
    if (!canChangeStatus || status.pending || next === status.shown) return;
    dispatch({ type: "request", status: next });
    if (variant === "sample") {
      dispatch({ type: "saved", status: next, dueAt: sampleDueAt(next, now) });
      return;
    }
    const response = await (statusPort ?? edgeStepStatusPort)
      .reviewSteps(statusRequest(step.id, next))
      .catch(() => ({ status: 0, body: null }));
    const result = statusSaveResult(response);
    if (result === "ok") {
      dispatch({
        type: "saved",
        status: next,
        dueAt: dueAtFromCards(response.body, step.id, step.role),
      });
      // El historial (un "me lo sé" es un repaso) se vuelve a leer del servidor.
      router.refresh();
      return;
    }
    if (result === "unauthorized") {
      router.replace(signInPathFor(`${pathname}${window.location.search}`));
      return;
    }
    dispatch({ type: "failed", problem: result });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="-my-2 flex items-center justify-between gap-2">
        <Button asChild variant="quiet" className="no-underline">
          <Link href={catalogHref(step.styleId, currentStyleId)}>
            <ArrowLeft aria-hidden="true" strokeWidth={ICON_STROKE} />
            <span>
              <span className="sr-only">{detailCopy.backSr}</span>
              {detailCopy.back}
            </span>
          </Link>
        </Button>
        <StepFavoriteButton
          name={step.name}
          favorite={favorites.isFavorite(step)}
          onToggle={() => favorites.toggle(step)}
        />
      </div>

      <Reveal show={favorites.error}>
        <Alert variant="error">
          <AlertContent>
            <AlertDescription>{STEP_FAVORITE_COPY.error}</AlertDescription>
          </AlertContent>
        </Alert>
      </Reveal>

      <header className="flex flex-col gap-3 border-b border-divider pb-4">
        <p className="type-eyebrow text-gold-700">
          {CATEGORY_SINGULAR[step.category]}
        </p>
        <h1 className="type-display break-words">{step.name}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 type-small text-text-secondary">
          <Difficulty level={step.difficulty} label={level ?? undefined} />
          <span className="tabular-nums">{phrasesLabel(step.phrases)}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-8">
          <StepVideo step={step} />
          {step.description ? (
            <Section title={detailCopy.description}>
              <p className="type-body text-text">{step.description}</p>
            </Section>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <StatusSection
            status={status.shown}
            pending={status.pending}
            canChange={canChangeStatus}
            problem={status.problem}
            onChange={changeStatus}
          />
          <BeatsSection step={step} />
          <PositionSection step={step} />
          <RelatedSection step={step} currentStyleId={currentStyleId} />
          <HistorySection step={step} dueAt={status.dueAt} now={now} />
        </div>
      </div>
    </div>
  );
}

/** En la muestra: "me lo sé" vuelve en 9 días; "aprendiendo", hoy; "no lo sé", sin tarjeta. */
function sampleDueAt(status: StepStatusValue, now?: string): string | null {
  const base = now ? Date.parse(now) : Date.now();
  if (status === "known") return new Date(base + 9 * 86_400_000).toISOString();
  if (status === "learning") return new Date(base).toISOString();
  return null;
}

function Section({
  title,
  children,
  describedBy,
}: {
  title: string;
  children: ReactNode;
  describedBy?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      aria-describedby={describedBy}
      className="flex flex-col gap-4"
    >
      <h2 id={id} className="border-l-2 border-gold-500 pl-3 type-h4">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Relleno del círculo del estado (como StepStatus), en `currentColor` para el chip marcado. */
const DOT_FILL: Record<StepStatusValue, string> = {
  unknown: "bg-transparent",
  learning: "bg-linear-to-r from-current from-50% to-transparent to-50%",
  known: "bg-current",
};

function StatusSection({
  status,
  pending,
  canChange,
  problem,
  onChange,
}: {
  status: StepStatusValue;
  pending: boolean;
  canChange: boolean;
  problem: ReturnType<typeof statusReducer>["problem"];
  onChange: (status: StepStatusValue) => void;
}) {
  const ids = { title: useId(), hint: useId(), notice: useId() };
  const blocked = !canChange || problem === "subscription";
  const notice = blocked
    ? detailCopy.statusProblem.subscription
    : problem === "role"
      ? detailCopy.statusProblem.role
      : null;
  const failure =
    problem === "offline" || problem === "error"
      ? detailCopy.statusProblem[problem]
      : null;

  return (
    <section aria-labelledby={ids.title} className="flex flex-col gap-4">
      <h2 id={ids.title} className="border-l-2 border-gold-500 pl-3 type-h4">
        {detailCopy.status}
      </h2>
      <p id={ids.hint} className="type-small text-text-secondary">
        {detailCopy.statusHint}
      </p>
      <fieldset
        aria-labelledby={ids.title}
        aria-describedby={notice ? `${ids.hint} ${ids.notice}` : ids.hint}
        aria-busy={pending || undefined}
        className="m-0 grid min-w-0 grid-cols-1 gap-2 border-0 p-0 min-[360px]:grid-cols-3"
      >
        {STATUS_OPTIONS.map((value) => {
          const pressed = value === status;
          const disabled = blocked || pending;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (!disabled) onChange(value);
              }}
              className={cn(
                "relative flex min-h-12 items-center justify-center gap-2 rounded-md border px-2 py-2 text-center type-small",
                "min-[360px]:flex-col min-[360px]:gap-1.5",
                "transition-colors duration-state ease-standard motion-reduce:transition-none",
                pressed
                  ? "border-primary bg-primary font-semibold text-on-primary"
                  : "border-border-input text-text",
                !pressed && !disabled && "hover:bg-hover",
                disabled && "cursor-not-allowed",
                pending && pressed && "cursor-progress",
              )}
            >
              {pressed ? (
                <Check
                  aria-hidden="true"
                  strokeWidth={ICON_STROKE}
                  className="absolute top-1 right-1 size-3.5"
                />
              ) : null}
              <span
                aria-hidden="true"
                style={{ borderWidth: INDICATOR_STROKE }}
                className={cn(
                  "size-3 shrink-0 rounded-pill border-solid border-current",
                  DOT_FILL[value],
                )}
              />
              {STEP_STATUS_LABELS[value]}
            </button>
          );
        })}
      </fieldset>
      <p aria-live="polite" className="sr-only">
        {pending ? detailCopy.saving : ""}
      </p>
      <Reveal show={notice !== null}>
        {notice ? (
          <Alert id={ids.notice} variant="info">
            <AlertContent>
              <AlertTitle>{notice.title}</AlertTitle>
              <AlertDescription>{notice.text}</AlertDescription>
            </AlertContent>
            <AlertAction>
              <Button asChild variant="outline">
                <Link href={blocked ? PLANS_PATH : PROFILE_PATH}>
                  {notice.action}
                </Link>
              </Button>
            </AlertAction>
          </Alert>
        ) : null}
      </Reveal>
      <Reveal show={failure !== null}>
        {failure ? (
          <Alert variant="error">
            <AlertContent>
              <AlertDescription>{failure}</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}
      </Reveal>
    </section>
  );
}

function BeatsSection({ step }: { step: StepDetail }) {
  return (
    <Section title={detailCopy.byBeats}>
      {step.beatNotes.length > 0 ? (
        <dl className="flex flex-col border-t border-divider">
          {step.beatNotes.map((n) => (
            <div
              key={n.beat}
              className="flex min-h-12 items-baseline gap-4 border-b border-divider py-3"
            >
              <dt className="w-8 shrink-0 type-h4 tabular-nums text-gold-700">
                <span className="sr-only">{detailCopy.beat(n.beat)}</span>
                <span aria-hidden="true">{n.beat}</span>
              </dt>
              <dd className="min-w-0 type-body text-text">{n.note}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="type-body text-text-secondary">
          {detailCopy.noBeatNotes}
        </p>
      )}
    </Section>
  );
}

function PositionSection({ step }: { step: StepDetail }) {
  const card = (label: string, name: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-divider bg-surface p-4">
      <dt className="type-caption text-text-secondary">{label}</dt>
      <dd className="type-h4 break-words text-text">{name}</dd>
    </div>
  );
  return (
    <Section title={detailCopy.position}>
      <dl className="flex items-stretch gap-2">
        {card(detailCopy.start, step.startPosition)}
        <ArrowRight
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-5 shrink-0 self-center text-text-secondary"
        />
        {card(detailCopy.end, step.endPosition)}
      </dl>
    </Section>
  );
}

function RelatedSection({
  step,
  currentStyleId,
}: {
  step: StepDetail;
  currentStyleId: string | null;
}) {
  const groups = groupRelated(step.related);
  return (
    <Section title={detailCopy.related}>
      {groups.length === 0 ? (
        <p className="type-body text-text-secondary">{detailCopy.noRelated}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.relation} className="flex flex-col gap-2">
              <h3 className="type-overline text-text-secondary">
                {detailCopy.relations[g.relation]}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {g.steps.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={stepHref(r.slug, step.styleId, currentStyleId)}
                      className={cn(
                        "inline-flex min-h-12 items-center rounded-pill border border-border-input px-4 type-small text-text",
                        "transition-colors duration-hover ease-standard hover:border-text hover:bg-hover motion-reduce:transition-none",
                      )}
                    >
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

const noop = () => () => {};

/**
 * Texto que depende del día del dispositivo: el servidor (y la hidratación) lo escriben en
 * UTC, igual en los dos lados; después React lo cambia a la zona local (como el catálogo).
 */
function useLocalText(format: (timeZone?: string) => string): string {
  return useSyncExternalStore(
    noop,
    () => format(),
    () => format("UTC"),
  );
}

function nextReviewText(
  dueAt: string | null,
  now: Date,
  timeZone?: string,
): string {
  const days = dueInDays(dueAt, now, timeZone);
  // Copy provisional (CONTENT_CHECKLIST fila 78).
  if (days === null) return detailCopy.noCard;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function HistorySection({
  step,
  dueAt,
  now,
}: {
  step: StepDetail;
  dueAt: string | null;
  now?: string;
}) {
  const at = () => (now ? new Date(now) : new Date());
  const next = useLocalText((tz) => nextReviewText(dueAt, at(), tz));
  return (
    <Section title={detailCopy.history}>
      <dl className="flex min-h-11 items-center justify-between gap-4 rounded-md bg-surface-sunken px-4 py-2">
        <dt className="type-small text-text-secondary">
          {detailCopy.nextReview}
        </dt>
        <dd className="type-small font-semibold tabular-nums text-text">
          {next}
        </dd>
      </dl>
      {step.history.length === 0 ? (
        <p className="type-body text-text-secondary">{detailCopy.noHistory}</p>
      ) : (
        <ol className="flex flex-col border-t border-divider">
          {step.history.map((h) => (
            <HistoryRow
              key={`${h.reviewedAt}-${h.role}`}
              entry={h}
              showRole={!step.free}
              now={now}
            />
          ))}
        </ol>
      )}
    </Section>
  );
}

function HistoryRow({
  entry,
  showRole,
  now,
}: {
  entry: StepDetail["history"][number];
  showRole: boolean;
  now?: string;
}) {
  const at = () => (now ? new Date(now) : new Date());
  const date = useLocalText((tz) => shortDate(entry.reviewedAt, at(), tz));
  const context = showRole
    ? `${CONTEXT_LABELS[entry.context]}, ${detailCopy.historyRole(entry.role)}`
    : CONTEXT_LABELS[entry.context];
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 border-b border-divider py-2">
      <span className="flex min-w-0 flex-col">
        <span className="type-small font-semibold text-text">
          {RATING_LABELS[entry.rating]}
        </span>
        <span className="type-caption text-text-secondary">{context}</span>
      </span>
      <time
        dateTime={entry.reviewedAt}
        className="shrink-0 type-small tabular-nums text-text-secondary"
      >
        {date}
      </time>
    </li>
  );
}
