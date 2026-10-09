"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import {
  GuardedLink,
  useLeaveGuard,
} from "@/components/admin/list-editor/leave-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  type CourseLesson,
  type CourseUnit,
  titleError,
} from "@/lib/admin/course";
import { cn } from "@/lib/utils";
import { RowMenu, type RowMenuItem } from "./row-menu";
import { DragHandle, SortableList } from "./sortable";

// Copy provisional (CONTENT_CHECKLIST fila 90).
const COPY = {
  heading: "Unidades y lecciones",
  publishedNote:
    "El curso está publicado: cambiar el orden cambia qué lección desbloquea cada alumno (se abren una tras otra).",
  units: "Unidades del curso",
  unit: (n: number) => `Unidad ${n}`,
  lessons: (unit: string) => `Lecciones de ${unit}`,
  lessonName: (n: number, title: string) => `Lección ${n}: ${title}`,
  ready: "Lista",
  warnings: "Con avisos",
  emptyUnit: "Sin lecciones todavía.",
  noUnits: "El curso todavía no tiene unidades. Crea la primera.",
  more: (name: string) => `Más acciones para ${name}`,
  rename: "Cambiar el título",
  up: "Subir",
  down: "Bajar",
  moveTo: "Mover al final de",
  removeUnit: "Borrar la unidad",
  newUnit: "Nueva unidad",
  newLesson: "Nueva lección",
  unitTitle: "Título de la unidad",
  lessonTitle: "Título de la lección",
  add: "Agregar",
  adding: "Agregando…",
  save: "Guardar",
  saving: "Guardando…",
  cancel: "Cancelar",
};

export type CourseTreeProps = {
  units: readonly CourseUnit[];
  /** Número de cada lección en el curso. */
  numbers: ReadonlyMap<string, number>;
  selectedLessonId: string | null;
  coursePublished: boolean;
  lessonHref: (lessonId: string) => string;
  hasWarnings: (lesson: CourseLesson) => boolean;
  /** Mientras se guarda un cambio de orden no se puede empezar otro. */
  busy: boolean;
  onMoveUnit: (unitId: string, position: number) => void;
  onMoveLesson: (lessonId: string, unitId: string, position: number) => void;
  /** Devuelven el texto del error o `null` si salió bien. */
  onAddUnit: (title: string) => Promise<string | null>;
  onAddLesson: (unitId: string, title: string) => Promise<string | null>;
  onRenameUnit: (unitId: string, title: string) => Promise<string | null>;
  onRemoveUnit: (unit: CourseUnit) => void;
};

/**
 * Árbol del Constructor del camino (handoff §3 Admin): unidades con su asa, número, título y
 * menú; dentro, las lecciones numeradas en todo el curso con su pill (Lista / Con avisos). Se
 * reordena arrastrando el asa (puntero o teclado) o desde el menú (Subir, Bajar, Mover a otra
 * unidad). Una lección cambia de unidad desde el menú; arrastrando, solo dentro de la suya.
 */
export function CourseTree({
  units,
  numbers,
  selectedLessonId,
  coursePublished,
  lessonHref,
  hasWarnings,
  busy,
  onMoveUnit,
  onMoveLesson,
  onAddUnit,
  onAddLesson,
  onRenameUnit,
  onRemoveUnit,
}: CourseTreeProps) {
  const headingId = useId();
  const unitName = (u: CourseUnit) =>
    `${COPY.unit(units.indexOf(u) + 1)}: ${u.title}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="type-h3">
        {COPY.heading}
      </h2>
      {coursePublished ? (
        <p className="type-small text-text-secondary">{COPY.publishedNote}</p>
      ) : null}
      {units.length === 0 ? (
        <p className="type-small text-text-secondary">{COPY.noUnits}</p>
      ) : (
        <div className="border-t border-divider">
          <SortableList
            items={units}
            getId={(u) => u.id}
            getName={unitName}
            label={COPY.units}
            disabled={busy}
            onMove={onMoveUnit}
            renderItem={(unit, handle) => {
              const index = units.findIndex((u) => u.id === unit.id);
              return (
                <UnitBlock
                  unit={unit}
                  index={index}
                  units={units}
                  handle={handle}
                  numbers={numbers}
                  selectedLessonId={selectedLessonId}
                  lessonHref={lessonHref}
                  hasWarnings={hasWarnings}
                  busy={busy}
                  onMoveUnit={onMoveUnit}
                  onMoveLesson={onMoveLesson}
                  onAddLesson={onAddLesson}
                  onRenameUnit={onRenameUnit}
                  onRemoveUnit={onRemoveUnit}
                />
              );
            }}
          />
        </div>
      )}
      <AddForm
        buttonLabel={COPY.newUnit}
        fieldLabel={COPY.unitTitle}
        onAdd={onAddUnit}
      />
    </section>
  );
}

function UnitBlock({
  unit,
  index,
  units,
  handle,
  numbers,
  selectedLessonId,
  lessonHref,
  hasWarnings,
  busy,
  onMoveUnit,
  onMoveLesson,
  onAddLesson,
  onRenameUnit,
  onRemoveUnit,
}: Omit<CourseTreeProps, "coursePublished" | "onAddUnit"> & {
  unit: CourseUnit;
  index: number;
  handle: Parameters<typeof DragHandle>[0]["handle"];
}) {
  const [renaming, setRenaming] = useState(false);
  const label = `${COPY.unit(index + 1)}: ${unit.title}`;
  const menu: RowMenuItem[] = [
    { label: COPY.rename, onSelect: () => setRenaming(true) },
    {
      label: COPY.up,
      disabled: busy || index === 0,
      onSelect: () => onMoveUnit(unit.id, index),
    },
    {
      label: COPY.down,
      disabled: busy || index === units.length - 1,
      onSelect: () => onMoveUnit(unit.id, index + 2),
    },
    { kind: "separator" },
    {
      label: COPY.removeUnit,
      danger: true,
      onSelect: () => onRemoveUnit(unit),
    },
  ];

  return (
    <div className="flex flex-col border-b border-divider pb-2">
      <div className="flex min-h-14 items-center gap-1 pt-2">
        <DragHandle handle={handle} disabled={busy} />
        {renaming && !handle.overlay ? (
          <RenameForm
            initial={unit.title}
            label={COPY.unitTitle}
            onCancel={() => setRenaming(false)}
            onSave={async (title) => {
              const error = await onRenameUnit(unit.id, title);
              if (!error) setRenaming(false);
              return error;
            }}
          />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="type-overline text-text-secondary">
              {COPY.unit(index + 1)}
            </span>
            <h3 className="type-h5 break-words">{unit.title}</h3>
          </div>
        )}
        {handle.overlay ? null : (
          <RowMenu label={COPY.more(label)} items={menu} />
        )}
      </div>
      {handle.overlay ? null : (
        <div className="flex flex-col gap-1 pl-4">
          {unit.lessons.length === 0 ? (
            <p className="py-2 pl-10 type-small text-text-secondary">
              {COPY.emptyUnit}
            </p>
          ) : (
            <SortableList
              items={unit.lessons}
              getId={(l) => l.id}
              getName={(l) => COPY.lessonName(numbers.get(l.id) ?? 0, l.title)}
              label={COPY.lessons(label)}
              disabled={busy}
              onMove={(lessonId, position) =>
                onMoveLesson(lessonId, unit.id, position)
              }
              renderItem={(lesson, lessonHandle) => (
                <LessonRow
                  lesson={lesson}
                  number={numbers.get(lesson.id) ?? 0}
                  position={unit.lessons.findIndex((l) => l.id === lesson.id)}
                  unit={unit}
                  units={units}
                  handle={lessonHandle}
                  current={lesson.id === selectedLessonId}
                  href={lessonHref(lesson.id)}
                  warn={hasWarnings(lesson)}
                  busy={busy}
                  onMoveLesson={onMoveLesson}
                />
              )}
            />
          )}
          <div className="pl-10">
            <AddForm
              buttonLabel={COPY.newLesson}
              fieldLabel={COPY.lessonTitle}
              onAdd={(title) => onAddLesson(unit.id, title)}
              quiet
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  number,
  position,
  unit,
  units,
  handle,
  current,
  href,
  warn,
  busy,
  onMoveLesson,
}: {
  lesson: CourseLesson;
  number: number;
  /** Índice dentro de su unidad. */
  position: number;
  unit: CourseUnit;
  units: readonly CourseUnit[];
  handle: Parameters<typeof DragHandle>[0]["handle"];
  current: boolean;
  href: string;
  warn: boolean;
  busy: boolean;
  onMoveLesson: CourseTreeProps["onMoveLesson"];
}) {
  const guard = useLeaveGuard();
  const name = COPY.lessonName(number, lesson.title);
  const others = units.filter((u) => u.id !== unit.id);
  const menu: RowMenuItem[] = [
    {
      label: COPY.up,
      disabled: busy || position === 0,
      onSelect: () => onMoveLesson(lesson.id, unit.id, position),
    },
    {
      label: COPY.down,
      disabled: busy || position === unit.lessons.length - 1,
      onSelect: () => onMoveLesson(lesson.id, unit.id, position + 2),
    },
  ];
  if (others.length > 0) {
    menu.push({ kind: "separator" }, { kind: "label", label: COPY.moveTo });
    for (const u of others) {
      const i = units.indexOf(u);
      menu.push({
        label: `${COPY.unit(i + 1)}: ${u.title}`,
        disabled: busy,
        onSelect: () => onMoveLesson(lesson.id, u.id, u.lessons.length + 1),
      });
    }
  }
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-1 rounded-sm",
        current ? "bg-gold-tint" : "",
      )}
    >
      <DragHandle handle={handle} disabled={busy} />
      <GuardedLink
        href={href}
        aria-current={current ? "true" : undefined}
        onClick={(event) => {
          // Sin cambios sin guardar, se abre en el cliente: el camino ya está en pantalla.
          if (guard.dirty || event.metaKey || event.ctrlKey || event.shiftKey)
            return;
          event.preventDefault();
          window.history.pushState(null, "", href);
        }}
        className={cn(
          "flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-2",
          "transition-colors duration-hover ease-standard motion-reduce:transition-none",
          current ? "" : "hover:bg-hover",
        )}
      >
        <span className="w-6 shrink-0 text-right type-small tabular-nums text-text-secondary">
          {number}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 break-words type-body text-text",
            current && "font-semibold",
          )}
        >
          <span className="sr-only">{`Lección ${number}: `}</span>
          {lesson.title}
        </span>
        <Badge variant={warn ? "warning" : "ok"}>
          {warn ? COPY.warnings : COPY.ready}
        </Badge>
      </GuardedLink>
      {handle.overlay ? null : <RowMenu label={COPY.more(name)} items={menu} />}
    </div>
  );
}

/** "+ Nueva unidad" / "+ Nueva lección": se abre en un campo con Agregar y Cancelar. */
function AddForm({
  buttonLabel,
  fieldLabel,
  onAdd,
  quiet = false,
}: {
  buttonLabel: string;
  fieldLabel: string;
  onAdd: (title: string) => Promise<string | null>;
  quiet?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open)
    return (
      <Button
        variant={quiet ? "quiet" : "outline"}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" strokeWidth={ICON_STROKE} />
        {buttonLabel}
      </Button>
    );

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const invalid = titleError(title);
        if (invalid) {
          setError(invalid);
          return;
        }
        setBusy(true);
        const failed = await onAdd(title.trim());
        setBusy(false);
        if (failed) setError(failed);
        else {
          setTitle("");
          setError(null);
          setOpen(false);
        }
      }}
    >
      <label htmlFor={id} className="type-small font-medium text-text">
        {fieldLabel}
      </label>
      <Input
        id={id}
        autoFocus
        value={title}
        maxLength={120}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setTitle(e.currentTarget.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {error ? (
        <FieldMessage id={`${id}-error`} tone="error">
          {error}
        </FieldMessage>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} loadingText={COPY.adding}>
          {COPY.add}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          {COPY.cancel}
        </Button>
      </div>
    </form>
  );
}

function RenameForm({
  initial,
  label,
  onSave,
  onCancel,
}: {
  initial: string;
  label: string;
  onSave: (title: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex min-w-0 flex-1 flex-col gap-2 py-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const invalid = titleError(title);
        if (invalid) {
          setError(invalid);
          return;
        }
        setBusy(true);
        const failed = await onSave(title.trim());
        setBusy(false);
        setError(failed);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        autoFocus
        value={title}
        maxLength={120}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setTitle(e.currentTarget.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      {error ? (
        <FieldMessage id={`${id}-error`} tone="error">
          {error}
        </FieldMessage>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} loadingText={COPY.saving}>
          {COPY.save}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {COPY.cancel}
        </Button>
      </div>
    </form>
  );
}
