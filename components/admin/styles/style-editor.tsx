"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  EditorActions,
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
import { SwitchField } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  type AdminStyleFull,
  BAND_LEVELS,
  BEATS_PER_PHRASE_OPTIONS,
  BPM_MAX,
  BPM_MIN,
  bandRangeLabel,
  CALL_SPAN_OPTIONS,
  callEndBeat,
  catalogIssueText,
  emptyStyleDraft,
  isStyleDraftDirty,
  LEAD_IN_OPTIONS,
  STYLE_ISSUE_TEXT,
  type StyleDraft,
  type StyleDraftField,
  type StyleIssue,
  type StylePosition,
  type StyleStep,
  slugify,
  stepsWithNotesBeyond,
  styleCatalogIssues,
  styleToDraft,
  styleWriteErrorMessage,
  toggleSpokenBeat,
  validateStyleDraft,
  withBeatsPerPhrase,
} from "@/lib/admin/styles";
import type { AdminStylesPort } from "@/lib/admin/styles-port";
import { stepCountLabel } from "@/lib/steps/catalog";
import { cn } from "@/lib/utils";
import { StyleCard } from "./style-card";
import { StylePositions } from "./style-positions";

// Copy provisional (CONTENT_CHECKLIST fila 88).
const COPY = {
  newTitle: "Nuevo estilo",
  untitled: "Estilo sin nombre",
  eyebrow: "Estilo",
  published: "Publicado",
  draft: "Borrador",
  counts: (
    s: Pick<
      AdminStyleFull,
      "stepCount" | "stepsPublished" | "songCount" | "hasCourse"
    >,
  ) =>
    [
      s.stepCount === 0
        ? "Sin pasos"
        : `${stepCountLabel(s.stepCount)} (${s.stepsPublished} publicados)`,
      s.songCount === 0
        ? "sin canciones"
        : s.songCount === 1
          ? "1 canción"
          : `${s.songCount} canciones`,
      s.hasCourse ? "con curso" : "sin curso",
    ].join(" · "),
  newText:
    "Arranca con la configuración de salsa casino. Al crearlo queda sin publicar, con su posición inicial.",
  dataTitle: "Datos",
  name: "Nombre",
  slug: "Slug",
  slugHelp: "Identifica el estilo en las URLs del alumno y del panel. Único.",
  slugHelpChanged:
    "Cambiar el slug de un estilo publicado rompe los enlaces que los alumnos tengan guardados.",
  sortOrder: "Orden",
  sortOrderHelp: "El menor va primero, aquí y en la app del alumno.",
  hasRoles: "Tiene roles (líder y seguidor)",
  hasRolesHelp:
    "Con roles, cada paso pide un video por rol; sin roles, un solo video para ambos.",
  hasRolesChanged: (n: number) =>
    `Cambia los videos que piden los ${stepCountLabel(n)} de este estilo: revisa en Pasos los que queden sin video completo.`,
  countTitle: "Cuenta hablada",
  countText:
    "Los tiempos que dice el coach. Los apagados suenan en silencio, pero cuentan.",
  beatsPerPhrase: "Tiempos por frase",
  beatsPerPhraseHelp: "Normalmente 8.",
  spokenLegend: "Tiempos que dice el coach",
  beatChip: (n: number) => String(n),
  beatChipSr: (n: number) => `Tiempo ${n}`,
  notesBeyond: (names: string[]) =>
    `${names.length === 1 ? "Este paso tiene" : "Estos pasos tienen"} notas en tiempos que la frase ya no tendría: ${names.join(", ")}. No se borran, pero dejan de mostrarse (y se pierden si guardas el paso).`,
  callTitle: "Anticipación",
  callText:
    "El coach dice el nombre del paso que viene en la última frase del paso actual.",
  callBeat: "Tiempo del anuncio",
  callSpan: "Tiempos que ocupa",
  callSpanOption: (n: number) => (n === 1 ? "1 tiempo" : `${n} tiempos`),
  callRule: (
    d: Pick<StyleDraft, "callBeat" | "callSpanBeats" | "beatsPerPhrase">,
  ) =>
    `El anuncio ocupa ${
      d.callSpanBeats === 1
        ? `el tiempo ${d.callBeat}`
        : `del tiempo ${d.callBeat} al ${callEndBeat(d)}`
    }; tiene que terminar a más tardar en el ${d.beatsPerPhrase}. Esos números no se cuentan.`,
  repeatNote:
    "Si el paso siguiente repite el actual, no hay anuncio: la pantalla dice «Se repite» (fijo del motor).",
  leadIn: "Frases de entrada",
  leadInHelp: "Frases de cuenta antes del primer paso.",
  leadInOption: (n: number) =>
    n === 0 ? "Sin entrada" : n === 1 ? "1 frase" : `${n} frases`,
  bandsTitle: "Bandas de BPM",
  bandsText:
    "La dificultad automática de las canciones: cada nivel llega hasta su tope; el último, por encima.",
  bandsCaption: "Tope de BPM por nivel de dificultad",
  bandsLevel: "Nivel",
  bandsCap: "Tope (BPM)",
  bandsRange: "Rango",
  bandsOpen: "Abierto",
  bandsCapLabel: (name: string) => `Tope de BPM de ${name}`,
  bandsHelp: `Enteros entre ${BPM_MIN} y ${BPM_MAX}, de menor a mayor.`,
  bandsEmpty:
    "Sin bandas, las canciones de este estilo no tienen dificultad automática (solo la que les pongas a mano).",
  positionsTitle: "Posiciones",
  positionsText:
    "Las posiciones se guardan al momento. La inicial es donde empieza toda combinación.",
  startPosition: "Posición inicial",
  startPositionHelp: "Se guarda con «Guardar».",
  pickPosition: "Elige una posición",
  newPositionName: "Posición inicial",
  newPositionHelp: "Se crea con el estilo. Después puedes añadir más.",
  newPositionSlug: "Slug de la posición inicial",
  catalogTitle: "Catálogo",
  catalogText:
    "Si el generador de combinaciones puede armar prácticas con estos pasos (validación del core). No bloquea publicar.",
  catalogAll: "Con todos los pasos",
  catalogPublished: "Solo con los publicados (lo que ve el alumno)",
  catalogNoStart: "Elige la posición inicial para validar el catálogo.",
  catalogNoSteps: "Aún no hay pasos.",
  catalogOk: "Válido.",
  catalogSaved: "Con lo guardado: la posición inicial cuenta al guardar.",
  save: "Guardar",
  saving: "Guardando…",
  saved: "Guardado.",
  create: "Crear estilo",
  creating: "Creando…",
  created: "Estilo creado, sin publicar.",
  fixErrors: "Revisa los campos marcados.",
  publish: "Publicar",
  publishing: "Publicando…",
  unpublish: "Despublicar",
  unpublishing: "Despublicando…",
  publishedOk: "Publicado.",
  unpublishedOk: "Despublicado.",
  saveChangesFirst: "Guarda los cambios antes de publicar.",
  remove: "Borrar estilo",
  removing: "Borrando…",
  removeBlocked:
    "Solo se borra un estilo sin publicar y vacío (sin pasos, canciones ni curso).",
  removeTitle: (name: string) => `¿Borrar «${name}»?`,
  removeText: "Se borran el estilo y sus posiciones. No se puede deshacer.",
  removeStay: "Conservar el estilo",
  removeConfirm: "Borrar el estilo",
  unpublishTitle: (name: string) => `¿Despublicar «${name}»?`,
  unpublishText:
    "Los alumnos dejan de ver el estilo, sus pasos, canciones y curso hasta que lo vuelvas a publicar.",
  unpublishStay: "Mantener publicado",
  unpublishConfirm: "Despublicar",
} as const;

type Status = { tone: "success" | "error"; text: string } | null;
type Busy = "idle" | "saving" | "publishing" | "removing";

export type StyleEditorProps = {
  /** `null` = estilo nuevo. */
  style: AdminStyleFull | null;
  /** Todos los estilos (slug único). */
  styles: readonly AdminStyleFull[];
  /** Pasos del estilo (catálogo y notas por tiempo). */
  steps: readonly StyleStep[];
  /** `admin_style_issues` del estilo abierto. */
  issues: readonly StyleIssue[];
  newSortOrder: number;
  port: AdminStylesPort;
  initialStatus?: Status;
  /** Se guardó (creado o editado): la vista actualiza la URL y relee. */
  onSaved: (style: { id: string; slug: string }, created: boolean) => void;
  /** Cambió algo que la lista del servidor debe releer (publicar, posiciones). */
  onChanged: () => void;
  /** Se borró: la vista vuelve al primer estilo. */
  onRemoved: (id: string) => void;
};

/**
 * Editor de un estilo (handoff §3 Admin: columna de 880, cards por tema). Datos y configuración
 * del motor se guardan con el botón (`admin_save_style`, todo o nada); posiciones y publicar, al
 * momento. Qué bloquea publicar lo dice la base (`admin_style_issues`); el catálogo es un aviso.
 */
export function StyleEditor({
  style,
  styles,
  steps,
  issues: initialIssues,
  newSortOrder,
  port,
  initialStatus = null,
  onSaved,
  onChanged,
  onRemoved,
}: StyleEditorProps) {
  const ids = {
    title: useId(),
    cards: useId(),
    name: useId(),
    slug: useId(),
    sortOrder: useId(),
    bpp: useId(),
    spoken: useId(),
    callBeat: useId(),
    callSpan: useId(),
    callRule: useId(),
    leadIn: useId(),
    bands: useId(),
    start: useId(),
    startName: useId(),
    startSlug: useId(),
    reason: useId(),
    removeReason: useId(),
  };
  const guard = useLeaveGuard();

  const initial = style ? styleToDraft(style) : emptyStyleDraft(newSortOrder);
  const [styleId, setStyleId] = useState<string | null>(style?.id ?? null);
  const [baseline, setBaseline] = useState<StyleDraft>(initial);
  const [draft, setDraft] = useState<StyleDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(style));
  const [positionSlugTouched, setPositionSlugTouched] = useState(false);
  const [published, setPublished] = useState(style?.published ?? false);
  const [positions, setPositions] = useState<StylePosition[]>(
    style?.positions ?? [],
  );
  const [issues, setIssues] = useState<readonly StyleIssue[]>(initialIssues);
  const [submitted, setSubmitted] = useState(false);
  const [serverSlugError, setServerSlugError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState<Busy>("idle");
  const [confirm, setConfirm] = useState<"remove" | "unpublish" | null>(null);

  const dirty = isStyleDraftDirty(draft, baseline);
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const others = styles.filter((s) => s.id !== styleId);
  const errors: Partial<Record<StyleDraftField, string>> = submitted
    ? validateStyleDraft(draft, { styleId, styles: others })
    : {};
  if (serverSlugError && !errors.slug) errors.slug = serverSlugError;
  // La regla del anuncio se ve siempre, antes del error (handoff: el motivo en texto).
  const callInvalid = callEndBeat(draft) > draft.beatsPerPhrase;

  const isNew = styleId === null;
  const title = isNew ? COPY.newTitle : baseline.name || COPY.untitled;
  const counts = style ?? {
    stepCount: 0,
    stepsPublished: 0,
    songCount: 0,
    hasCourse: false,
  };
  const deletable =
    !isNew &&
    !published &&
    counts.stepCount === 0 &&
    counts.songCount === 0 &&
    !counts.hasCourse;
  const notesBeyond = stepsWithNotesBeyond(steps, draft.beatsPerPhrase);

  function update<K extends keyof StyleDraft>(key: K, value: StyleDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus(null);
  }

  async function save() {
    setSubmitted(true);
    setServerSlugError(null);
    const found = validateStyleDraft(draft, { styleId, styles: others });
    const firstInvalid = (Object.keys(found) as StyleDraftField[])[0];
    if (firstInvalid) {
      setStatus({ tone: "error", text: COPY.fixErrors });
      const fieldIds: Record<StyleDraftField, string> = {
        name: ids.name,
        slug: ids.slug,
        sortOrder: ids.sortOrder,
        spokenBeats: `${ids.spoken}-1`,
        call: ids.callBeat,
        bands: `${ids.bands}-1`,
        startPositionName: ids.startName,
        startPositionSlug: ids.startSlug,
      };
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }
    setBusy("saving");
    setStatus(null);
    const result = await port.save(styleId, draft);
    setBusy("idle");
    if (result.error || !result.id) {
      const text = styleWriteErrorMessage(result.error ?? { message: "" });
      if (result.error?.code === "23505") setServerSlugError(text);
      setStatus({ tone: "error", text });
      return;
    }
    const created = styleId === null;
    const saved: StyleDraft = {
      ...draft,
      name: draft.name.trim(),
      startPositionName: "",
      startPositionSlug: "",
    };
    setStyleId(result.id);
    setBaseline(saved);
    setDraft(saved);
    setSubmitted(false);
    setStatus({ tone: "success", text: created ? COPY.created : COPY.saved });
    const next = await port.issues(result.id);
    if (!next.error) setIssues(next.issues);
    onSaved({ id: result.id, slug: saved.slug }, created);
  }

  async function setPublishedTo(on: boolean) {
    if (!styleId) return;
    setBusy("publishing");
    setStatus(null);
    const { error } = await port.setPublished(styleId, on);
    setBusy("idle");
    if (error) {
      setStatus({ tone: "error", text: styleWriteErrorMessage(error) });
      const next = await port.issues(styleId);
      if (!next.error) setIssues(next.issues);
      return;
    }
    setPublished(on);
    setStatus({
      tone: "success",
      text: on ? COPY.publishedOk : COPY.unpublishedOk,
    });
    onChanged();
  }

  async function remove() {
    if (!styleId) return;
    setBusy("removing");
    setStatus(null);
    const { error } = await port.remove(styleId);
    if (error) {
      setBusy("idle");
      setStatus({ tone: "error", text: styleWriteErrorMessage(error) });
      return;
    }
    setDirty(false);
    onRemoved(styleId);
  }

  // Motivo del bloqueo de Publicar, en texto antes del botón (handoff §3 Admin).
  const publishBlock = published
    ? null
    : dirty
      ? COPY.saveChangesFirst
      : issues.length > 0
        ? issues.map((i) => STYLE_ISSUE_TEXT[i]).join(" ")
        : null;

  const positionName = (id: string) =>
    positions.find((p) => p.id === id)?.name ?? "?";
  const savedStart = baseline.startPositionId;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado del estilo: estado, contadores, publicar y borrar. */}
      <section
        aria-labelledby={ids.title}
        className="flex min-w-0 flex-col gap-4 rounded-md border border-divider bg-surface p-5 md:px-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="type-overline text-text-secondary">{COPY.eyebrow}</p>
            <h2 id={ids.title} className="type-h2 break-words">
              {title}
            </h2>
            <p className="type-small text-text-secondary">
              {isNew ? COPY.newText : COPY.counts(counts)}
            </p>
          </div>
          {isNew ? null : (
            <Badge variant={published ? "ok" : "neutral"}>
              {published ? COPY.published : COPY.draft}
            </Badge>
          )}
        </header>
        {isNew ? null : (
          <EditorActions blockReason={publishBlock} blockReasonId={ids.reason}>
            {published ? (
              <Button
                variant="outline"
                loading={busy === "publishing"}
                loadingText={COPY.unpublishing}
                disabled={busy !== "idle" && busy !== "publishing"}
                onClick={() => setConfirm("unpublish")}
              >
                {COPY.unpublish}
              </Button>
            ) : (
              <>
                {deletable ? (
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
              </>
            )}
          </EditorActions>
        )}
        {!isNew && !published && !deletable ? (
          <p className="type-small text-text-secondary">{COPY.removeBlocked}</p>
        ) : null}
      </section>

      <StyleCard id={`${ids.cards}-data`} title={COPY.dataTitle}>
        <FieldGrid>
          <Field htmlFor={ids.name} label={COPY.name} error={errors.name}>
            <Input
              id={ids.name}
              value={draft.name}
              maxLength={60}
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
            help={
              published && draft.slug !== baseline.slug
                ? COPY.slugHelpChanged
                : COPY.slugHelp
            }
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
        <div className="flex flex-col gap-2">
          <SwitchField
            label={COPY.hasRoles}
            description={COPY.hasRolesHelp}
            checked={draft.hasRoles}
            onCheckedChange={(on) => update("hasRoles", on)}
          />
          {!isNew &&
          draft.hasRoles !== baseline.hasRoles &&
          counts.stepCount > 0 ? (
            <Notice>{COPY.hasRolesChanged(counts.stepCount)}</Notice>
          ) : null}
        </div>
      </StyleCard>

      <StyleCard
        id={`${ids.cards}-count`}
        title={COPY.countTitle}
        description={COPY.countText}
      >
        <FieldGrid>
          <Field
            htmlFor={ids.bpp}
            label={COPY.beatsPerPhrase}
            help={COPY.beatsPerPhraseHelp}
          >
            <Select
              value={String(draft.beatsPerPhrase)}
              onValueChange={(v) => {
                setDraft((d) => withBeatsPerPhrase(d, Number(v)));
                setStatus(null);
              }}
            >
              <SelectTrigger id={ids.bpp} aria-describedby={messageId(ids.bpp)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BEATS_PER_PHRASE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {String(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
        <fieldset
          aria-describedby={
            errors.spokenBeats ? `${ids.spoken}-error` : undefined
          }
          className="flex min-w-0 flex-col gap-3"
        >
          <legend className="mb-1 type-small font-medium text-text">
            {COPY.spokenLegend}
          </legend>
          <ul className="flex flex-wrap gap-2">
            {Array.from({ length: draft.beatsPerPhrase }, (_, i) => i + 1).map(
              (beat) => (
                <li key={beat}>
                  <Toggle
                    id={`${ids.spoken}-${beat}`}
                    variant="chip"
                    pressed={draft.spokenBeats.includes(beat)}
                    aria-label={COPY.beatChipSr(beat)}
                    className="min-w-12 tabular-nums"
                    onPressedChange={() =>
                      update(
                        "spokenBeats",
                        toggleSpokenBeat(draft.spokenBeats, beat),
                      )
                    }
                  >
                    {COPY.beatChip(beat)}
                  </Toggle>
                </li>
              ),
            )}
          </ul>
          {errors.spokenBeats ? (
            <FieldMessage id={`${ids.spoken}-error`} tone="error">
              {errors.spokenBeats}
            </FieldMessage>
          ) : null}
        </fieldset>
        {notesBeyond.length > 0 ? (
          <Notice>{COPY.notesBeyond(notesBeyond.map((s) => s.name))}</Notice>
        ) : null}
      </StyleCard>

      <StyleCard
        id={`${ids.cards}-call`}
        title={COPY.callTitle}
        description={COPY.callText}
      >
        <FieldGrid>
          <Field htmlFor={ids.callBeat} label={COPY.callBeat}>
            <Select
              value={String(draft.callBeat)}
              onValueChange={(v) => update("callBeat", Number(v))}
            >
              <SelectTrigger
                id={ids.callBeat}
                aria-invalid={errors.call ? true : undefined}
                aria-describedby={ids.callRule}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: draft.beatsPerPhrase },
                  (_, i) => i + 1,
                ).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {String(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field htmlFor={ids.callSpan} label={COPY.callSpan}>
            <Select
              value={String(draft.callSpanBeats)}
              onValueChange={(v) => update("callSpanBeats", Number(v))}
            >
              <SelectTrigger
                id={ids.callSpan}
                aria-invalid={errors.call ? true : undefined}
                aria-describedby={ids.callRule}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_SPAN_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {COPY.callSpanOption(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div
            id={ids.callRule}
            className="flex flex-col gap-1.5 md:col-span-2"
          >
            <FieldMessage tone={callInvalid ? "error" : "help"}>
              {errors.call ?? COPY.callRule(draft)}
            </FieldMessage>
            <p className="type-small text-text-secondary">{COPY.repeatNote}</p>
          </div>
          <Field
            htmlFor={ids.leadIn}
            label={COPY.leadIn}
            help={COPY.leadInHelp}
          >
            <Select
              value={String(draft.leadInPhrases)}
              onValueChange={(v) => update("leadInPhrases", Number(v))}
            >
              <SelectTrigger
                id={ids.leadIn}
                aria-describedby={messageId(ids.leadIn)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_IN_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {COPY.leadInOption(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
      </StyleCard>

      <StyleCard
        id={`${ids.cards}-bands`}
        title={COPY.bandsTitle}
        description={COPY.bandsText}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse type-small">
            <caption className="sr-only">{COPY.bandsCaption}</caption>
            <thead>
              <tr className="border-b border-divider text-left text-text-secondary">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {COPY.bandsLevel}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {COPY.bandsCap}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {COPY.bandsRange}
                </th>
              </tr>
            </thead>
            <tbody>
              {BAND_LEVELS.map(({ level, name }) => {
                const capId = `${ids.bands}-${level}`;
                const open = level > draft.bands.length;
                return (
                  <tr key={level} className="border-b border-divider">
                    <th
                      scope="row"
                      className="py-2 pr-4 text-left font-medium text-text"
                    >
                      {`${level} · ${name}`}
                    </th>
                    <td className="py-2 pr-4">
                      {open ? (
                        <span className="text-text-secondary">
                          {COPY.bandsOpen}
                        </span>
                      ) : (
                        <Input
                          id={capId}
                          type="number"
                          inputMode="numeric"
                          min={BPM_MIN}
                          max={BPM_MAX}
                          step={1}
                          className="w-28 tabular-nums"
                          aria-label={COPY.bandsCapLabel(name)}
                          aria-invalid={errors.bands ? true : undefined}
                          aria-describedby={`${ids.bands}-message`}
                          value={draft.bands[level - 1]}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            update(
                              "bands",
                              draft.bands.map((b, j) =>
                                j === level - 1 ? value : b,
                              ),
                            );
                          }}
                        />
                      )}
                    </td>
                    <td className="py-2 tabular-nums text-text-secondary">
                      {bandRangeLabel(draft.bands, level) ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <FieldMessage
          id={`${ids.bands}-message`}
          tone={errors.bands ? "error" : "help"}
        >
          {errors.bands ?? COPY.bandsHelp}
        </FieldMessage>
        {draft.bands.every((b) => b.trim() === "") ? (
          <Notice>{COPY.bandsEmpty}</Notice>
        ) : null}
      </StyleCard>

      <StyleCard
        id={`${ids.cards}-positions`}
        title={COPY.positionsTitle}
        description={isNew ? undefined : COPY.positionsText}
      >
        {isNew || styleId === null ? (
          <FieldGrid>
            <Field
              htmlFor={ids.startName}
              label={COPY.newPositionName}
              help={COPY.newPositionHelp}
              error={errors.startPositionName}
            >
              <Input
                id={ids.startName}
                value={draft.startPositionName}
                maxLength={60}
                autoComplete="off"
                aria-invalid={errors.startPositionName ? true : undefined}
                aria-describedby={messageId(ids.startName)}
                onChange={(e) => {
                  const name = e.currentTarget.value;
                  setDraft((d) => ({
                    ...d,
                    startPositionName: name,
                    startPositionSlug: positionSlugTouched
                      ? d.startPositionSlug
                      : slugify(name),
                  }));
                  setStatus(null);
                }}
              />
            </Field>
            <Field
              htmlFor={ids.startSlug}
              label={COPY.newPositionSlug}
              error={errors.startPositionSlug}
            >
              <Input
                id={ids.startSlug}
                value={draft.startPositionSlug}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={errors.startPositionSlug ? true : undefined}
                aria-describedby={
                  errors.startPositionSlug
                    ? messageId(ids.startSlug)
                    : undefined
                }
                onChange={(e) => {
                  setPositionSlugTouched(true);
                  update(
                    "startPositionSlug",
                    e.currentTarget.value.toLowerCase(),
                  );
                }}
              />
            </Field>
          </FieldGrid>
        ) : (
          <>
            <FieldGrid>
              <Field
                htmlFor={ids.start}
                label={COPY.startPosition}
                help={COPY.startPositionHelp}
              >
                <Select
                  value={draft.startPositionId || undefined}
                  onValueChange={(v) => update("startPositionId", v)}
                >
                  <SelectTrigger
                    id={ids.start}
                    aria-describedby={messageId(ids.start)}
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
            </FieldGrid>
            <StylePositions
              styleId={styleId}
              positions={positions}
              startPositionId={savedStart || null}
              port={port}
              onChange={(next) => {
                setPositions(next);
                onChanged();
              }}
            />
          </>
        )}
      </StyleCard>

      {isNew ? null : (
        <StyleCard
          id={`${ids.cards}-catalog`}
          title={COPY.catalogTitle}
          description={COPY.catalogText}
        >
          {!draft.startPositionId ? (
            <p className="type-small text-text-secondary">
              {COPY.catalogNoStart}
            </p>
          ) : steps.length === 0 ? (
            <p className="type-small text-text-secondary">
              {COPY.catalogNoSteps}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[false, true].map((onlyPublished) => {
                const found = styleCatalogIssues(
                  steps,
                  positions,
                  draft.startPositionId,
                  onlyPublished,
                );
                return (
                  <div
                    key={String(onlyPublished)}
                    className="flex min-w-0 flex-col gap-2"
                  >
                    <h3 className="type-small font-semibold text-text">
                      {onlyPublished ? COPY.catalogPublished : COPY.catalogAll}
                    </h3>
                    {found.length === 0 ? (
                      <p className="flex items-start gap-1.5 type-small text-success">
                        <CircleCheck
                          aria-hidden="true"
                          strokeWidth={ICON_STROKE}
                          className="mt-px size-4.5 shrink-0"
                        />
                        {COPY.catalogOk}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {found.map((issue) => (
                          <li
                            key={`${issue.code}-${issue.position}`}
                            className="flex items-start gap-1.5 type-small text-text"
                          >
                            <TriangleAlert
                              aria-hidden="true"
                              strokeWidth={ICON_STROKE}
                              className="mt-px size-4.5 shrink-0 text-warning"
                            />
                            {catalogIssueText(issue, positionName)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </StyleCard>
      )}

      <div className="rounded-md border border-divider bg-surface p-5 md:px-6">
        <EditorActions
          status={
            status ? (
              <FieldMessage tone={status.tone}>{status.text}</FieldMessage>
            ) : null
          }
        >
          <Button
            loading={busy === "saving"}
            loadingText={isNew ? COPY.creating : COPY.saving}
            disabled={busy !== "idle" && busy !== "saving"}
            onClick={() => void save()}
          >
            {isNew ? COPY.create : COPY.save}
          </Button>
        </EditorActions>
      </div>

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
            {confirm === "remove" ? COPY.removeText : COPY.unpublishText}
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
    </div>
  );
}

/** Aviso en línea (no bloquea): ícono + texto, el estado no depende solo del color. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-sm bg-warning-bg p-3 type-small text-text",
      )}
    >
      <TriangleAlert
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className="mt-px size-4.5 shrink-0 text-warning"
      />
      <span>{children}</span>
    </p>
  );
}
