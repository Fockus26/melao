"use client";

import {
  Bluetooth,
  CircleCheck,
  Ear,
  Hand,
  Minus,
  Plus,
  Speaker,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { LocalDate } from "@/components/profile/local-date";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import type { CalibrationAudio } from "@/lib/calibration/audio";
import {
  type AudioOutput,
  CALIBRATION_CLICKS,
  type CalibrationResult,
  formatOffset,
  LATENCY_MAX_MS,
  LATENCY_MIN_MS,
  LATENCY_STEP_MS,
  OUTPUT_LABELS,
  type SavedLatency,
  stepLatencyMs,
} from "@/lib/calibration/calibration";
import { cn } from "@/lib/utils";
import { calibrationCopy as COPY } from "./copy";
import { CountTest } from "./count-test";
import { TapChart } from "./tap-chart";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error" };

type HeadingRef = React.Ref<HTMLHeadingElement>;

/** Título del estado: recibe el foco al llegar (`tabIndex=-1`, sin anillo propio). */
function Title({
  headingRef,
  className,
  children,
}: {
  headingRef: HeadingRef;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className={cn("focus:outline-none", className)}
    >
      {children}
    </h1>
  );
}

function AudioError({ show }: { show: boolean }) {
  return show ? <Alert variant="error">{COPY.audioError}</Alert> : null;
}

function SaveMessage({ save }: { save: SaveState }) {
  if (save.kind === "error")
    return <Alert variant="error">{COPY.saveError}</Alert>;
  if (save.kind === "saved")
    return <Alert variant="success">{COPY.saved}</Alert>;
  return null;
}

/** Fila de 64 con ícono de 48 (handoff § Calibrar 1). */
function InfoRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Ear;
  title: string;
  text: string;
}) {
  return (
    <li className="flex min-h-16 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-sunken"
      >
        <Icon strokeWidth={ICON_STROKE} className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="type-h5">{title}</span>
        <span className="type-small text-text-secondary">{text}</span>
      </span>
    </li>
  );
}

// ── 1 · Antes de empezar ─────────────────────────────────────────────────────

const OUTPUT_OPTIONS: readonly {
  value: AudioOutput;
  icon: typeof Ear;
  help: string;
}[] = [
  { value: "bluetooth", icon: Bluetooth, help: COPY.outputBluetoothHelp },
  { value: "speaker", icon: Speaker, help: COPY.outputSpeakerHelp },
];

/**
 * Antes de empezar. La web no sabe con certeza si hay audífonos Bluetooth (D143): en vez de
 * "detectados", la primera fila pregunta con qué va a escuchar. Altavoz → "Sin audífonos".
 */
export function BeforeScreen({
  headingRef,
  output,
  onOutput,
  audioError,
  onStart,
}: {
  headingRef: HeadingRef;
  output: AudioOutput;
  onOutput: (output: AudioOutput) => void;
  audioError: boolean;
  onStart: () => void;
}) {
  const questionId = useId();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="type-eyebrow text-text-secondary">{COPY.eyebrow}</p>
        <Title headingRef={headingRef} className="type-display">
          {COPY.title}
        </Title>
        <span aria-hidden="true" className="block h-px w-12 bg-gold-500" />
        <p className="type-body text-text-secondary">{COPY.intro}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 id={questionId} className="type-h4">
          {COPY.outputQuestion}
        </h2>
        <RadioGroup
          aria-labelledby={questionId}
          value={output}
          onValueChange={(v) => onOutput(v as AudioOutput)}
          className="gap-0"
        >
          {OUTPUT_OPTIONS.map(({ value, icon: Icon, help }) => {
            const id = `${questionId}-${value}`;
            return (
              <div key={value} className="flex min-h-16 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-sunken"
                >
                  <Icon strokeWidth={ICON_STROKE} className="size-6" />
                </span>
                <label
                  htmlFor={id}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col py-2"
                >
                  <span className="type-h5">{OUTPUT_LABELS[value]}</span>
                  <span className="type-small text-text-secondary">{help}</span>
                </label>
                <RadioGroupItem id={id} value={value} />
              </div>
            );
          })}
        </RadioGroup>
      </div>
      <ul className="flex flex-col">
        <InfoRow
          icon={Volume2}
          title={COPY.volumeTitle}
          text={COPY.volumeText}
        />
        <InfoRow icon={Ear} title={COPY.earTitle} text={COPY.earText} />
      </ul>
      <div className="mt-auto flex flex-col gap-3">
        <AudioError show={audioError} />
        <p className="type-small text-text-secondary">{COPY.duration}</p>
        <Button size="lg" className="w-full" onClick={onStart}>
          {COPY.start}
        </Button>
      </div>
    </div>
  );
}

// ── 2 · Escucha y toca ───────────────────────────────────────────────────────

/**
 * El botón de 248 no da ninguna señal visual del clic: la medición es a oído. Cuenta el
 * `pointerdown` (antes que el `click`, que llega tarde), Espacio y Enter (sin repetición), y el
 * clic sintético de un lector de pantalla (`detail === 0`). El progreso va en el `progressbar`
 * de 12 puntos, sin región viva: una voz encima de los clics estorbaría la medición.
 */
export function ListenScreen({
  headingRef,
  tapRef,
  taps,
  audioError,
  onTap,
  onRestart,
}: {
  headingRef: HeadingRef;
  tapRef: React.Ref<HTMLButtonElement>;
  taps: number;
  audioError: boolean;
  onTap: (eventTimeStamp: number) => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-2">
        <Title headingRef={headingRef} className="type-h1">
          {COPY.listenTitle}
        </Title>
        <p className="type-body text-text-secondary">{COPY.listenText}</p>
      </div>
      <button
        ref={tapRef}
        type="button"
        onPointerDown={(e) => {
          if (e.button === 0) onTap(e.timeStamp);
        }}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            // Sin `click` después: el toque ya contó en el keydown.
            e.preventDefault();
            onTap(e.timeStamp);
          }
        }}
        onKeyUp={(e) => {
          // Espacio dispara el `click` al soltar: ya contó.
          if (e.key === " ") e.preventDefault();
        }}
        onClick={(e) => {
          // Clic sin puntero ni teclado (lector de pantalla): cuenta ahora.
          if (e.detail === 0) onTap(e.timeStamp);
        }}
        className={cn(
          "flex size-62 shrink-0 touch-manipulation select-none flex-col items-center justify-center gap-3 rounded-pill border border-border-input bg-surface text-text",
          "transition-[border-color,scale] duration-press ease-standard hover:border-text active:scale-97",
          "motion-reduce:transition-none motion-reduce:active:scale-100",
        )}
      >
        <Hand aria-hidden="true" strokeWidth={ICON_STROKE} className="size-8" />
        <span className="type-button-lg">{COPY.tapHere}</span>
      </button>
      <div className="flex flex-col items-center gap-3">
        <div
          role="progressbar"
          aria-label={COPY.tapsLabel}
          aria-valuemin={0}
          aria-valuemax={CALIBRATION_CLICKS}
          aria-valuenow={taps}
          aria-valuetext={COPY.tapValue(taps)}
          className="flex flex-wrap justify-center gap-2"
        >
          {Array.from({ length: CALIBRATION_CLICKS }, (_, i) => (
            <span
              // Posiciones fijas: el índice es su identidad.
              // biome-ignore lint/suspicious/noArrayIndexKey: 12 puntos fijos.
              key={i}
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-pill border border-gold-600",
                i < taps && "bg-gold-600",
              )}
            />
          ))}
        </div>
        <p
          aria-hidden="true"
          className="type-small text-center text-text-secondary"
        >
          {COPY.tapValue(taps)} · {COPY.tapPractice}
        </p>
      </div>
      <AudioError show={audioError} />
      <Button variant="quiet" onClick={onRestart}>
        {COPY.restart}
      </Button>
    </div>
  );
}

// ── 3 · Resultado ────────────────────────────────────────────────────────────

export function ResultScreen({
  headingRef,
  audio,
  result,
  save,
  onSave,
  onRepeat,
  onFine,
}: {
  headingRef: HeadingRef;
  audio: CalibrationAudio;
  result: CalibrationResult & { offsetMs: number };
  save: SaveState;
  onSave: () => void;
  onRepeat: () => void;
  onFine: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Title headingRef={headingRef} className="flex flex-col gap-2">
          <span className="type-eyebrow text-text-secondary">
            {COPY.resultEyebrow}
          </span>
          <span className="type-display-xl tabular-nums">
            {formatOffset(result.offsetMs)}
          </span>
        </Title>
        <p className="type-body text-text-secondary">
          {COPY.resultText(result.offsetMs)}
        </p>
        <p className="flex items-center gap-2 type-small">
          <CircleCheck
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="size-5 shrink-0 text-success"
          />
          {COPY.steady(Math.round(result.sdMs ?? 0))}
        </p>
      </div>
      <TapChart measuredMs={result.measuredMs} meanMs={result.offsetMs} />
      <CountTest audio={audio} offsetMs={result.offsetMs} size="lg" />
      <div className="mt-auto flex flex-col gap-3">
        <SaveMessage save={save} />
        <Button
          size="lg"
          className="w-full"
          onClick={onSave}
          loading={save.kind === "saving"}
          loadingText={COPY.saving}
        >
          {COPY.save}
        </Button>
        <div className="flex flex-wrap justify-center gap-x-4">
          <Button variant="quiet" onClick={onRepeat}>
            {COPY.repeat}
          </Button>
          <Button variant="quiet" onClick={onFine}>
            {COPY.fine}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── 4 · Ajuste fino ──────────────────────────────────────────────────────────

/** Posición de 0 en el riel, en % (marca del handoff). */
const ZERO_PCT = (-LATENCY_MIN_MS / (LATENCY_MAX_MS - LATENCY_MIN_MS)) * 100;

export function FineScreen({
  headingRef,
  audio,
  value,
  onValue,
  save,
  onSave,
  onRepeat,
}: {
  headingRef: HeadingRef;
  audio: CalibrationAudio;
  value: number;
  onValue: (value: number) => void;
  save: SaveState;
  onSave: () => void;
  onRepeat: () => void;
}) {
  const labelId = useId();
  const stepButton = "size-14 shrink-0 rounded-pill px-0 [&_svg]:size-6";
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Title headingRef={headingRef} className="type-h1">
          {COPY.fineTitle}
        </Title>
        <p className="type-body text-text-secondary">{COPY.fineText}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p id={labelId} className="type-h5">
          {COPY.fineLabel}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className={stepButton}
            aria-label={COPY.fineDown}
            disabled={value <= LATENCY_MIN_MS}
            onClick={() => onValue(stepLatencyMs(value, -1))}
          >
            <Minus aria-hidden="true" strokeWidth={ICON_STROKE} />
          </Button>
          <output
            aria-live="polite"
            className="min-w-0 flex-1 text-center type-numeric-lg"
          >
            {formatOffset(value)}
          </output>
          <Button
            variant="outline"
            className={stepButton}
            aria-label={COPY.fineUp}
            disabled={value >= LATENCY_MAX_MS}
            onClick={() => onValue(stepLatencyMs(value, 1))}
          >
            <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
          </Button>
        </div>
        <Slider
          aria-labelledby={labelId}
          min={LATENCY_MIN_MS}
          max={LATENCY_MAX_MS}
          step={LATENCY_STEP_MS}
          value={[value]}
          onValueChange={([v]) => {
            if (v !== undefined) onValue(v);
          }}
          valueText={COPY.fineValueText}
        />
        <div
          aria-hidden="true"
          className="relative h-5 type-caption text-text-secondary tabular-nums"
        >
          <span className="absolute left-0">
            {formatOffset(LATENCY_MIN_MS)}
          </span>
          <span
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${ZERO_PCT}%` }}
          >
            0
          </span>
          <span className="absolute right-0">
            {formatOffset(LATENCY_MAX_MS)}
          </span>
        </div>
      </div>
      <CountTest audio={audio} offsetMs={value} />
      <div className="mt-auto flex flex-col gap-3">
        <SaveMessage save={save} />
        <Button
          size="lg"
          className="w-full"
          onClick={onSave}
          loading={save.kind === "saving"}
          loadingText={COPY.saving}
        >
          {COPY.fineSave(value)}
        </Button>
        <Button variant="quiet" className="self-center" onClick={onRepeat}>
          {COPY.fineBack}
        </Button>
      </div>
    </div>
  );
}

// ── 5 · Toques irregulares ───────────────────────────────────────────────────

function irregularText(result: CalibrationResult): string {
  switch (result.status) {
    case "incomplete":
      return COPY.irregularBanner.incomplete(result.taps);
    case "out_of_range":
      return COPY.irregularBanner.out_of_range(result.offsetMs ?? 0);
    default:
      return COPY.irregularBanner.irregular(Math.round(result.sdMs ?? 0));
  }
}

export function IrregularScreen({
  headingRef,
  result,
  onRepeat,
  onManual,
}: {
  headingRef: HeadingRef;
  result: CalibrationResult;
  onRepeat: () => void;
  onManual: () => void;
}) {
  const tipsId = useId();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Title headingRef={headingRef} className="type-h1">
        {COPY.irregularTitle}
      </Title>
      <Alert variant="warning">
        <p>{irregularText(result)}</p>
      </Alert>
      <section aria-labelledby={tipsId} className="flex flex-col gap-3">
        <h2 id={tipsId} className="type-h4">
          {COPY.tipsTitle}
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 type-body marker:text-gold-700">
          {COPY.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
      <div className="mt-auto flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={onRepeat}>
          {COPY.repeat}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onManual}
        >
          {COPY.manual}
        </Button>
      </div>
    </div>
  );
}

// ── 6 · Sin audífonos ────────────────────────────────────────────────────────

/** Altavoz o cable: no hace falta calibrar. Lista los ajustes guardados por dispositivo. */
export function SpeakerScreen({
  headingRef,
  saved,
  closeHref,
  audioError,
  onCalibrate,
}: {
  headingRef: HeadingRef;
  saved: readonly SavedLatency[];
  closeHref: string;
  audioError: boolean;
  onCalibrate: () => void;
}) {
  const listId = useId();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="type-eyebrow text-text-secondary">{COPY.eyebrow}</p>
        <Title headingRef={headingRef} className="type-display">
          {COPY.speakerTitle}
        </Title>
        <span aria-hidden="true" className="block h-px w-12 bg-gold-500" />
        <p className="type-body text-text-secondary">{COPY.speakerText}</p>
      </div>
      <section aria-labelledby={listId} className="flex flex-col gap-2">
        <h2 id={listId} className="type-h4">
          {COPY.savedTitle}
        </h2>
        {saved.length === 0 ? (
          <p className="type-small text-text-secondary">{COPY.savedEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-divider">
            {saved.map((row, i) => (
              <li
                key={row.deviceKey}
                className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <span className="flex min-w-0 flex-1 basis-40 flex-col">
                  <span className="type-h5">{row.label}</span>
                  <span className="type-small text-text-secondary">
                    <LocalDate iso={row.measuredAt} />
                    {i === 0 ? ` · ${COPY.savedInUse}` : null}
                  </span>
                </span>
                <span className="type-h5 tabular-nums">
                  {formatOffset(row.offsetMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-auto flex flex-col gap-3">
        <AudioError show={audioError} />
        <Button asChild size="lg" className="w-full">
          <Link href={closeHref}>{COPY.done}</Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onCalibrate}
        >
          {COPY.calibrateAnyway}
        </Button>
      </div>
    </div>
  );
}
