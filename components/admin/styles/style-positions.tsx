"use client";

import { useId, useState } from "react";
import { Field, messageId } from "@/components/admin/list-editor/editor-card";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  SLUG_PATTERN,
  type StylePosition,
  slugify,
  styleWriteErrorMessage,
} from "@/lib/admin/styles";
import type { AdminStylesPort } from "@/lib/admin/styles-port";
import { stepCountLabel } from "@/lib/steps/catalog";

// Copy provisional (CONTENT_CHECKLIST fila 88).
const COPY = {
  listLabel: "Posiciones del estilo",
  none: "Este estilo aún no tiene posiciones.",
  initial: "inicial",
  editTitle: (name: string) => `Posición «${name}»`,
  name: "Nombre",
  rename: "Guardar nombre",
  renaming: "Guardando…",
  renamed: "Nombre guardado.",
  remove: "Borrar posición",
  removing: "Borrando…",
  removed: "Posición borrada.",
  inUse: (n: number) =>
    `No se puede borrar: la ${n === 1 ? "usa 1 paso" : `usan ${n} pasos`}.`,
  isInitial: "No se puede borrar: es la posición inicial.",
  addTitle: "Nueva posición",
  newName: "Nombre de la posición",
  newSlug: "Slug de la posición",
  slugHelp: "Único en el estilo. Minúsculas sin acentos, números y guiones.",
  add: "Añadir posición",
  adding: "Añadiendo…",
  added: "Posición añadida.",
  nameRequired: "Escribe el nombre.",
  nameLong: "Máximo 60 caracteres.",
  slugRequired: "Escribe el slug.",
  slugPattern: "Solo minúsculas sin acentos, números y guiones.",
  slugTaken: "Ya hay una posición con este slug en el estilo.",
} as const;

type Status = { tone: "success" | "error"; text: string } | null;

/**
 * Posiciones de un estilo como chips con su contador de pasos (handoff §3 Admin). Se escriben al
 * momento, sin esperar a "Guardar": añadir, renombrar y borrar (solo una sin pasos que no sea la
 * inicial; la base lo vuelve a comprobar, D166). El slug no se cambia después de crearla.
 */
export function StylePositions({
  styleId,
  positions,
  startPositionId,
  port,
  onChange,
}: {
  styleId: string;
  positions: readonly StylePosition[];
  /** La inicial guardada (la que la base protege). */
  startPositionId: string | null;
  port: AdminStylesPort;
  onChange: (positions: StylePosition[]) => void;
}) {
  const ids = {
    list: useId(),
    edit: useId(),
    name: useId(),
    newName: useId(),
    newSlug: useId(),
    reason: useId(),
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = positions.find((p) => p.id === selectedId) ?? null;
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [addTried, setAddTried] = useState(false);
  const [busy, setBusy] = useState<"idle" | "rename" | "remove" | "add">(
    "idle",
  );
  const [editStatus, setEditStatus] = useState<Status>(null);
  const [addStatus, setAddStatus] = useState<Status>(null);
  const [serverSlugError, setServerSlugError] = useState<string | null>(null);

  function select(p: StylePosition | null) {
    setSelectedId(p?.id ?? null);
    setEditName(p?.name ?? "");
    setEditStatus(null);
  }

  const editNameError = !editName.trim()
    ? COPY.nameRequired
    : editName.trim().length > 60
      ? COPY.nameLong
      : null;

  const showEditError =
    selected !== null && editName !== selected.name && editNameError !== null;

  const addErrors = {
    name: !newName.trim()
      ? COPY.nameRequired
      : newName.trim().length > 60
        ? COPY.nameLong
        : null,
    slug: !newSlug
      ? COPY.slugRequired
      : !SLUG_PATTERN.test(newSlug)
        ? COPY.slugPattern
        : positions.some((p) => p.slug === newSlug)
          ? COPY.slugTaken
          : serverSlugError,
  };

  async function rename() {
    if (!selected || editNameError) return;
    setBusy("rename");
    setEditStatus(null);
    const name = editName.trim();
    const { error } = await port.renamePosition(selected.id, name);
    setBusy("idle");
    if (error) {
      setEditStatus({
        tone: "error",
        text: styleWriteErrorMessage(error, "position"),
      });
      return;
    }
    setEditName(name);
    setEditStatus({ tone: "success", text: COPY.renamed });
    onChange(positions.map((p) => (p.id === selected.id ? { ...p, name } : p)));
  }

  async function remove() {
    if (!selected) return;
    setBusy("remove");
    setEditStatus(null);
    const { error } = await port.removePosition(selected.id);
    setBusy("idle");
    if (error) {
      setEditStatus({
        tone: "error",
        text: styleWriteErrorMessage(error, "position"),
      });
      return;
    }
    const rest = positions.filter((p) => p.id !== selected.id);
    select(null);
    setAddStatus({ tone: "success", text: COPY.removed });
    onChange(rest);
  }

  async function add() {
    setAddTried(true);
    setServerSlugError(null);
    if (addErrors.name || addErrors.slug) {
      document
        .getElementById(addErrors.name ? ids.newName : ids.newSlug)
        ?.focus();
      return;
    }
    setBusy("add");
    setAddStatus(null);
    const position = { name: newName.trim(), slug: newSlug };
    const { id, error } = await port.addPosition(styleId, position);
    setBusy("idle");
    if (error || !id) {
      const text = styleWriteErrorMessage(error ?? { message: "" }, "position");
      if (error?.code === "23505") setServerSlugError(text);
      setAddStatus({ tone: "error", text });
      return;
    }
    setNewName("");
    setNewSlug("");
    setSlugTouched(false);
    setAddTried(false);
    setAddStatus({ tone: "success", text: COPY.added });
    onChange(
      [...positions, { id, ...position, stepCount: 0 }].sort(
        (a, b) =>
          a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id),
      ),
    );
  }

  const removeBlock = !selected
    ? null
    : selected.stepCount > 0
      ? COPY.inUse(selected.stepCount)
      : selected.id === startPositionId
        ? COPY.isInitial
        : null;

  return (
    <div className="flex flex-col gap-5">
      {positions.length === 0 ? (
        <p className="type-small text-text-secondary">{COPY.none}</p>
      ) : (
        <ul aria-label={COPY.listLabel} className="flex flex-wrap gap-2">
          {positions.map((p) => (
            <li key={p.id}>
              <Toggle
                variant="chip"
                pressed={p.id === selectedId}
                aria-controls={p.id === selectedId ? ids.edit : undefined}
                onPressedChange={(on) => select(on ? p : null)}
              >
                {p.name}
                {p.id === startPositionId ? (
                  <span className="type-caption font-normal text-text-secondary">
                    {`(${COPY.initial})`}
                  </span>
                ) : null}
                <span className="type-caption font-normal tabular-nums text-text-secondary">
                  {`· ${stepCountLabel(p.stepCount)}`}
                </span>
              </Toggle>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <section
          id={ids.edit}
          aria-labelledby={`${ids.edit}-title`}
          className="flex flex-col gap-4 rounded-sm border border-divider p-4"
        >
          <h3 id={`${ids.edit}-title`} className="type-h5">
            {COPY.editTitle(selected.name)}
          </h3>
          <Field
            htmlFor={ids.name}
            label={COPY.name}
            error={showEditError ? (editNameError ?? undefined) : undefined}
          >
            <Input
              id={ids.name}
              value={editName}
              maxLength={60}
              autoComplete="off"
              aria-invalid={showEditError ? true : undefined}
              aria-describedby={showEditError ? messageId(ids.name) : undefined}
              onChange={(e) => {
                setEditName(e.currentTarget.value);
                setEditStatus(null);
              }}
            />
          </Field>
          <div aria-live="polite" className="empty:hidden">
            {editStatus ? (
              <FieldMessage tone={editStatus.tone}>
                {editStatus.text}
              </FieldMessage>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {removeBlock ? (
              <p
                id={ids.reason}
                className="min-w-0 flex-1 basis-60 text-right type-small text-text-secondary"
              >
                {removeBlock}
              </p>
            ) : null}
            <Button
              variant="danger"
              loading={busy === "remove"}
              loadingText={COPY.removing}
              disabled={
                removeBlock !== null || (busy !== "idle" && busy !== "remove")
              }
              aria-describedby={removeBlock ? ids.reason : undefined}
              onClick={() => void remove()}
            >
              {COPY.remove}
            </Button>
            <Button
              variant="outline"
              loading={busy === "rename"}
              loadingText={COPY.renaming}
              disabled={
                editNameError !== null ||
                editName.trim() === selected.name ||
                (busy !== "idle" && busy !== "rename")
              }
              onClick={() => void rename()}
            >
              {COPY.rename}
            </Button>
          </div>
        </section>
      ) : null}

      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-1 type-small font-semibold text-text">
          {COPY.addTitle}
        </legend>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field
            htmlFor={ids.newName}
            label={COPY.newName}
            error={addTried ? (addErrors.name ?? undefined) : undefined}
          >
            <Input
              id={ids.newName}
              value={newName}
              maxLength={60}
              autoComplete="off"
              aria-invalid={addTried && addErrors.name ? true : undefined}
              aria-describedby={
                addTried && addErrors.name ? messageId(ids.newName) : undefined
              }
              onChange={(e) => {
                const name = e.currentTarget.value;
                setNewName(name);
                if (!slugTouched) setNewSlug(slugify(name));
                setAddStatus(null);
              }}
            />
          </Field>
          <Field
            htmlFor={ids.newSlug}
            label={COPY.newSlug}
            help={COPY.slugHelp}
            error={addTried ? (addErrors.slug ?? undefined) : undefined}
          >
            <Input
              id={ids.newSlug}
              value={newSlug}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={addTried && addErrors.slug ? true : undefined}
              aria-describedby={messageId(ids.newSlug)}
              onChange={(e) => {
                setSlugTouched(true);
                setServerSlugError(null);
                setNewSlug(e.currentTarget.value.toLowerCase());
                setAddStatus(null);
              }}
            />
          </Field>
        </div>
        <div aria-live="polite" className="empty:hidden">
          {addStatus ? (
            <FieldMessage tone={addStatus.tone}>{addStatus.text}</FieldMessage>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            loading={busy === "add"}
            loadingText={COPY.adding}
            disabled={busy !== "idle" && busy !== "add"}
            onClick={() => void add()}
          >
            {COPY.add}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
