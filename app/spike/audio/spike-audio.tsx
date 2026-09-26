"use client";

/**
 * Página del spike de audio (07a·1). Es una herramienta de medición para teléfonos, no
 * diseño Gala: fondo de escenario negro y estilos mínimos. Copy provisional (herramienta
 * interna, no llega al alumno). Protocolo de uso: `docs/spike/audio.md`.
 */

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type CurrentView,
  type EngineSnapshot,
  SpikeEngine,
} from "@/lib/audio/engine";

const BTN =
  "min-h-12 rounded-md border-2 border-white px-4 py-2 font-semibold text-white disabled:border-neutral-600 disabled:text-neutral-400 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300";
const BTN_PRIMARY =
  "min-h-12 rounded-md border-2 border-white bg-white px-4 py-2 font-semibold text-black disabled:border-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-400 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300";
const INPUT =
  "min-h-12 w-full rounded-md border-2 border-neutral-400 bg-black px-3 text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300";
const CHECK =
  "size-5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300";
const SECTION = "space-y-3 border-t border-neutral-700 pt-5";

const STATE_TEXT: Record<EngineSnapshot["state"], string> = {
  idle: "Sin audio. Prepara una pista.",
  preparing: "Preparando audio…",
  ready: "Listo.",
  playing: "Sonando.",
  paused: "En pausa.",
  interrupted: "Interrumpido por el sistema. Pulsa Reanudar.",
  calibrating: "Calibrando: toca en cada golpe fuerte.",
  ended: "Terminó la pista.",
  error: "Error.",
};

function mb(bytes: number | null | undefined): string {
  return bytes == null ? "—" : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ms(v: number | null | undefined, digits = 1): string {
  return v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)} ms`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-800 py-1">
      <dt className="text-neutral-300">{label}</dt>
      <dd className="text-right font-mono">{value}</dd>
    </div>
  );
}

export function SpikeAudio() {
  const [engine] = useState(() => new SpikeEngine());
  const s = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  const [view, setView] = useState<CurrentView>({
    beat: null,
    beatInPhrase: null,
    step: null,
  });
  const [sourceKind, setSourceKind] = useState<"synthetic" | "file">(
    "synthetic",
  );
  const [bpm, setBpm] = useState(180);
  const [firstOneMs, setFirstOneMs] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [calLabel, setCalLabel] = useState("altavoz");
  const [copyStatus, setCopyStatus] = useState("");
  const [resultsText, setResultsText] = useState("");

  useEffect(() => engine.attach(), [engine]);

  // La cuenta en pantalla se lee del reloj de audio en cada frame; nunca un contador propio.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const next = engine.currentView();
      setView((prev) =>
        prev.beat === next.beat && prev.step === next.step ? prev : next,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const active = ["playing", "paused", "interrupted", "calibrating"].includes(
    s.state,
  );
  const hasTrack = s.source !== null && s.state !== "preparing";
  const bpmValid = bpm >= 100 && bpm <= 210;

  const prepare = () => {
    if (!bpmValid) return;
    if (sourceKind === "synthetic") void engine.prepareSynthetic(bpm);
    else if (file) void engine.prepareFile(file, bpm, firstOneMs);
  };

  const onTap = (e: PointerEvent<HTMLButtonElement>) => {
    engine.tap(e.timeStamp);
  };
  const onTapKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) engine.tap(e.timeStamp);
    }
  };

  const copyResults = async () => {
    const text = JSON.stringify(engine.results(), null, 2);
    setResultsText(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Resultados copiados al portapapeles.");
    } catch {
      setCopyStatus(
        "No se pudo copiar solo: selecciona el texto de abajo y cópialo.",
      );
    }
  };

  const d = s.drift;

  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-5 bg-black px-4 py-6 text-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Spike de audio · motor de ritmo</h1>
        <p className="text-neutral-300">
          Herramienta interna para medir el reproductor en teléfonos. Protocolo
          en <code>docs/spike/audio.md</code>.
        </p>
      </header>

      {s.recovered.length > 0 && (
        <div
          role="alert"
          className="space-y-1 rounded-md border-2 border-yellow-300 p-3"
        >
          <p className="font-semibold">Al volver a cargar se detectó:</p>
          <ul className="list-disc pl-5">
            {s.recovered.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <p aria-live="polite" className="font-semibold">
        Estado: {STATE_TEXT[s.state]}
        {s.error ? ` ${s.error}` : ""}
      </p>

      {/* 1 · Fuente */}
      <section className={SECTION} aria-labelledby="h-fuente">
        <h2 id="h-fuente" className="text-xl font-bold">
          1 · Audio
        </h2>
        <fieldset className="space-y-2" disabled={active}>
          <legend className="sr-only">Fuente de audio</legend>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              name="fuente"
              className={CHECK}
              checked={sourceKind === "synthetic"}
              onChange={() => setSourceKind("synthetic")}
            />
            Pista sintética de 4 min (~85 MB decodificada)
          </label>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              name="fuente"
              className={CHECK}
              checked={sourceKind === "file"}
              onChange={() => setSourceKind("file")}
            />
            Archivo del teléfono (no se sube a ningún lado)
          </label>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block">BPM (100–210)</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={210}
              className={INPUT}
              value={bpm}
              disabled={active}
              aria-invalid={!bpmValid}
              aria-describedby={bpmValid ? undefined : "bpm-error"}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            {!bpmValid && (
              <span id="bpm-error" className="block text-yellow-300">
                Escribe un BPM entre 100 y 210.
              </span>
            )}
          </label>
          {sourceKind === "file" && (
            <label className="space-y-1">
              <span className="block">Primer “1” (ms desde el inicio)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className={INPUT}
                value={firstOneMs}
                disabled={active}
                onChange={(e) => setFirstOneMs(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        {sourceKind === "file" && (
          <label className="block space-y-1">
            <span className="block">Canción</span>
            <input
              type="file"
              accept="audio/*"
              className="block min-h-12 w-full text-white file:mr-3 file:min-h-12 file:rounded-md file:border-2 file:border-white file:bg-black file:px-4 file:text-white"
              disabled={active}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={
            active ||
            s.state === "preparing" ||
            !bpmValid ||
            (sourceKind === "file" && !file)
          }
          onClick={prepare}
        >
          Preparar audio
        </button>
      </section>

      {/* 2 · Práctica */}
      <section className={SECTION} aria-labelledby="h-practica">
        <h2 id="h-practica" className="text-xl font-bold">
          2 · Práctica
        </h2>
        <div className="flex items-center gap-6">
          <p className="w-28 text-center font-mono text-8xl font-bold tabular-nums">
            <span className="sr-only">Tiempo </span>
            {view.beatInPhrase ?? "–"}
          </p>
          <p className="text-lg">
            Paso: <span className="font-semibold">{view.step ?? "—"}</span>
          </p>
        </div>
        <ol className="grid grid-cols-8 gap-1" aria-label="Tiempos de la frase">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
            const on = view.beatInPhrase === n;
            return (
              <li
                key={n}
                aria-current={on ? "true" : undefined}
                className={`rounded py-2 text-center font-mono text-lg ${
                  on
                    ? "bg-white font-bold text-black underline decoration-4 underline-offset-4"
                    : "border border-neutral-600 text-neutral-200"
                }`}
              >
                {n}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={!hasTrack || !["ready", "ended"].includes(s.state)}
            onClick={() => engine.start()}
          >
            Iniciar
          </button>
          <button
            type="button"
            className={BTN}
            disabled={s.state !== "playing"}
            onClick={() => engine.pause()}
          >
            Pausar
          </button>
          <button
            type="button"
            className={BTN}
            disabled={s.state !== "paused" && s.state !== "interrupted"}
            onClick={() => void engine.resume()}
          >
            Reanudar
          </button>
          <button
            type="button"
            className={BTN}
            disabled={!active && s.state !== "ended"}
            onClick={() => engine.exit()}
          >
            Salir
          </button>
        </div>
      </section>

      {/* 3 · Calibración */}
      <section className={SECTION} aria-labelledby="h-calibracion">
        <h2 id="h-calibracion" className="text-xl font-bold">
          3 · Calibración de latencia
        </h2>
        <p className="text-neutral-300">
          Suena solo la pista. Toca el botón grande en cada golpe fuerte de
          bombo (el 1 y el 5): 16 toques.
        </p>
        <fieldset className="flex flex-wrap gap-4" disabled={active}>
          <legend className="mb-1">Salida de audio</legend>
          {["altavoz", "bluetooth", "cable"].map((l) => (
            <label key={l} className="flex min-h-12 items-center gap-2">
              <input
                type="radio"
                name="salida"
                className={CHECK}
                checked={calLabel === l}
                onChange={() => setCalLabel(l)}
              />
              {l}
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          className={BTN}
          disabled={!hasTrack || !["ready", "ended"].includes(s.state)}
          onClick={() => engine.calibrate(calLabel)}
        >
          Calibrar con {calLabel}
        </button>
        <button
          type="button"
          className="min-h-32 w-full rounded-md border-2 border-white text-2xl font-bold text-white disabled:border-neutral-600 disabled:text-neutral-400 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          disabled={s.state !== "calibrating"}
          onPointerDown={onTap}
          onKeyDown={onTapKey}
        >
          {s.calibrating
            ? `Toca aquí · ${s.calibrating.taps} / ${s.calibrating.target}`
            : "Toca aquí (activo al calibrar)"}
        </button>
        {s.calibrations.length > 0 && (
          <ul className="space-y-1 font-mono text-sm">
            {s.calibrations.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.label}: {ms(c.meanMs)} ± {ms(c.sdMs)} · salida{" "}
                {ms(c.meanOutputMs)} · reportada {ms(c.reportedLatencyMs)} (
                {c.taps} toques)
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block">latencyOffsetMs</span>
            <input
              type="number"
              className={INPUT}
              value={s.latencyOffsetMs}
              disabled={active}
              onChange={(e) => engine.setLatencyOffset(Number(e.target.value))}
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 self-end">
            <input
              type="checkbox"
              className={CHECK}
              checked={s.applyOffsetToClips}
              disabled={active}
              onChange={(e) => engine.setApplyOffsetToClips(e.target.checked)}
            />
            Aplicar el offset a los clips
          </label>
        </div>
      </section>

      {/* 4 · Mediciones */}
      <section className={SECTION} aria-labelledby="h-mediciones">
        <h2 id="h-mediciones" className="text-xl font-bold">
          4 · Mediciones
        </h2>
        <dl className="text-sm">
          <Row label="Contexto de audio" value={s.ctxState ?? "—"} />
          <Row
            label="Posición"
            value={`${(s.positionMs / 1000).toFixed(1)} s`}
          />
          <Row label="Buffer decodificado" value={mb(s.memory?.bufferBytes)} />
          <Row
            label="Tiempo de preparación"
            value={ms(s.memory?.prepareMs, 0)}
          />
          <Row
            label="Heap JS antes / después"
            value={`${mb(s.memory?.heapBeforeBytes)} / ${mb(s.memory?.heapAfterBytes)}`}
          />
          <Row
            label="Eventos / pasos"
            value={`${s.eventCount} / ${s.plan.length}`}
          />
          <Row
            label="Clips programados (tarde / omitidos)"
            value={`${d.total.scheduled} (${d.total.late} / ${d.total.skipped})`}
          />
          <Row label="Deriva máx. total" value={ms(d.total.maxAbsDriftMs, 2)} />
          <Row
            label={`Deriva máx. tras reanudar (${d.resumes})`}
            value={ms(d.sinceResume.maxAbsDriftMs, 2)}
          />
          <Row
            label="Margen mínimo del lookahead"
            value={ms(d.total.minMarginMs)}
          />
          <Row
            label="Reloj audio − pared (tramo)"
            value={`${ms(s.clock.segmentDriftMs, 2)} en ${s.clock.segmentElapsedS?.toFixed(0) ?? "—"} s`}
          />
          <Row
            label="Peor deriva de reloj"
            value={
              s.clock.worstAbsPpm == null
                ? "—"
                : `${s.clock.worstAbsPpm.toFixed(0)} ppm`
            }
          />
          <Row label="baseLatency" value={ms(s.latency.baseLatencyMs)} />
          <Row label="outputLatency" value={ms(s.latency.outputLatencyMs)} />
          <Row
            label="Wake Lock"
            value={
              s.wakeLock.supported
                ? `${s.wakeLock.status} (pedidos ${s.wakeLock.requests}, liberados ${s.wakeLock.releases})`
                : "no soportado"
            }
          />
        </dl>

        <details className="rounded-md border border-neutral-700 p-3">
          <summary className="min-h-12 cursor-pointer content-center font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
            Ajustes del planificador
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="block">Lookahead (ms)</span>
              <input
                type="number"
                min={50}
                max={2000}
                className={INPUT}
                value={s.params.lookaheadMs}
                disabled={active}
                onChange={(e) =>
                  engine.setParams({
                    ...s.params,
                    lookaheadMs: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="block">Periodo del bucle (ms)</span>
              <input
                type="number"
                min={5}
                max={500}
                className={INPUT}
                value={s.params.periodMs}
                disabled={active}
                onChange={(e) =>
                  engine.setParams({
                    ...s.params,
                    periodMs: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
        </details>

        <details className="rounded-md border border-neutral-700 p-3">
          <summary className="min-h-12 cursor-pointer content-center font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
            Registro ({s.log.length})
          </summary>
          <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto font-mono text-xs">
            {s.log
              .slice(-40)
              .reverse()
              .map((l) => (
                <li key={`${l.atMs}-${l.type}-${l.detail ?? ""}`}>
                  {(l.atMs / 1000).toFixed(2)} s · {l.type}
                  {l.detail ? ` · ${l.detail}` : ""}
                </li>
              ))}
          </ol>
        </details>

        <button
          type="button"
          className={BTN_PRIMARY}
          onClick={() => void copyResults()}
        >
          Copiar resultados
        </button>
        <p aria-live="polite">{copyStatus}</p>
        {resultsText && (
          <label className="block space-y-1">
            <span className="block">Resultados (JSON)</span>
            <textarea
              readOnly
              rows={8}
              className="w-full rounded-md border-2 border-neutral-400 bg-black p-2 font-mono text-xs text-white focus-visible:outline-4 focus-visible:outline-yellow-300"
              value={resultsText}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
        )}
      </section>
    </main>
  );
}
