"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Difficulty } from "@/components/indicators/difficulty";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_STROKE } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Slider } from "@/components/ui/slider";
import { SwitchField } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { signInPathFor } from "@/lib/auth/redirect";
import {
  buildPlanRequest,
  formatDuration,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  PRACTICE_LINKS,
  type PracticeConfig,
  type PracticeSong,
  type PracticeStyle,
  phrasesFor,
  pickSong,
  practiceHref,
  SONG_MODES,
  type SongBlock,
  type SongMode,
  STEP_CRITERIA,
  type StartProblem,
  type StepCriterion,
  sessionIdFrom,
  songBlock,
  startProblem,
} from "@/lib/practice/config";
import { edgePracticePorts, type PracticePorts } from "@/lib/practice/invoke";

// Copy provisional (CONTENT_CHECKLIST fila 63).
const COPY = {
  title: "Practicar",
  noStyles: "Todavía no hay estilos publicados. Vuelve pronto.",
  style: "Estilo",
  song: "Canción",
  songModeLabel: "Cómo elegir la canción",
  songModes: {
    pick: "Elegir",
    difficulty: "Por dificultad",
    random: "Aleatoria",
    popular: "Populares",
    favorites: "Favoritas",
  } satisfies Record<SongMode, string>,
  change: "Cambiar",
  changeLabel: (title: string) => `Cambiar la canción: ${title}`,
  choose: "Elegir canción",
  favorite: "Favorita",
  bpm: (bpm: number) => `${Math.round(bpm)} BPM`,
  songBlock: {
    "no-songs": "Este estilo todavía no tiene canciones para practicar.",
    "no-favorites":
      "Todavía no tienes canciones favoritas en este estilo. Márcalas con el corazón en la lista de canciones.",
    "no-rated":
      "Todavía no hay canciones con dificultad asignada en este estilo.",
    "no-pick": "Elige una canción de la lista.",
    "not-ready": "Esta canción aún no está lista: faltan sus tiempos marcados.",
    "too-short": "En esta canción no cabe ninguna figura completa.",
  } satisfies Record<SongBlock, string>,
  steps: "Pasos",
  criterionLabel: "Cómo elegir los pasos",
  criteria: {
    review: "Según repaso",
    difficulty: "Dificultad",
    random: "Aleatorio",
    popular: "Populares",
    favorites: "Favoritos",
  } satisfies Record<StepCriterion, string>,
  maxDifficulty: "Dificultad máxima",
  maxDifficultyValue: (n: number) => `Hasta ${n} de ${MAX_DIFFICULTY}`,
  includeLearning: "Incluir aprendiendo",
  includeLearningText: "Pasos que todavía estás aprendiendo.",
  summary: "Resumen",
  fit: "Caben",
  figures: (n: number, beats: number) =>
    `${n === 1 ? "figura" : "figuras"} de ${beats} tiempos`,
  noFigures: "Sin canción lista",
  songTerm: "Canción",
  bpmTerm: "BPM",
  durationTerm: "Duración",
  none: "—",
  start: "Empezar",
  starting: "Preparando…",
  locked: "La práctica con el coach es parte del plan.",
  activate: "Activa tu plan",
  problem: {
    "no-steps": {
      title: "Todavía no hay pasos que conozcas con estos filtros",
      text: "Prueba con otro criterio, sube la dificultad máxima o aprende pasos nuevos en el catálogo.",
      action: "Ver el catálogo de pasos",
    },
    soon: {
      title: "Esta canción aún no está lista",
      text: "Elige otra canción u otro estilo mientras la preparamos.",
    },
    subscription: {
      title: "Activa tu plan para practicar",
      text: "La práctica con el coach y el repaso son parte del plan.",
      action: "Ver planes",
    },
    auth: {
      title: "Tu sesión terminó",
      text: "Vuelve a entrar para empezar la práctica.",
      action: "Entrar",
    },
    offline: {
      title: "Sin conexión",
      text: "No pudimos preparar la práctica. Revisa tu conexión y vuelve a intentarlo.",
      action: "Reintentar",
    },
    error: {
      title: "No pudimos preparar la práctica",
      text: "Algo falló de nuestro lado. Vuelve a intentarlo en un momento.",
      action: "Reintentar",
    },
  } satisfies Record<
    StartProblem,
    { title: string; text: string; action?: string }
  >,
} as const;

export type PracticeViewProps = {
  styles: readonly PracticeStyle[];
  /** `null` solo sin estilos publicados. */
  initial: PracticeConfig | null;
  /** Semilla de "Aleatoria" y "Favoritas" (uint32): fija durante la visita. */
  seed: number;
  subscribed: boolean;
  /** Llegó con `?mode=review` (Inicio, Curso): se conserva al ir a Canciones. */
  review?: boolean;
  /** Backend; la muestra pasa uno falso. */
  ports?: PracticePorts;
  /** Tras crear la sesión; por defecto navega a la sesión. */
  onStarted?: (sessionId: string) => void;
  /** Aviso de Empezar ya abierto (solo la muestra, para ver cada error sin backend). */
  initialProblem?: StartProblem | null;
};

/**
 * Practicar · configurador (handoff § Practicar · configurador): display + filete; a la izquierda
 * los grupos Estilo, Canción y Pasos; a la derecha (abajo en móvil) el Resumen con "caben N
 * figuras" y Empezar. Empezar llama a `plan-session` (`mode: "free"`) y abre la sesión. Solo
 * presenta: canciones, dificultad, favoritas y popularidad llegan de `practice_songs`; los pasos
 * los elige `plan-session` (D003). Sin plan se ve todo y Empezar lleva a Planes (D036).
 * La usan `/app/practice` y la muestra `/layouts/practice`.
 */
export function PracticeView({
  styles,
  initial,
  seed,
  subscribed,
  review = false,
  ports = edgePracticePorts,
  onStarted,
  initialProblem = null,
}: PracticeViewProps) {
  const router = useRouter();
  const [config, setConfig] = useState<PracticeConfig | null>(initial);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<StartProblem | null>(initialProblem);

  const style = styles.find((s) => s.id === config?.styleId) ?? null;
  if (!config || !style) {
    return (
      <div className="flex flex-col gap-8">
        <PracticeTitle />
        <p className="type-body text-text-secondary">{COPY.noStyles}</p>
      </div>
    );
  }

  const song = pickSong(style.songs, config.songMode, {
    songId: config.songId,
    difficulty: config.maxDifficulty,
    seed,
  });
  const block = songBlock(style, config.songMode, song);
  const phrases = song ? phrasesFor(song, style.config) : null;

  const update = (patch: Partial<PracticeConfig>) => {
    setProblem(null);
    setConfig({ ...config, ...patch });
  };

  const changeStyle = (styleId: string) => {
    // La canción elegida a mano es de otro estilo: pasa a una al azar del nuevo.
    update({
      styleId,
      songId: null,
      songMode: config.songMode === "pick" ? "random" : config.songMode,
    });
  };

  const start = async () => {
    if (!song || block || starting) return;
    setStarting(true);
    setProblem(null);
    const result = await ports.planSession(buildPlanRequest(config, song.id));
    const sessionId = result.status === 200 ? sessionIdFrom(result.body) : null;
    if (sessionId) {
      if (onStarted) {
        onStarted(sessionId);
        setStarting(false);
      } else {
        // Sigue "Preparando…" hasta que la sesión cargue.
        router.push(PRACTICE_LINKS.session(sessionId));
      }
      return;
    }
    setProblem(result.status === 200 ? "error" : startProblem(result));
    setStarting(false);
  };

  const signInHref = signInPathFor(
    practiceHref({
      styleId: style.id,
      songId: config.songMode === "pick" ? config.songId : null,
      review,
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <PracticeTitle />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-8">
          <StyleGroup styles={styles} value={style.id} onChange={changeStyle} />
          <SongGroup
            style={style}
            mode={config.songMode}
            song={song}
            block={block}
            review={review}
            onModeChange={(songMode) => update({ songMode })}
          />
          <StepsGroup config={config} onChange={update} />
        </div>
        <SummaryCard
          style={style}
          song={song}
          phrases={block ? null : phrases}
          block={block}
          subscribed={subscribed}
          starting={starting}
          problem={problem}
          signInHref={signInHref}
          onStart={start}
        />
      </div>
    </div>
  );
}

function PracticeTitle() {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="type-display">{COPY.title}</h1>
      <span aria-hidden="true" className="h-0.5 w-12 bg-gold-500" />
    </header>
  );
}

/** Fieldset con legend eyebrow (handoff: grupos del configurador). */
function Group({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 type-eyebrow text-text-secondary">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function StyleGroup({
  styles,
  value,
  onChange,
}: {
  styles: readonly PracticeStyle[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Group legend={COPY.style}>
      <ToggleGroup
        type="single"
        variant="segment"
        aria-label={COPY.style}
        value={value}
        // Radix permite desmarcar el activo: en un segmentado siempre hay uno.
        onValueChange={(id) => id && onChange(id)}
      >
        {styles.map((s) => (
          <ToggleGroupItem
            key={s.id}
            value={s.id}
            // Nombres largos a 320 px: parten en dos líneas en vez de desbordar.
            className="h-auto min-h-10 whitespace-normal text-center"
          >
            {s.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Group>
  );
}

function SongGroup({
  style,
  mode,
  song,
  block,
  review,
  onModeChange,
}: {
  style: PracticeStyle;
  mode: SongMode;
  song: PracticeSong | null;
  block: SongBlock | null;
  review: boolean;
  onModeChange: (mode: SongMode) => void;
}) {
  const songsHref = PRACTICE_LINKS.songs(style.id, review);
  return (
    <Group legend={COPY.song}>
      <ToggleGroup
        type="single"
        aria-label={COPY.songModeLabel}
        value={mode}
        onValueChange={(m) => m && onModeChange(m as SongMode)}
      >
        {SONG_MODES.map((m) => (
          <ToggleGroupItem key={m} value={m}>
            {COPY.songModes[m]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Card size="compact" data-block={block ?? undefined}>
        {song ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
              <p className="line-clamp-2 type-h4 break-words">{song.title}</p>
              <p className="truncate type-small text-text-secondary">
                {song.artist}
              </p>
              <SongMeta song={song} />
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={songsHref} aria-label={COPY.changeLabel(song.title)}>
                {COPY.change}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 basis-48 type-small text-text-secondary">
              {block ? COPY.songBlock[block] : null}
            </p>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={songsHref}>{COPY.choose}</Link>
            </Button>
          </div>
        )}
        {song && block ? (
          <p className="type-small text-text-secondary">
            {COPY.songBlock[block]}
          </p>
        ) : null}
      </Card>
    </Group>
  );
}

function SongMeta({ song }: { song: PracticeSong }) {
  const parts = [
    song.bpm ? COPY.bpm(song.bpm) : null,
    song.durationMs ? formatDuration(song.durationMs) : null,
  ].filter((p): p is string => p !== null);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-small tabular-nums text-text-secondary">
      {parts.length > 0 ? <span>{parts.join(" · ")}</span> : null}
      {song.difficulty !== null ? <Difficulty level={song.difficulty} /> : null}
      {song.favorite ? (
        <span className="inline-flex items-center gap-1">
          <Heart
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="size-4.5 fill-gold-600 text-gold-600"
          />
          {COPY.favorite}
        </span>
      ) : null}
    </p>
  );
}

function StepsGroup({
  config,
  onChange,
}: {
  config: PracticeConfig;
  onChange: (patch: Partial<PracticeConfig>) => void;
}) {
  const sliderLabel = useId();
  return (
    <Group legend={COPY.steps}>
      <ToggleGroup
        type="single"
        aria-label={COPY.criterionLabel}
        value={config.criterion}
        onValueChange={(c) => c && onChange({ criterion: c as StepCriterion })}
      >
        {STEP_CRITERIA.map((c) => (
          <ToggleGroupItem key={c} value={c}>
            {COPY.criteria[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <span id={sliderLabel} className="type-body text-text">
            {COPY.maxDifficulty}
          </span>
          <span className="type-small tabular-nums text-text-secondary">
            {COPY.maxDifficultyValue(config.maxDifficulty)}
          </span>
        </div>
        <Slider
          min={MIN_DIFFICULTY}
          max={MAX_DIFFICULTY}
          step={1}
          value={[config.maxDifficulty]}
          onValueChange={([v]) => v && onChange({ maxDifficulty: v })}
          aria-labelledby={sliderLabel}
          valueText={COPY.maxDifficultyValue}
        />
      </div>
      <SwitchField
        label={COPY.includeLearning}
        description={COPY.includeLearningText}
        checked={config.includeLearning}
        onCheckedChange={(includeLearning) => onChange({ includeLearning })}
      />
    </Group>
  );
}

function SummaryCard({
  style,
  song,
  phrases,
  block,
  subscribed,
  starting,
  problem,
  signInHref,
  onStart,
}: {
  style: PracticeStyle;
  song: PracticeSong | null;
  phrases: number | null;
  block: SongBlock | null;
  subscribed: boolean;
  starting: boolean;
  problem: StartProblem | null;
  signInHref: string;
  onStart: () => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const rows: [term: string, value: string][] = [
    [COPY.songTerm, song?.title ?? COPY.none],
    [COPY.bpmTerm, song?.bpm ? String(Math.round(song.bpm)) : COPY.none],
    [
      COPY.durationTerm,
      song?.durationMs ? formatDuration(song.durationMs) : COPY.none,
    ],
  ];
  return (
    <section aria-labelledby={titleId} className="lg:sticky lg:top-8">
      <Card className="gap-5">
        <h2 id={titleId} className="type-eyebrow text-text-secondary">
          {COPY.summary}
        </h2>
        <p
          className="flex flex-wrap items-baseline gap-x-2"
          data-phrases={phrases ?? undefined}
        >
          {phrases !== null ? (
            <>
              <span className="sr-only">{COPY.fit} </span>
              <span className="type-numeric-xl text-text">{phrases}</span>{" "}
              <span className="type-body text-text-secondary">
                {COPY.figures(phrases, style.config.beatsPerPhrase)}
              </span>
            </>
          ) : (
            <span className="type-h3 text-text-secondary">
              {COPY.noFigures}
            </span>
          )}
        </p>
        <dl className="flex flex-col divide-y divide-divider border-y border-divider">
          {rows.map(([term, value]) => (
            <div
              key={term}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <dt className="shrink-0 type-small text-text-secondary">
                {term}
              </dt>
              <dd className="min-w-0 truncate text-right type-small font-medium tabular-nums text-text">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {subscribed ? (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={block !== null}
              aria-describedby={block ? reasonId : undefined}
              loading={starting}
              loadingText={COPY.starting}
              onClick={onStart}
            >
              {COPY.start}
            </Button>
            {block ? (
              <p id={reasonId} className="type-small text-text-secondary">
                {COPY.songBlock[block]}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link href={PRACTICE_LINKS.plans}>{COPY.activate}</Link>
            </Button>
            <p className="type-small text-text-secondary">{COPY.locked}</p>
          </div>
        )}
        <Reveal show={problem !== null}>
          {problem ? (
            <ProblemAlert
              problem={problem}
              signInHref={signInHref}
              onRetry={onStart}
            />
          ) : null}
        </Reveal>
      </Card>
    </section>
  );
}

function ProblemAlert({
  problem,
  signInHref,
  onRetry,
}: {
  problem: StartProblem;
  signInHref: string;
  onRetry: () => void;
}) {
  const copy: { title: string; text: string; action?: string } =
    COPY.problem[problem];
  const href =
    problem === "no-steps"
      ? PRACTICE_LINKS.steps
      : problem === "subscription"
        ? PRACTICE_LINKS.plans
        : problem === "auth"
          ? signInHref
          : null;
  const retry = problem === "offline" || problem === "error";
  return (
    <Alert
      variant={
        problem === "no-steps" || problem === "soon" ? "warning" : "error"
      }
      data-problem={problem}
    >
      <AlertContent>
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription>{copy.text}</AlertDescription>
      </AlertContent>
      {copy.action && (href || retry) ? (
        <AlertAction>
          {href ? (
            <Button asChild variant="outline">
              <Link href={href}>{copy.action}</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={onRetry}>
              {copy.action}
            </Button>
          )}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
