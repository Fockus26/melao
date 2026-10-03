"use client";

import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  EditorActions,
  EditorCard,
  EditorSection,
  Field,
  FieldGrid,
  messageId,
} from "@/components/admin/list-editor/editor-card";
import { useLeaveGuard } from "@/components/admin/list-editor/leave-guard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminCourseData,
  type CourseLesson,
  type CourseStep,
  clampPhrases,
  courseErrorMessage,
  draftSongIssues,
  fragmentText,
  isLessonDirty,
  type LessonDraft,
  type LessonField,
  lessonDraft,
  PRACTICE_PHRASES_MAX,
  PRACTICE_PHRASES_MIN,
  SONG_ISSUE_TEXT,
  sequenceIssues,
  sequenceIssueText,
  songOptionLabel,
  songPhrases,
  validateLessonDraft,
} from "@/lib/admin/course";
import type { AdminCoursePort } from "@/lib/admin/course-port";
import { normalizeText } from "@/lib/songs/songs";
import { cn } from "@/lib/utils";
import { DragHandle, SortableList } from "./sortable";

// Copy provisional (CONTENT_CHECKLIST fila 90).
const COPY = {
  eyebrow: (n: number, unit: number) => `Lección ${n} · Unidad ${unit}`,
  untitled: "Lección sin título",
  dataSection: "Datos",
  title: "Título",
  intro: "Introducción",
  introHelp:
    "Lo que el alumno lee antes de empezar. Opcional, máximo 2000 caracteres.",
  stepsSection: "Pasos",
  stepsText:
    "En el orden en que se enseñan. Cada uno con su posición de entrada y de salida.",
  stepsList: "Pasos de la lección",
  noSteps: "La lección todavía no tiene pasos. Agrega el primero.",
  unpublished: "Sin publicar",
  up: (name: string) => `Subir ${name}`,
  down: (name: string) => `Bajar ${name}`,
  remove: (name: string) => `Quitar ${name}`,
  addLabel: "Agregar un paso del estilo",
  addPlaceholder: "Busca por nombre",
  addCount: (n: number) =>
    n === 0
      ? "Ningún paso coincide."
      : n === 1
        ? "1 paso coincide."
        : `${n} pasos coinciden.`,
  addAll: "Ya están todos los pasos del estilo.",
  addOne: (name: string) => `Agregar ${name}`,
  validationSection: "¿Se puede bailar?",
  validationText:
    "Con los pasos de esta lección y de las anteriores, como en la práctica de un alumno nuevo.",
  valid: (start: string) =>
    `Se puede bailar: desde ${start} se llega a cada paso y después se puede cerrar la combinación.`,
  noStartPosition:
    "El estilo no tiene posición inicial: configúrala en Estilos para validar la secuencia.",
  practiceSection: "Mini práctica",
  practiceText:
    "Una por lección: suena después del video de cada paso, con ese paso y los ya enseñados.",
  practiceSong: "Canción de la mini práctica",
  finalSection: "Canción final",
  finalText:
    "La práctica final con todos los pasos de la lección. Sin canción final, se usa la de la mini práctica.",
  finalSong: "Canción final",
  none: "Ninguna",
  noSongs: "Este estilo todavía no tiene canciones. Agrégalas en Canciones.",
  phrases: "Frases de la mini práctica",
  fewer: "Una frase menos",
  more: "Una frase más",
  phrasesFit: (n: number) =>
    n === 1
      ? "En esta canción cabe 1 frase."
      : `En esta canción caben ${n} frases.`,
  phrasesOver: (n: number) => `Solo caben ${n} en esta canción: sonarán ${n}.`,
  phrasesRange: `Entre ${PRACTICE_PHRASES_MIN} y ${PRACTICE_PHRASES_MAX}.`,
  save: "Guardar",
  saving: "Guardando…",
  saved: "Guardado.",
  fixErrors: "Revisa los campos marcados.",
  removeLesson: "Borrar la lección",
  removing: "Borrando…",
  removeBlocked: (n: number) =>
    n === 1
      ? "Un alumno ya la completó: no se puede borrar (perdería su avance)."
      : `${n} alumnos ya la completaron: no se puede borrar (perderían su avance).`,
  removeTitle: (name: string) => `¿Borrar «${name}»?`,
  removeText:
    "Se borran la lección y su lista de pasos (los pasos siguen en el catálogo). No se puede deshacer.",
  removeStay: "Conservar la lección",
  removeConfirm: "Borrar la lección",
};

type Status = { tone: "success" | "error"; text: string } | null;

export type LessonEditorProps = {
  data: AdminCourseData;
  lesson: CourseLesson;
  number: number;
  unitNumber: number;
  port: AdminCoursePort;
  initialStatus?: Status;
  /** Se guardó: la vista vuelve a leer el camino. */
  onSaved: () => Promise<void>;
  onRemoved: (lessonId: string) => void;
};

/**
 * Editor de una lección (handoff §3 Admin, Constructor del camino): título, intro, pasos
 * ordenables con entrada → salida, validación de la secuencia con el core, mini práctica (una
 * por lección: canción + frases 1–32) y canción final con el fragmento que sonará. Todo se
 * guarda junto con el botón (`admin_save_lesson`, todo o nada).
 */
export function LessonEditor({
  data,
  lesson,
  number,
  unitNumber,
  port,
  initialStatus = null,
  onSaved,
  onRemoved,
}: LessonEditorProps) {
  const ids = {
    title: useId(),
    intro: useId(),
    add: useId(),
    addCount: useId(),
    practice: useId(),
    phrases: useId(),
    final: useId(),
    reason: useId(),
    sections: useId(),
  };
  const guard = useLeaveGuard();
  const [baseline, setBaseline] = useState<LessonDraft>(() =>
    lessonDraft(lesson),
  );
  const [draft, setDraft] = useState<LessonDraft>(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState<"idle" | "saving" | "removing">("idle");
  const [confirm, setConfirm] = useState(false);
  const [query, setQuery] = useState("");

  const dirty = isLessonDirty(draft, baseline);
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const errors: Partial<Record<LessonField, string>> = submitted
    ? validateLessonDraft(draft)
    : {};

  const stepById = new Map(data.steps.map((s) => [s.id, s]));
  const positionName = (id: string) =>
    data.positions.find((p) => p.id === id)?.name ?? "—";
  const stepName = (id: string) => stepById.get(id)?.name ?? "—";
  const steps = draft.stepIds
    .map((id) => stepById.get(id))
    .filter((s): s is CourseStep => s !== undefined);

  function update<K extends keyof LessonDraft>(key: K, value: LessonDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus(null);
  }
  const moveStep = (id: string, position: number) => {
    const rest = draft.stepIds.filter((s) => s !== id);
    const at = Math.max(0, Math.min(position - 1, rest.length));
    update("stepIds", [...rest.slice(0, at), id, ...rest.slice(at)]);
  };

  const seq = sequenceIssues(data, lesson.id, draft.stepIds);
  const songIssues = draftSongIssues(draft, data.songs);
  const startName = data.style.startPositionId
    ? positionName(data.style.startPositionId)
    : "";

  const q = normalizeText(query.trim());
  const candidates = data.steps.filter((s) => !draft.stepIds.includes(s.id));
  const matches = q
    ? candidates.filter((s) =>
        q
          .split(/\s+/)
          .every((w) => normalizeText(`${s.name} ${s.slug}`).includes(w)),
      )
    : candidates;

  const songs = data.songs;
  const practiceSong = songs.find((s) => s.id === draft.practiceSongId);
  const finalSong = songs.find((s) => s.id === draft.finalSongId);
  const fit = practiceSong
    ? songPhrases(practiceSong, data.style.config)
    : null;

  async function save() {
    setSubmitted(true);
    const found = validateLessonDraft(draft);
    const first = (Object.keys(found) as LessonField[])[0];
    if (first) {
      setStatus({ tone: "error", text: COPY.fixErrors });
      document
        .getElementById(first === "title" ? ids.title : ids.intro)
        ?.focus();
      return;
    }
    setBusy("saving");
    setStatus(null);
    const { error } = await port.saveLesson(lesson.id, draft);
    if (error) {
      setBusy("idle");
      setStatus({ tone: "error", text: courseErrorMessage(error) });
      return;
    }
    const saved = {
      ...draft,
      title: draft.title.trim(),
      intro: draft.intro.trim(),
      practicePhrases: clampPhrases(draft.practicePhrases),
    };
    setBaseline(saved);
    setDraft(saved);
    setSubmitted(false);
    await onSaved();
    setBusy("idle");
    setStatus({ tone: "success", text: COPY.saved });
  }

  async function remove() {
    setBusy("removing");
    setStatus(null);
    const { error } = await port.removeLesson(lesson.id);
    if (error) {
      setBusy("idle");
      setStatus({ tone: "error", text: courseErrorMessage(error) });
      return;
    }
    setDirty(false);
    onRemoved(lesson.id);
  }

  const title = baseline.title || COPY.untitled;
  const removeBlock =
    lesson.progressCount > 0 ? COPY.removeBlocked(lesson.progressCount) : null;

  return (
    <EditorCard
      titleId={`${ids.title}-h`}
      title={title}
      eyebrow={COPY.eyebrow(number, unitNumber)}
      actions={
        <EditorActions
          blockReason={removeBlock}
          blockReasonId={ids.reason}
          status={
            status ? (
              <FieldMessage tone={status.tone}>{status.text}</FieldMessage>
            ) : null
          }
        >
          <Button
            variant="danger"
            loading={busy === "removing"}
            loadingText={COPY.removing}
            disabled={
              removeBlock !== null || (busy !== "idle" && busy !== "removing")
            }
            aria-describedby={removeBlock ? ids.reason : undefined}
            onClick={() => setConfirm(true)}
          >
            {COPY.removeLesson}
          </Button>
          <Button
            loading={busy === "saving"}
            loadingText={COPY.saving}
            disabled={busy !== "idle" && busy !== "saving"}
            onClick={() => void save()}
          >
            {COPY.save}
          </Button>
        </EditorActions>
      }
    >
      <EditorSection id={`${ids.sections}-data`} title={COPY.dataSection}>
        <FieldGrid>
          <Field
            htmlFor={ids.title}
            label={COPY.title}
            error={errors.title}
            wide
          >
            <Input
              id={ids.title}
              value={draft.title}
              maxLength={120}
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? messageId(ids.title) : undefined}
              onChange={(e) => update("title", e.currentTarget.value)}
            />
          </Field>
          <Field
            htmlFor={ids.intro}
            label={COPY.intro}
            help={COPY.introHelp}
            error={errors.intro}
            wide
          >
            <Textarea
              id={ids.intro}
              value={draft.intro}
              maxLength={2000}
              aria-invalid={errors.intro ? true : undefined}
              aria-describedby={messageId(ids.intro)}
              onChange={(e) => update("intro", e.currentTarget.value)}
            />
          </Field>
        </FieldGrid>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-steps`}
        title={COPY.stepsSection}
        description={COPY.stepsText}
      >
        {steps.length === 0 ? (
          <p className="type-small text-text-secondary">{COPY.noSteps}</p>
        ) : (
          <div className="border-t border-divider">
            <SortableList
              items={steps}
              getId={(s) => s.id}
              getName={(s) => s.name}
              label={COPY.stepsList}
              onMove={moveStep}
              renderItem={(step, handle) => {
                const i = draft.stepIds.indexOf(step.id);
                return (
                  <div className="flex min-h-14 flex-wrap items-center gap-x-1 border-b border-divider py-1">
                    <DragHandle handle={handle} />
                    <span className="w-6 shrink-0 text-right type-small tabular-nums text-text-secondary">
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 basis-40 flex-col px-2">
                      <span className="break-words type-body text-text">
                        {step.name}
                      </span>
                      <span className="type-caption text-text-secondary">
                        {positionName(step.startPosition)}
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only"> a </span>
                        {positionName(step.endPosition)}
                      </span>
                    </span>
                    {step.published ? null : (
                      <Badge variant="warning">{COPY.unpublished}</Badge>
                    )}
                    {handle.overlay ? null : (
                      <span className="flex shrink-0">
                        <IconButton
                          iconSize="dense"
                          aria-label={COPY.up(step.name)}
                          disabled={i === 0}
                          onClick={() => moveStep(step.id, i)}
                        >
                          <ChevronUp
                            aria-hidden="true"
                            strokeWidth={ICON_STROKE}
                          />
                        </IconButton>
                        <IconButton
                          iconSize="dense"
                          aria-label={COPY.down(step.name)}
                          disabled={i === draft.stepIds.length - 1}
                          onClick={() => moveStep(step.id, i + 2)}
                        >
                          <ChevronDown
                            aria-hidden="true"
                            strokeWidth={ICON_STROKE}
                          />
                        </IconButton>
                        <IconButton
                          iconSize="dense"
                          aria-label={COPY.remove(step.name)}
                          onClick={() =>
                            update(
                              "stepIds",
                              draft.stepIds.filter((s) => s !== step.id),
                            )
                          }
                        >
                          <X aria-hidden="true" strokeWidth={ICON_STROKE} />
                        </IconButton>
                      </span>
                    )}
                  </div>
                );
              }}
            />
          </div>
        )}
        {candidates.length === 0 ? (
          <p className="type-small text-text-secondary">{COPY.addAll}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={ids.add}
              className="type-small font-medium text-text"
            >
              {COPY.addLabel}
            </label>
            <Input
              id={ids.add}
              type="search"
              value={query}
              placeholder={COPY.addPlaceholder}
              autoComplete="off"
              aria-describedby={ids.addCount}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <p
              id={ids.addCount}
              aria-live="polite"
              className="type-caption text-text-secondary"
            >
              {COPY.addCount(matches.length)}
            </p>
            {matches.length > 0 ? (
              <ul className="flex max-h-72 flex-col overflow-y-auto rounded-sm border border-divider">
                {matches.map((s) => (
                  <li
                    key={s.id}
                    className="border-b border-divider last:border-b-0"
                  >
                    <button
                      type="button"
                      aria-label={COPY.addOne(s.name)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left",
                        "transition-colors duration-hover ease-standard motion-reduce:transition-none hover:bg-hover",
                      )}
                      onClick={() => {
                        update("stepIds", [...draft.stepIds, s.id]);
                        document.getElementById(ids.add)?.focus();
                      }}
                    >
                      <Plus
                        aria-hidden="true"
                        strokeWidth={ICON_STROKE}
                        className="size-4.5 shrink-0"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="break-words type-body text-text">
                          {s.name}
                        </span>
                        <span className="type-caption text-text-secondary">
                          {`${positionName(s.startPosition)} → ${positionName(s.endPosition)}`}
                          {s.published ? "" : ` · ${COPY.unpublished}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-validation`}
        title={COPY.validationSection}
        description={COPY.validationText}
      >
        <div aria-live="polite" className="flex flex-col gap-2">
          {seq === null ? (
            <Problem text={COPY.noStartPosition} />
          ) : seq.length === 0 && songIssues.length === 0 ? (
            <p className="flex items-start gap-2 type-small text-success">
              <CircleCheck
                aria-hidden="true"
                strokeWidth={ICON_STROKE}
                className="mt-px size-4.5 shrink-0"
              />
              <span>{COPY.valid(startName)}</span>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {seq.map((issue) => (
                <li
                  key={`${issue.code}-${issue.stepId ?? issue.position ?? ""}`}
                >
                  <Problem
                    text={sequenceIssueText(issue, {
                      step: stepName,
                      position: positionName,
                    })}
                  />
                </li>
              ))}
              {songIssues.map((code) => (
                <li key={code}>
                  <Problem text={SONG_ISSUE_TEXT[code]} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-practice`}
        title={COPY.practiceSection}
        description={COPY.practiceText}
      >
        {songs.length === 0 ? (
          <p className="type-small text-text-secondary">{COPY.noSongs}</p>
        ) : null}
        <FieldGrid>
          <Field
            htmlFor={ids.practice}
            label={COPY.practiceSong}
            help={
              practiceSong
                ? fragmentText(
                    practiceSong,
                    data.style.config,
                    clampPhrases(draft.practicePhrases),
                  )
                : undefined
            }
            wide
          >
            <SongSelect
              id={ids.practice}
              value={draft.practiceSongId}
              songs={songs}
              describedBy={practiceSong ? messageId(ids.practice) : undefined}
              onChange={(v) => update("practiceSongId", v)}
            />
          </Field>
          {draft.practiceSongId ? (
            <div className="flex min-w-0 flex-col gap-1.5 md:col-span-2">
              <label
                htmlFor={ids.phrases}
                className="type-small font-medium text-text"
              >
                {COPY.phrases}
              </label>
              <div className="flex items-center gap-2">
                <IconButton
                  variant="outline"
                  iconSize="dense"
                  aria-label={COPY.fewer}
                  aria-controls={ids.phrases}
                  disabled={draft.practicePhrases <= PRACTICE_PHRASES_MIN}
                  onClick={() =>
                    update(
                      "practicePhrases",
                      clampPhrases(draft.practicePhrases - 1),
                    )
                  }
                >
                  <Minus aria-hidden="true" strokeWidth={ICON_STROKE} />
                </IconButton>
                <Input
                  id={ids.phrases}
                  type="number"
                  inputMode="numeric"
                  min={PRACTICE_PHRASES_MIN}
                  max={PRACTICE_PHRASES_MAX}
                  step={1}
                  className="w-24 text-center tabular-nums"
                  value={draft.practicePhrases}
                  aria-describedby={`${ids.phrases}-help`}
                  onChange={(e) =>
                    update(
                      "practicePhrases",
                      clampPhrases(Number(e.currentTarget.value)),
                    )
                  }
                />
                <IconButton
                  variant="outline"
                  iconSize="dense"
                  aria-label={COPY.more}
                  aria-controls={ids.phrases}
                  disabled={draft.practicePhrases >= PRACTICE_PHRASES_MAX}
                  onClick={() =>
                    update(
                      "practicePhrases",
                      clampPhrases(draft.practicePhrases + 1),
                    )
                  }
                >
                  <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
                </IconButton>
              </div>
              <FieldMessage
                id={`${ids.phrases}-help`}
                tone={
                  fit !== null && draft.practicePhrases > fit
                    ? "error"
                    : undefined
                }
              >
                {fit === null
                  ? COPY.phrasesRange
                  : draft.practicePhrases > fit
                    ? COPY.phrasesOver(fit)
                    : `${COPY.phrasesRange} ${COPY.phrasesFit(fit)}`}
              </FieldMessage>
            </div>
          ) : null}
        </FieldGrid>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-final`}
        title={COPY.finalSection}
        description={COPY.finalText}
      >
        <FieldGrid>
          <Field
            htmlFor={ids.final}
            label={COPY.finalSong}
            help={
              finalSong ? fragmentText(finalSong, data.style.config) : undefined
            }
            wide
          >
            <SongSelect
              id={ids.final}
              value={draft.finalSongId}
              songs={songs}
              describedBy={finalSong ? messageId(ids.final) : undefined}
              onChange={(v) => update("finalSongId", v)}
            />
          </Field>
        </FieldGrid>
      </EditorSection>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>{COPY.removeTitle(title)}</AlertDialogTitle>
          <AlertDialogDescription>{COPY.removeText}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.removeStay}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              {COPY.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditorCard>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 type-small text-warning">
      <CircleAlert
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className="mt-px size-4.5 shrink-0"
      />
      <span>{text}</span>
    </p>
  );
}

function SongSelect({
  id,
  value,
  songs,
  describedBy,
  onChange,
}: {
  id: string;
  value: string | null;
  songs: AdminCourseData["songs"];
  describedBy?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger id={id} aria-describedby={describedBy}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{COPY.none}</SelectItem>
        {songs.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {songOptionLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
