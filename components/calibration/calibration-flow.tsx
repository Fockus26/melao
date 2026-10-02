"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MAIN_ID, SkipLink } from "@/components/layout/skip-link";
import { IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { signInPathFor } from "@/lib/auth/redirect";
import { CalibrationAudio } from "@/lib/calibration/audio";
import {
  type AudioOutput,
  CALIBRATION_CLICKS,
  CALIBRATION_INTERVAL_MS,
  CALIBRATION_MEASURED_TAPS,
  CALIBRATION_PATH,
  type CalibrationResult,
  clampLatencyMs,
  deviceFor,
  evaluateCalibration,
  type SavedLatency,
  tapOffsetsMs,
} from "@/lib/calibration/calibration";
import { createClient } from "@/lib/supabase/client";
import { calibrationCopy as COPY } from "./copy";
import {
  BeforeScreen,
  FineScreen,
  IrregularScreen,
  ListenScreen,
  ResultScreen,
  type SaveState,
  SpeakerScreen,
} from "./screens";

/** Primer clic a 1.2 s del toque en Empezar: da tiempo a soltar y prepararse. */
const LEAD_S = 1.2;
/** Un toque antes de esto (respecto del primer clic) no puede ser respuesta a nada: se ignora. */
const EARLY_S = 0.25;
/** Tras el último clic se esperan los toques que falten (Bluetooth llega a ~0.4 s). */
const DEADLINE_S = 1.2;
const STEPS = 3;

export type CalibrationPhase =
  | { kind: "before" }
  | { kind: "speaker" }
  | { kind: "listen"; taps: number }
  | { kind: "result"; result: CalibrationResult & { offsetMs: number } }
  | { kind: "fine"; value: number; result: CalibrationResult | null }
  | { kind: "irregular"; result: CalibrationResult };

const STEP_OF: Record<CalibrationPhase["kind"], number> = {
  before: 1,
  speaker: 1,
  listen: 2,
  result: 3,
  fine: 3,
  irregular: 3,
};

export type CalibrationFlowProps = {
  /** Ajustes web guardados, el más reciente primero (el que usa la sesión, D124). */
  saved: readonly SavedLatency[];
  /** Cerrar, Listo y después de guardar. */
  closeHref: string;
  /** `sample`: la muestra de `/layouts/calibration`; suena igual pero no guarda nada. */
  mode?: "live" | "sample";
  /** Estado inicial (solo la muestra). */
  initialPhase?: CalibrationPhase;
};

/**
 * Calibrar audífonos (handoff § Calibrar, D142–D144): pregunta con qué escucha, pone 12 clics a
 * 100 BPM en el reloj de audio, compara cada toque con su clic y resume con el core
 * (`evaluateCalibration`). Guardar = `save_audio_latency()` (upsert por dispositivo con la hora
 * del servidor). La medición es a oído: el botón no da ninguna señal visual del clic.
 */
export function CalibrationFlow({
  saved,
  closeHref,
  mode = "live",
  initialPhase = { kind: "before" },
}: CalibrationFlowProps) {
  const router = useRouter();
  const [audio] = useState(() => new CalibrationAudio());
  const [phase, setPhase] = useState<CalibrationPhase>(initialPhase);
  const [output, setOutput] = useState<AudioOutput>("bluetooth");
  const [audioError, setAudioError] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const run = useRef<{ clicks: number[]; taps: number[] } | null>(null);
  const frame = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const tapButton = useRef<HTMLButtonElement>(null);
  const shownKind = useRef(initialPhase.kind);

  // Al cambiar de estado, el foco va a su título; al medir, al botón de toque (Espacio y Enter
  // también cuentan). Al cargar la página no se mueve (por el estado ya mostrado y no por "ya
  // montado": en desarrollo el efecto corre dos veces al montar).
  useEffect(() => {
    if (shownKind.current === phase.kind) return;
    shownKind.current = phase.kind;
    (phase.kind === "listen" ? tapButton : heading).current?.focus();
  }, [phase.kind]);

  // Al salir de la pantalla no queda nada sonando ni el contexto abierto.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      audio.close();
    },
    [audio],
  );

  function finish() {
    cancelAnimationFrame(frame.current);
    audio.stop();
    const current = run.current;
    run.current = null;
    if (!current) return;
    const result = evaluateCalibration(
      tapOffsetsMs(
        current.taps.map((s) => s * 1000),
        current.clicks.map((s) => s * 1000),
      ),
    );
    setSave({ kind: "idle" });
    setPhase(
      result.status === "ok" && result.offsetMs !== null
        ? { kind: "result", result: { ...result, offsetMs: result.offsetMs } }
        : { kind: "irregular", result },
    );
  }

  /** Empieza (o reinicia) la medición. Dentro del toque: despierta el audio (D122). */
  async function start() {
    cancelAnimationFrame(frame.current);
    run.current = null;
    setAudioError(false);
    try {
      await audio.wake();
    } catch {
      setAudioError(true);
      return;
    }
    const clicks = audio.scheduleClicks(
      CALIBRATION_CLICKS,
      CALIBRATION_INTERVAL_MS / 1000,
      LEAD_S,
    );
    run.current = { clicks, taps: [] };
    setPhase({ kind: "listen", taps: 0 });
    // "Empezar de nuevo" no cambia de estado: el foco vuelve al botón de toque a mano.
    tapButton.current?.focus();
    const deadline = (clicks.at(-1) ?? 0) + DEADLINE_S;
    // Solo vigila el reloj de audio para cerrar si faltan toques; los clics ya están programados.
    const loop = () => {
      const now = audio.now();
      if (now !== null && now >= deadline) {
        finish();
        return;
      }
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }

  /** Un toque (puntero, Espacio o Enter), con el `timeStamp` del evento. */
  function tap(eventTimeStamp: number) {
    const current = run.current;
    if (!current) return;
    const t = audio.tapTime(eventTimeStamp);
    if (t === null || t < (current.clicks[0] ?? 0) - EARLY_S) return;
    current.taps.push(t);
    setPhase({ kind: "listen", taps: current.taps.length });
    if (current.taps.length >= CALIBRATION_CLICKS) finish();
  }

  async function persist(offsetMs: number, result: CalibrationResult | null) {
    setSave({ kind: "saving" });
    if (mode === "sample") {
      setSave({ kind: "saved" });
      return;
    }
    const device = deviceFor(output, navigator.userAgent);
    const { error } = await createClient().rpc("save_audio_latency", {
      p_platform: "web",
      p_device_key: device.key,
      p_device_label: device.label,
      p_offset_ms: offsetMs,
      p_sd_ms: result?.sdMs ?? null,
      p_taps: result ? CALIBRATION_MEASURED_TAPS : null,
    });
    if (error) {
      if (error.code === "PGRST301" || error.message.includes("JWT")) {
        router.replace(signInPathFor(CALIBRATION_PATH));
        return;
      }
      setSave({ kind: "error" });
      return;
    }
    router.push(closeHref);
  }

  function toFine(result: CalibrationResult | null) {
    setSave({ kind: "idle" });
    setPhase({
      kind: "fine",
      value: clampLatencyMs(result?.offsetMs ?? saved[0]?.offsetMs ?? 0),
      result,
    });
  }

  const step = STEP_OF[phase.kind];
  let content: React.ReactNode;
  switch (phase.kind) {
    case "before":
      content = (
        <BeforeScreen
          headingRef={heading}
          output={output}
          onOutput={setOutput}
          audioError={audioError}
          onStart={() => {
            if (output === "speaker") setPhase({ kind: "speaker" });
            else void start();
          }}
        />
      );
      break;
    case "speaker":
      content = (
        <SpeakerScreen
          headingRef={heading}
          saved={saved}
          closeHref={closeHref}
          audioError={audioError}
          onCalibrate={() => void start()}
        />
      );
      break;
    case "listen":
      content = (
        <ListenScreen
          headingRef={heading}
          tapRef={tapButton}
          taps={phase.taps}
          audioError={audioError}
          onTap={tap}
          onRestart={() => void start()}
        />
      );
      break;
    case "result":
      content = (
        <ResultScreen
          headingRef={heading}
          audio={audio}
          result={phase.result}
          save={save}
          onSave={() => void persist(phase.result.offsetMs, phase.result)}
          onRepeat={() => void start()}
          onFine={() => toFine(phase.result)}
        />
      );
      break;
    case "fine":
      content = (
        <FineScreen
          headingRef={heading}
          audio={audio}
          value={phase.value}
          onValue={(value) => setPhase({ ...phase, value })}
          save={save}
          onSave={() => void persist(phase.value, phase.result)}
          onRepeat={() => void start()}
        />
      );
      break;
    default:
      content = (
        <IrregularScreen
          headingRef={heading}
          result={phase.result}
          onRepeat={() => void start()}
          onManual={() => toFine(null)}
        />
      );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SkipLink />
      <div className="mx-auto flex w-full max-w-97.5 flex-1 flex-col px-6 pt-3 pb-[calc(var(--spacing-6)+env(safe-area-inset-bottom))]">
        <header className="flex min-h-12 items-center justify-between gap-3">
          <IconButton asChild variant="outline" aria-label={COPY.close}>
            <Link href={closeHref}>
              <X aria-hidden="true" strokeWidth={ICON_STROKE} />
            </Link>
          </IconButton>
          <p className="type-small text-text-secondary tabular-nums">
            <span aria-hidden="true">{COPY.stepOf(step, STEPS)}</span>
            <span className="sr-only">{COPY.stepOfLabel(step, STEPS)}</span>
          </p>
        </header>
        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col pt-6 focus:outline-none"
        >
          {content}
        </main>
      </div>
    </div>
  );
}
