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
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminSongDetail,
  type AdminSongRow,
  type AdminSongStyle,
  type DifficultyChoice,
  emptySongDraft,
  isSongDraftDirty,
  SONG_ISSUE_TEXT,
  type SongDraft,
  type SongDraftField,
  type SongIssue,
  type SongRhythm,
  songWriteErrorMessage,
  trimSongDraft,
  validateSongDraft,
} from "@/lib/admin/songs";
import type { AdminSongsPort } from "@/lib/admin/songs-port";
import type { StoragePort } from "@/lib/admin/storage";
import { formatDuration } from "@/lib/admin/upload";
import {
  DIFFICULTY_NAMES,
  DIFFICULTY_OPTIONS,
  difficultyName,
} from "@/lib/difficulty";
import { formatBpm } from "@/lib/songs/songs";
import { SongAudio, SongLicenseDocument } from "./song-media";

// Copy provisional (CONTENT_CHECKLIST fila 86).
const COPY = {
  newTitle: "Nueva canción",
  untitled: "Canción sin título",
  eyebrow: "Canción",
  published: "Publicada",
  draft: "Borrador",
  dataSection: "Datos",
  title: "Título",
  artist: "Artista",
  difficulty: "Dificultad",
  difficultyAuto: (level: number | null) =>
    level === null
      ? "Automática (sin BPM todavía)"
      : `Automática · ${difficultyName(level) ?? level}`,
  difficultyHelp:
    "La automática sale del BPM y de las bandas del primer estilo. Elige un nivel solo si quieres fijarlo.",
  stylesTitle: "Estilos",
  stylesHelp: "En qué estilos se puede practicar. Al menos uno para publicar.",
  noStyles: "Todavía no hay estilos.",
  unpublishedStyle: "sin publicar",
  audioSection: "Audio",
  audioText:
    "Se guarda al subirlo, sin esperar a Guardar. La duración se lee del archivo. Si cambias el audio, revisa el ritmo en el analizador.",
  licenseSection: "Licencia",
  licenseText:
    "Sin fuente y documento no se publica (D009). Vencida, deja de verse para los alumnos.",
  licenseSource: "Fuente",
  licenseSourceHelp:
    "De dónde sale el permiso de uso: sello, autor, contrato. Máximo 200 caracteres.",
  licenseExpires: "Vence el",
  licenseExpiresHelp: "Opcional. Vacío = sin vencimiento.",
  licenseNotes: "Notas",
  licenseNotesHelp: "Condiciones del permiso. Máximo 2000 caracteres.",
  rhythmSection: "Ritmo",
  rhythmText: "Solo lectura: lo marca el analizador de ritmo.",
  bpm: "BPM",
  anchors: "El “1” y las anclas",
  anchorsValue: (n: number) => (n === 1 ? "1 ancla" : `${n} anclas marcadas`),
  danceEnd: "Fin de baile",
  missingRhythm: "Márcala en el analizador de ritmo (llega pronto).",
  noValue: "Sin marcar",
  save: "Guardar",
  saving: "Guardando…",
  saved: "Guardado.",
  created: "Canción creada. Ya puedes subir su audio y su licencia.",
  fixErrors: "Revisa los campos marcados.",
  publish: "Publicar",
  publishing: "Publicando…",
  unpublish: "Despublicar",
  unpublishing: "Despublicando…",
  publishedOk: "Publicada.",
  unpublishedOk: "Despublicada.",
  saveFirst: "Guarda la canción antes de publicarla.",
  saveChangesFirst: "Guarda los cambios antes de publicar.",
  remove: "Borrar",
  removing: "Borrando…",
  removeTitle: (name: string) => `¿Borrar «${name}»?`,
  removeText:
    "Se borran la canción, su audio y el documento de la licencia. No se puede deshacer.",
  removeStay: "Conservar la canción",
  removeConfirm: "Borrar la canción",
  unpublishTitle: (name: string) => `¿Despublicar «${name}»?`,
  unpublishText: (n: number) =>
    `La ${n === 1 ? "usa 1 lección" : `usan ${n} lecciones`} como práctica o canción final. Mientras esté sin publicar, los alumnos no la ven.`,
  unpublishStay: "Mantener publicada",
  unpublishConfirm: "Despublicar",
} as const;

type Status = { tone: "success" | "error"; text: string } | null;
type Busy = "idle" | "saving" | "publishing" | "removing";

export type SongEditorProps = {
  styles: readonly AdminSongStyle[];
  /** `null` = canción nueva. */
  detail: AdminSongDetail | null;
  /** Fila de la lista de esta canción (lo que calcula la base: licencia, dificultad). */
  row: AdminSongRow | null;
  /** Estilos marcados de entrada en una canción nueva. */
  newStyleIds?: string[];
  port: AdminSongsPort;
  storage: StoragePort;
  initialStatus?: Status;
  /** La fila de la lista cambió (guardado, publicado, archivos). */
  onRowChange: (row: AdminSongRow, created: boolean) => void;
  /** Se borró: la vista vuelve a la lista. */
  onRemoved: (id: string) => void;
  /** Muestras: ese archivo arranca en "Subiendo…". */
  initialUploading?: "audio" | "document";
};

const NO_RHYTHM: SongRhythm = { bpm: null, anchors: 0, danceEndMs: null };

/**
 * Editor de una canción (handoff §3 Admin, patrón lista + editor). Los datos y los estilos se
 * guardan con el botón (`admin_save_song`, todo o nada); audio, documento y publicar se
 * escriben al momento. Qué bloquea publicar lo dice la base (`admin_song_issues`); aquí solo
 * se muestra antes del botón. El ritmo (BPM, anclas, fin de baile) es del analizador (ola C).
 */
export function SongEditor({
  styles,
  detail,
  row,
  newStyleIds = [],
  port,
  storage,
  initialStatus = null,
  onRowChange,
  onRemoved,
  initialUploading,
}: SongEditorProps) {
  const ids = {
    title: useId(),
    songTitle: useId(),
    artist: useId(),
    difficulty: useId(),
    styles: useId(),
    source: useId(),
    expires: useId(),
    notes: useId(),
    reason: useId(),
    sections: useId(),
  };
  const guard = useLeaveGuard();

  const initial = detail?.draft ?? emptySongDraft(newStyleIds);
  const [songId, setSongId] = useState<string | null>(detail?.id ?? null);
  const [baseline, setBaseline] = useState<SongDraft>(initial);
  const [draft, setDraft] = useState<SongDraft>(initial);
  const [published, setPublished] = useState(detail?.published ?? false);
  const [audio, setAudio] = useState({
    path: detail?.audioPath ?? null,
    durationMs: detail?.durationMs ?? null,
  });
  const [documentPath, setDocumentPath] = useState(
    detail?.licenseDocumentPath ?? null,
  );
  const [issues, setIssues] = useState<SongIssue[]>(detail?.issues ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState<Busy>("idle");
  const [confirm, setConfirm] = useState<"remove" | "unpublish" | null>(null);
  const lessonCount = detail?.lessonCount ?? 0;
  const rhythm = detail?.rhythm ?? NO_RHYTHM;
  const autoDifficulty = detail?.autoDifficulty ?? row?.autoDifficulty ?? null;

  const dirty = isSongDraftDirty(draft, baseline);
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const errors: Partial<Record<SongDraftField, string>> = submitted
    ? validateSongDraft(draft)
    : {};
  const title = songId ? baseline.title || COPY.untitled : COPY.newTitle;

  function update<K extends keyof SongDraft>(key: K, value: SongDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus(null);
  }

  /** La fila de la lista con lo que se sabe aquí; la próxima lectura trae lo que calcula la base. */
  function rowFrom(
    d: SongDraft,
    over: Partial<AdminSongRow> = {},
  ): AdminSongRow {
    const slugs = styles
      .filter((s) => d.styleIds.includes(s.id))
      .map((s) => s.slug);
    const override = d.difficulty === "auto" ? null : Number(d.difficulty);
    return {
      id: songId ?? "",
      title: d.title.trim(),
      artist: d.artist.trim(),
      published,
      styleSlugs: slugs,
      ready:
        audio.path !== null &&
        audio.durationMs !== null &&
        rhythm.anchors >= 2 &&
        rhythm.danceEndMs !== null,
      hasAudio: audio.path !== null,
      bpm: rhythm.bpm,
      durationMs: audio.durationMs,
      licenseSource: d.licenseSource.trim() || null,
      hasLicenseDocument: documentPath !== null,
      licenseExpiresAt: d.licenseExpiresAt || null,
      licenseStatus: row?.licenseStatus ?? "ok",
      lessonCount,
      difficultyOverride: override,
      autoDifficulty,
      difficulty: override ?? autoDifficulty,
      ...over,
    };
  }

  async function refreshIssues(id: string, over: Partial<AdminSongRow>) {
    const result = await port.issues(id);
    if (!result.error) setIssues(result.issues);
    onRowChange(rowFrom(baseline, { id, ...over }), false);
  }

  async function save() {
    setSubmitted(true);
    const found = validateSongDraft(draft);
    const firstInvalid = (Object.keys(found) as SongDraftField[])[0];
    if (firstInvalid) {
      setStatus({ tone: "error", text: COPY.fixErrors });
      const fieldIds: Record<SongDraftField, string> = {
        title: ids.songTitle,
        artist: ids.artist,
        licenseSource: ids.source,
        licenseNotes: ids.notes,
        licenseExpiresAt: ids.expires,
      };
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }
    setBusy("saving");
    setStatus(null);
    const result = await port.save(songId, draft);
    setBusy("idle");
    if (result.error || !result.id) {
      setStatus({
        tone: "error",
        text: songWriteErrorMessage(result.error ?? { message: "" }),
      });
      return;
    }
    const created = songId === null;
    const id = result.id;
    const saved = trimSongDraft(draft);
    setSongId(id);
    setBaseline(saved);
    setDraft(saved);
    setSubmitted(false);
    setStatus({ tone: "success", text: created ? COPY.created : COPY.saved });
    // Los motivos dependen de estilos y licencia: se vuelven a pedir después de guardar.
    const next = await port.issues(id);
    if (!next.error) setIssues(next.issues);
    onRowChange(rowFrom(saved, { id }), created);
  }

  async function setPublishedTo(on: boolean) {
    if (!songId) return;
    setBusy("publishing");
    setStatus(null);
    const { error } = await port.setPublished(songId, on);
    setBusy("idle");
    if (error) {
      setStatus({ tone: "error", text: songWriteErrorMessage(error) });
      if (error.code === "MS201") await refreshIssues(songId, {});
      return;
    }
    setPublished(on);
    setStatus({
      tone: "success",
      text: on ? COPY.publishedOk : COPY.unpublishedOk,
    });
    onRowChange(rowFrom(baseline, { id: songId, published: on }), false);
  }

  async function remove() {
    if (!songId) return;
    setBusy("removing");
    setStatus(null);
    const { error } = await port.remove(songId);
    if (error) {
      setBusy("idle");
      setStatus({ tone: "error", text: songWriteErrorMessage(error) });
      return;
    }
    // La fila ya no existe: los archivos quedan sin uso y se borran (si falla, solo se registra).
    const removals = [
      audio.path
        ? storage.remove("songs", [audio.path])
        : Promise.resolve({ error: null }),
      documentPath
        ? storage.remove("song-licenses", [documentPath])
        : Promise.resolve({ error: null }),
    ];
    for (const r of await Promise.all(removals))
      if (r.error) console.error("Archivos de la canción sin borrar", r.error);
    setDirty(false);
    onRemoved(songId);
  }

  // Motivo del bloqueo de Publicar, en texto antes del botón (handoff §3 Admin).
  const publishBlock = published
    ? null
    : !songId
      ? COPY.saveFirst
      : dirty
        ? COPY.saveChangesFirst
        : issues.length > 0
          ? issues.map((i) => SONG_ISSUE_TEXT[i]).join(" ")
          : null;

  const rhythmMissing = rhythm.anchors < 2 || rhythm.danceEndMs === null;

  return (
    <EditorCard
      titleId={ids.title}
      title={title}
      eyebrow={COPY.eyebrow}
      badges={
        songId ? (
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
          {songId && !published && lessonCount === 0 ? (
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
          <Field
            htmlFor={ids.songTitle}
            label={COPY.title}
            error={errors.title}
          >
            <Input
              id={ids.songTitle}
              value={draft.title}
              maxLength={120}
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={
                errors.title ? messageId(ids.songTitle) : undefined
              }
              onChange={(e) => update("title", e.currentTarget.value)}
            />
          </Field>
          <Field htmlFor={ids.artist} label={COPY.artist} error={errors.artist}>
            <Input
              id={ids.artist}
              value={draft.artist}
              maxLength={120}
              autoComplete="off"
              aria-invalid={errors.artist ? true : undefined}
              aria-describedby={
                errors.artist ? messageId(ids.artist) : undefined
              }
              onChange={(e) => update("artist", e.currentTarget.value)}
            />
          </Field>
          <Field
            htmlFor={ids.difficulty}
            label={COPY.difficulty}
            help={COPY.difficultyHelp}
            wide
          >
            <Select
              value={draft.difficulty}
              onValueChange={(v) => update("difficulty", v as DifficultyChoice)}
            >
              <SelectTrigger
                id={ids.difficulty}
                aria-describedby={messageId(ids.difficulty)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  {COPY.difficultyAuto(autoDifficulty)}
                </SelectItem>
                {DIFFICULTY_OPTIONS.map((level) => (
                  <SelectItem key={level} value={String(level)}>
                    {`${level} · ${DIFFICULTY_NAMES[level]}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>
        <fieldset
          aria-describedby={`${ids.styles}-help`}
          className="flex min-w-0 flex-col gap-2"
        >
          <legend className="mb-1 type-small font-medium text-text">
            {COPY.stylesTitle}
          </legend>
          <p
            id={`${ids.styles}-help`}
            className="type-small text-text-secondary"
          >
            {COPY.stylesHelp}
          </p>
          {styles.length === 0 ? (
            <p className="type-small text-text-secondary">{COPY.noStyles}</p>
          ) : (
            <ul className="grid grid-cols-1 rounded-sm border border-divider px-3 md:grid-cols-2">
              {styles.map((s) => {
                const checkId = `${ids.styles}-${s.id}`;
                const checked = draft.styleIds.includes(s.id);
                return (
                  <li key={s.id} className="flex min-h-12 items-center gap-3">
                    <Checkbox
                      id={checkId}
                      checked={checked}
                      onCheckedChange={(on) =>
                        update(
                          "styleIds",
                          on === true
                            ? [...draft.styleIds, s.id]
                            : draft.styleIds.filter((id) => id !== s.id),
                        )
                      }
                    />
                    <label
                      htmlFor={checkId}
                      className="min-w-0 flex-1 cursor-pointer py-3 type-small text-text"
                    >
                      {s.name}
                      {s.published ? null : (
                        <span className="text-text-secondary">
                          {` · ${COPY.unpublishedStyle}`}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-audio`}
        title={COPY.audioSection}
        description={COPY.audioText}
      >
        <SongAudio
          songId={songId}
          path={audio.path}
          durationMs={audio.durationMs}
          port={port}
          storage={storage}
          initialUploading={initialUploading === "audio"}
          onChange={(next) => {
            setAudio(next);
            if (songId)
              void refreshIssues(songId, {
                hasAudio: next.path !== null,
                durationMs: next.durationMs,
                ready:
                  next.path !== null &&
                  next.durationMs !== null &&
                  !rhythmMissing,
              });
          }}
        />
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-license`}
        title={COPY.licenseSection}
        description={COPY.licenseText}
      >
        <FieldGrid>
          <Field
            htmlFor={ids.source}
            label={COPY.licenseSource}
            help={COPY.licenseSourceHelp}
            error={errors.licenseSource}
          >
            <Input
              id={ids.source}
              value={draft.licenseSource}
              maxLength={200}
              autoComplete="off"
              aria-invalid={errors.licenseSource ? true : undefined}
              aria-describedby={messageId(ids.source)}
              onChange={(e) => update("licenseSource", e.currentTarget.value)}
            />
          </Field>
          <Field
            htmlFor={ids.expires}
            label={COPY.licenseExpires}
            help={COPY.licenseExpiresHelp}
            error={errors.licenseExpiresAt}
          >
            <Input
              id={ids.expires}
              type="date"
              value={draft.licenseExpiresAt}
              aria-invalid={errors.licenseExpiresAt ? true : undefined}
              aria-describedby={messageId(ids.expires)}
              onChange={(e) =>
                update("licenseExpiresAt", e.currentTarget.value)
              }
            />
          </Field>
          <Field
            htmlFor={ids.notes}
            label={COPY.licenseNotes}
            help={COPY.licenseNotesHelp}
            error={errors.licenseNotes}
            wide
          >
            <Textarea
              id={ids.notes}
              value={draft.licenseNotes}
              maxLength={2000}
              aria-invalid={errors.licenseNotes ? true : undefined}
              aria-describedby={messageId(ids.notes)}
              onChange={(e) => update("licenseNotes", e.currentTarget.value)}
            />
          </Field>
        </FieldGrid>
        <SongLicenseDocument
          songId={songId}
          path={documentPath}
          port={port}
          storage={storage}
          initialUploading={initialUploading === "document"}
          onChange={(path) => {
            setDocumentPath(path);
            if (songId)
              void refreshIssues(songId, { hasLicenseDocument: path !== null });
          }}
        />
      </EditorSection>

      <EditorSection
        id={`${ids.sections}-rhythm`}
        title={COPY.rhythmSection}
        description={COPY.rhythmText}
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <RhythmFact
            term={COPY.bpm}
            value={rhythm.bpm === null ? null : formatBpm(rhythm.bpm)}
          />
          <RhythmFact
            term={COPY.anchors}
            value={
              rhythm.anchors >= 2 ? COPY.anchorsValue(rhythm.anchors) : null
            }
          />
          <RhythmFact
            term={COPY.danceEnd}
            value={formatDuration(rhythm.danceEndMs)}
          />
        </dl>
        {rhythmMissing ? (
          <p className="type-small text-text-secondary">{COPY.missingRhythm}</p>
        ) : null}
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

function RhythmFact({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="type-small font-medium text-text">{term}</dt>
      <dd className="type-body tabular-nums text-text-secondary">
        {value ?? COPY.noValue}
      </dd>
    </div>
  );
}
