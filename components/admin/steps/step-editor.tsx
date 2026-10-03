"use client";

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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldMessage } from "@/components/ui/field-message";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwitchField } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminPosition,
  type AdminStepDetail,
  type AdminStepRow,
  type AdminStyle,
  type DraftField,
  emptyDraft,
  ISSUE_TEXT,
  isDraftDirty,
  type StepDraft,
  type StepIssue,
  type StepVideo,
  slugify,
  type VideoRole,
  validateDraft,
  videoSlots,
  writeErrorMessage,
} from "@/lib/admin/steps";
import type { AdminStepsPort } from "@/lib/admin/steps-port";
import type { StoragePort } from "@/lib/admin/storage";
import {
  DIFFICULTY_NAMES,
  DIFFICULTY_OPTIONS,
  type DifficultyLevel,
} from "@/lib/difficulty";
import { CATEGORY_ORDER, type StepCategory } from "@/lib/steps/catalog";
import { CATEGORY_SINGULAR } from "@/lib/steps/detail";
import { StepMedia } from "./step-media";

// Copy provisional (CONTENT_CHECKLIST fila 82).
const COPY = {
  newTitle: "Nuevo paso",
  untitled: "Paso sin nombre",
  eyebrow: (style: string) => `Paso · ${style}`,
  published: "Publicado",
  draft: "Borrador",
  dataSection: "Datos",
  name: "Nombre",
  slug: "Slug",
  slugHelp:
    "Identifica el paso en la URL y en su clip de voz (step.<slug>). Único en el estilo.",
  slugHelpPublished:
    "Identifica el paso en la URL y en su clip de voz (step.<slug>). Si lo cambias en un paso publicado, los enlaces guardados dejan de funcionar.",
  category: "Categoría",
  difficulty: "Dificultad",
  phrases: "Frases que dura",
  phrasesHelp: "Entre 1 y 16.",
  sortOrder: "Orden",
  sortOrderHelp: "El menor va primero, aquí y en el catálogo del alumno.",
  positionsSection: "Posiciones y encadenamiento",
  positionsText:
    "Con qué posición empieza y termina: así se encadena con otros pasos.",
  startPosition: "Posición de inicio",
  endPosition: "Posición de fin",
  pickPosition: "Elige una posición",
  canStart: "Puede abrir una combinación",
  canStartHelp: "El generador puede empezar una práctica con este paso.",
  canEnd: "Puede cerrar una combinación",
  canEndHelp: "El generador puede terminar una práctica con este paso.",
  repeatable: "Se puede repetir seguido",
  repeatableHelp: "Puede salir dos veces seguidas en una combinación.",
  descriptionSection: "Descripción",
  description: "Descripción",
  descriptionHelp:
    "Qué es el paso, en una o dos frases. Máximo 2000 caracteres.",
  beatsTitle: "Por tiempos",
  beatsText:
    "Una nota opcional por tiempo de la frase; las vacías no se muestran.",
  beat: (n: number) => `Tiempo ${n}`,
  relationsSection: "Relaciones",
  variationOf: "Variación de",
  variationHelp: "Si este paso es una variación de otro del mismo estilo.",
  none: "Ninguno",
  prerequisites: "Prerequisitos",
  prerequisitesHelp: "Pasos del mismo estilo que conviene saber antes.",
  noOtherSteps: "Todavía no hay otros pasos en este estilo.",
  mediaSection: "Videos y clip de voz",
  mediaText:
    "Se guardan al subirlos, sin esperar a Guardar. Publicar exige el video de cada rol.",
  save: "Guardar",
  saving: "Guardando…",
  saved: "Guardado.",
  created: "Paso creado. Ya puedes subir sus videos.",
  fixErrors: "Revisa los campos marcados.",
  publish: "Publicar",
  publishing: "Publicando…",
  unpublish: "Despublicar",
  unpublishing: "Despublicando…",
  publishedOk: "Publicado.",
  unpublishedOk: "Despublicado.",
  saveFirst: "Guarda el paso antes de publicarlo.",
  saveChangesFirst: "Guarda los cambios antes de publicar.",
  remove: "Borrar",
  removing: "Borrando…",
  removeTitle: (name: string) => `¿Borrar «${name}»?`,
  removeText:
    "Se borran el paso, sus videos y su clip de voz. No se puede deshacer.",
  removeStay: "Conservar el paso",
  removeConfirm: "Borrar el paso",
  unpublishTitle: (name: string) => `¿Despublicar «${name}»?`,
  unpublishText: (n: number) =>
    `Lo ${n === 1 ? "usa 1 lección" : `usan ${n} lecciones`}. Mientras esté sin publicar, los alumnos no lo ven.`,
  unpublishStay: "Mantener publicado",
  unpublishConfirm: "Despublicar",
} as const;

type Status = { tone: "success" | "error"; text: string } | null;
type Busy = "idle" | "saving" | "publishing" | "removing";

export type StepEditorProps = {
  style: AdminStyle;
  positions: readonly AdminPosition[];
  /** Los pasos del estilo (variación, prerequisitos y slug único). */
  rows: readonly AdminStepRow[];
  /** `null` = paso nuevo. */
  detail: AdminStepDetail | null;
  /** `sort_order` sugerido para un paso nuevo. */
  newSortOrder: number;
  port: AdminStepsPort;
  storage: StoragePort;
  initialStatus?: Status;
  /** La fila de la lista cambió (guardado, publicado, videos). */
  onRowChange: (row: AdminStepRow, created: boolean) => void;
  /** Se borró: la vista vuelve a la lista. */
  onRemoved: (id: string) => void;
  /** Muestras: el video de ese rol arranca en "Subiendo…". */
  initialUploading?: VideoRole;
};

/**
 * Editor de un paso (handoff §3 Admin, patrón lista + editor). Los datos se guardan con el botón
 * (`admin_save_step`, todo o nada); los archivos y publicar se escriben al momento. Qué bloquea
 * publicar lo dice la base (`admin_step_issues`); aquí solo se muestra antes del botón.
 */
export function StepEditor({
  style,
  positions,
  rows,
  detail,
  newSortOrder,
  port,
  storage,
  initialStatus = null,
  onRowChange,
  onRemoved,
  initialUploading,
}: StepEditorProps) {
  const ids = {
    title: useId(),
    name: useId(),
    slug: useId(),
    category: useId(),
    difficulty: useId(),
    phrases: useId(),
    sortOrder: useId(),
    start: useId(),
    end: useId(),
    description: useId(),
    beats: useId(),
    variation: useId(),
    prereqs: useId(),
    reason: useId(),
    sections: useId(),
  };
  const guard = useLeaveGuard();

  const initial = detail?.draft ?? emptyDraft(style, newSortOrder);
  const [stepId, setStepId] = useState<string | null>(detail?.id ?? null);
  const [baseline, setBaseline] = useState<StepDraft>(initial);
  const [draft, setDraft] = useState<StepDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(detail));
  const [published, setPublished] = useState(detail?.published ?? false);
  const [videos, setVideos] = useState<StepVideo[]>(detail?.videos ?? []);
  const [voiceClipPath, setVoiceClipPath] = useState(
    detail?.voiceClipPath ?? null,
  );
  const [issues, setIssues] = useState<StepIssue[]>(detail?.issues ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [serverSlugError, setServerSlugError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState<Busy>("idle");
  const [confirm, setConfirm] = useState<"remove" | "unpublish" | null>(null);
  const lessonCount = detail?.lessonCount ?? 0;

  const dirty = isDraftDirty(draft, baseline);
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const errors: Partial<Record<DraftField, string>> = submitted
    ? validateDraft(draft, { stepId, rows })
    : {};
  if (serverSlugError && !errors.slug) errors.slug = serverSlugError;

  const others = rows.filter((r) => r.id !== stepId);
  const title = stepId ? baseline.name || COPY.untitled : COPY.newTitle;

  function update<K extends keyof StepDraft>(key: K, value: StepDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus(null);
  }

  function rowFrom(
    d: StepDraft,
    over: Partial<AdminStepRow> = {},
  ): AdminStepRow {
    return {
      id: stepId ?? "",
      slug: d.slug,
      name: d.name.trim(),
      category: d.category,
      difficulty: d.difficulty,
      published,
      sortOrder: Number(d.sortOrder),
      videosComplete: issues.length === 0,
      hasVoiceClip: voiceClipPath !== null,
      lessonCount,
      ...over,
    };
  }

  async function refreshIssues(id: string) {
    const result = await port.issues(id);
    if (!result.error) {
      setIssues(result.issues);
      onRowChange(
        rowFrom(baseline, { id, videosComplete: result.issues.length === 0 }),
        false,
      );
    }
  }

  async function save() {
    setSubmitted(true);
    setServerSlugError(null);
    const found = validateDraft(draft, { stepId, rows });
    const firstInvalid = (Object.keys(found) as DraftField[])[0];
    if (firstInvalid) {
      setStatus({ tone: "error", text: COPY.fixErrors });
      const fieldIds: Record<DraftField, string> = {
        name: ids.name,
        slug: ids.slug,
        phrases: ids.phrases,
        startPositionId: ids.start,
        endPositionId: ids.end,
        description: ids.description,
        sortOrder: ids.sortOrder,
        variationOf: ids.variation,
      };
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }
    setBusy("saving");
    setStatus(null);
    const result = await port.save(style.id, stepId, draft);
    setBusy("idle");
    if (result.error || !result.id) {
      const text = writeErrorMessage(result.error ?? { message: "" });
      if (result.error?.code === "23505") setServerSlugError(text);
      setStatus({ tone: "error", text });
      return;
    }
    const created = stepId === null;
    const id = result.id;
    const saved = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
    };
    setStepId(id);
    setBaseline(saved);
    setDraft(saved);
    setSubmitted(false);
    setStatus({ tone: "success", text: created ? COPY.created : COPY.saved });
    // Paso nuevo: aún sin videos, todo lo que falta para publicar.
    const nextIssues = created ? (await port.issues(id)).issues : issues;
    setIssues(nextIssues);
    onRowChange(
      rowFrom(saved, { id, videosComplete: nextIssues.length === 0 }),
      created,
    );
  }

  async function setPublishedTo(on: boolean) {
    if (!stepId) return;
    setBusy("publishing");
    setStatus(null);
    const { error } = await port.setPublished(stepId, on);
    setBusy("idle");
    if (error) {
      setStatus({ tone: "error", text: writeErrorMessage(error) });
      if (error.code === "MS001") await refreshIssues(stepId);
      return;
    }
    setPublished(on);
    setStatus({
      tone: "success",
      text: on ? COPY.publishedOk : COPY.unpublishedOk,
    });
    onRowChange(rowFrom(baseline, { id: stepId, published: on }), false);
  }

  async function remove() {
    if (!stepId) return;
    setBusy("removing");
    setStatus(null);
    const { error } = await port.remove(stepId);
    if (error) {
      setBusy("idle");
      setStatus({ tone: "error", text: writeErrorMessage(error) });
      return;
    }
    // La fila ya no existe: los archivos quedan sin uso y se borran (si falla, solo se registra).
    const removals = [
      storage.remove(
        "step-videos",
        videos.map((v) => v.path),
      ),
      voiceClipPath
        ? storage.remove("voice-clips", [voiceClipPath])
        : Promise.resolve({ error: null }),
    ];
    for (const r of await Promise.all(removals))
      if (r.error) console.error("Archivos del paso sin borrar", r.error);
    setDirty(false);
    onRemoved(stepId);
  }

  // Motivo del bloqueo de Publicar, en texto antes del botón (handoff §3 Admin).
  const publishBlock = published
    ? null
    : !stepId
      ? COPY.saveFirst
      : dirty
        ? COPY.saveChangesFirst
        : issues.length > 0
          ? issues.map((i) => ISSUE_TEXT[i]).join(" ")
          : null;

  const slots = videoSlots(style.hasRoles, baseline.category, videos);

  return (
    <EditorCard
      titleId={ids.title}
      title={title}
      eyebrow={COPY.eyebrow(style.name)}
      badges={
        stepId ? (
          <Badge variant={published ? "ok" : "neutral"}>
            {published ? COPY.published : COPY.draft}
          </Badge>
        ) : null
      }
      actions={
        <EditorActions
          blockReason={publishBlock}
          blockReasonId={ids.reason}
          status={
            status ? (
              <FieldMessage tone={status.tone}>{status.text}</FieldMessage>
            ) : null
          }
        >
          {stepId && !published && lessonCount === 0 ? (
            <Button
              variant="danger"
              loading={busy === "removing"}
              loadingText={COPY.removing}
              disabled={busy !== "idle" && busy !== "removing"}
              onClick={() => setConfirm("remove")}
            >
              {COPY.remove}
            </Button>
          ) : null}
          {published ? (
            <Button
              variant="outline"
              loading={busy === "publishing"}
              loadingText={COPY.unpublishing}
              disabled={busy !== "idle" && busy !== "publishing"}
              onClick={() =>
                lessonCount > 0
                  ? setConfirm("unpublish")
                  : void setPublishedTo(false)
              }
            >
              {COPY.unpublish}
            </Button>
          ) : (
            <Button
              variant="outline"
              loading={busy === "publishing"}
              loadingText={COPY.publishing}
              disabled={
                publishBlock !== null ||
                (busy !== "idle" && busy !== "publishing")
              }
              aria-describedby={publishBlock ? ids.reason : undefined}
              onClick={() => void setPublishedTo(true)}
            >
              {COPY.publish}
            </Button>
          )}
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
          <Field htmlFor={ids.name} label={COPY.name} error={errors.name}>
            <Input
              id={ids.name}
              value={draft.name}
              maxLength={80}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? messageId(ids.name) : undefined}
              onChange={(e) => {
                const name = e.currentTarget.value;
                setDraft((d) => ({
                  ...d,
                  name,
                  slug: slugTouched ? d.slug : slugify(name),
                }));
                setStatus(null);
              }}
            />
          </Field>
          <Field
            htmlFor={ids.slug}
            label={COPY.slug}
            help={published ? COPY.slugHelpPublished : COPY.slugHelp}
            error={errors.slug}
          >
            <Input
              id={ids.slug}
              value={draft.slug}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={messageId(ids.slug)}
              onChange={(e) => {
                setSlugTouched(true);
                setServerSlugError(null);
                update("slug", e.currentTarget.value.toLowerCase());
              }}
            />
          </Field>
          <Field htmlFor={ids.category} label={COPY.category}>
            <Select
              value={draft.category}
              onValueChange={(v) => update("category", v as StepCategory)}
            >
              <SelectTrigger id={ids.category}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_SINGULAR[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field htmlFor={ids.difficulty} label={COPY.difficulty}>
            <Select
              value={String(draft.difficulty)}
              onValueChange={(v) => update("difficulty", Number(v))}
            >
              <SelectTrigger id={ids.difficulty}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((level) => (
                  <SelectItem key={level} value={String(level)}>
                    {`${level} · ${DIFFICULTY_NAMES[level as DifficultyLevel]}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            htmlFor={ids.phrases}
            label={COPY.phrases}
            help={COPY.phrasesHelp}
            error={errors.phrases}
          >
            <Input
              id={ids.phrases}
              type="number"
              inputMode="numeric"
              min={1}
              max={16}
              step={1}
              value={draft.phrases}
              aria-invalid={errors.phrases ? true : undefined}
              aria-describedby={messageId(ids.phrases)}
              onChange={(e) => update("phrases", e.currentTarget.value)}
            />
          </Field>
          <Field
            htmlFor={ids.sortOrder}
            label={COPY.sortOrder}
            help={COPY.sortOrderHelp}
            error={errors.sortOrder}
          >
            <Input
              id={ids.sortOrder}
              type="number"
              inputMode="numeric"
              min={0}
              max={32767}
              step={1}
              value={draft.sortOrder}
              aria-invalid={errors.sortOrder ? true : undefined}
              aria-describedby={messageId(ids.sortOrder)}
              onChange={(e) => update("sortOrder", e.currentTarget.value)}
            />
          </Field>
        </FieldGrid>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-positions`}
        title={COPY.positionsSection}
        description={COPY.positionsText}
      >
        <FieldGrid>
          <PositionField
            id={ids.start}
            label={COPY.startPosition}
            value={draft.startPositionId}
            positions={positions}
            error={errors.startPositionId}
            onChange={(v) => update("startPositionId", v)}
          />
          <PositionField
            id={ids.end}
            label={COPY.endPosition}
            value={draft.endPositionId}
            positions={positions}
            error={errors.endPositionId}
            onChange={(v) => update("endPositionId", v)}
          />
        </FieldGrid>
        <div className="flex flex-col divide-y divide-divider">
          <SwitchField
            label={COPY.canStart}
            description={COPY.canStartHelp}
            checked={draft.canStart}
            onCheckedChange={(on) => update("canStart", on)}
          />
          <SwitchField
            label={COPY.canEnd}
            description={COPY.canEndHelp}
            checked={draft.canEnd}
            onCheckedChange={(on) => update("canEnd", on)}
          />
          <SwitchField
            label={COPY.repeatable}
            description={COPY.repeatableHelp}
            checked={draft.repeatable}
            onCheckedChange={(on) => update("repeatable", on)}
          />
        </div>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-description`}
        title={COPY.descriptionSection}
      >
        <FieldGrid>
          <Field
            htmlFor={ids.description}
            label={COPY.description}
            help={COPY.descriptionHelp}
            error={errors.description}
            wide
          >
            <Textarea
              id={ids.description}
              value={draft.description}
              maxLength={2000}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={messageId(ids.description)}
              onChange={(e) => update("description", e.currentTarget.value)}
            />
          </Field>
        </FieldGrid>
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-1 type-small font-medium text-text">
            {COPY.beatsTitle}
          </legend>
          <p className="type-small text-text-secondary">{COPY.beatsText}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            {draft.beatNotes.map((note, i) => {
              const beatId = `${ids.beats}-${i + 1}`;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: el índice es el tiempo de la frase (fijo).
                  key={i}
                  className="flex min-w-0 flex-col gap-1.5"
                >
                  <label
                    htmlFor={beatId}
                    className="type-small font-medium text-text"
                  >
                    {COPY.beat(i + 1)}
                  </label>
                  <Input
                    id={beatId}
                    value={note}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setDraft((d) => ({
                        ...d,
                        beatNotes: d.beatNotes.map((n, j) =>
                          j === i ? value : n,
                        ),
                      }));
                      setStatus(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-relations`}
        title={COPY.relationsSection}
      >
        <FieldGrid>
          <Field
            htmlFor={ids.variation}
            label={COPY.variationOf}
            help={COPY.variationHelp}
            error={errors.variationOf}
          >
            <Select
              value={draft.variationOf ?? "none"}
              onValueChange={(v) =>
                update("variationOf", v === "none" ? null : v)
              }
            >
              <SelectTrigger
                id={ids.variation}
                aria-describedby={messageId(ids.variation)}
                aria-invalid={errors.variationOf ? true : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{COPY.none}</SelectItem>
                {others.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
        <fieldset
          aria-describedby={`${ids.prereqs}-help`}
          className="flex min-w-0 flex-col gap-2"
        >
          <legend className="mb-1 type-small font-medium text-text">
            {COPY.prerequisites}
          </legend>
          <p
            id={`${ids.prereqs}-help`}
            className="type-small text-text-secondary"
          >
            {COPY.prerequisitesHelp}
          </p>
          {others.length === 0 ? (
            <p className="type-small text-text-secondary">
              {COPY.noOtherSteps}
            </p>
          ) : (
            <ul className="grid max-h-80 grid-cols-1 overflow-y-auto rounded-sm border border-divider px-3 md:grid-cols-2">
              {others.map((r) => {
                const checkId = `${ids.prereqs}-${r.id}`;
                const checked = draft.prerequisites.includes(r.id);
                return (
                  <li key={r.id} className="flex min-h-12 items-center gap-3">
                    <Checkbox
                      id={checkId}
                      checked={checked}
                      onCheckedChange={(on) =>
                        update(
                          "prerequisites",
                          on === true
                            ? [...draft.prerequisites, r.id]
                            : draft.prerequisites.filter((p) => p !== r.id),
                        )
                      }
                    />
                    <label
                      htmlFor={checkId}
                      className="min-w-0 flex-1 cursor-pointer py-3 type-small text-text"
                    >
                      {r.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-media`}
        title={COPY.mediaSection}
        description={COPY.mediaText}
      >
        <StepMedia
          stepId={stepId}
          slots={slots}
          videos={videos}
          voiceClipPath={voiceClipPath}
          initialUploading={initialUploading}
          port={port}
          storage={storage}
          onVideosChange={(next) => {
            setVideos(next);
            if (stepId) void refreshIssues(stepId);
          }}
          onVoiceClipChange={(path) => {
            setVoiceClipPath(path);
            if (stepId)
              onRowChange(
                rowFrom(baseline, { id: stepId, hasVoiceClip: path !== null }),
                false,
              );
          }}
        />
      </EditorSection>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm === "remove"
              ? COPY.removeTitle(title)
              : COPY.unpublishTitle(title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === "remove"
              ? COPY.removeText
              : COPY.unpublishText(lessonCount)}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {confirm === "remove" ? COPY.removeStay : COPY.unpublishStay}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirm === "remove"
                  ? void remove()
                  : void setPublishedTo(false)
              }
            >
              {confirm === "remove"
                ? COPY.removeConfirm
                : COPY.unpublishConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditorCard>
  );
}

function PositionField({
  id,
  label,
  value,
  positions,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  positions: readonly AdminPosition[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field htmlFor={id} label={label} error={error}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId(id) : undefined}
        >
          <SelectValue placeholder={COPY.pickPosition} />
        </SelectTrigger>
        <SelectContent>
          {positions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
