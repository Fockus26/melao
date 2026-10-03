"use client";

import { CircleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  EditorEmpty,
  Field,
  messageId,
} from "@/components/admin/list-editor/editor-card";
import {
  GuardedLink,
  LeaveGuardProvider,
  useLeaveGuard,
} from "@/components/admin/list-editor/leave-guard";
import { ListEditorLayout } from "@/components/admin/list-editor/list-editor-layout";
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ADMIN_COURSE_PATH,
  type AdminCourseData,
  COURSE_ISSUE_TEXT,
  type CourseUnit,
  courseErrorMessage,
  courseSearch,
  type DbError,
  findLesson,
  lessonHasWarnings,
  lessonNumbers,
  moveLessonLocal,
  moveUnitLocal,
  titleError,
} from "@/lib/admin/course";
import {
  type AdminCoursePort,
  supabaseAdminCourse,
} from "@/lib/admin/course-port";
import type { AdminStyle } from "@/lib/admin/steps";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CourseTree } from "./course-tree";
import { LessonEditor, type LessonEditorProps } from "./lesson-editor";

// Copy provisional (CONTENT_CHECKLIST fila 90).
const COPY = {
  overline: "Contenido",
  title: "Camino",
  styleLegend: "Estilo",
  unpublishedStyle: "(sin publicar)",
  published: "Publicado",
  draft: "Sin publicar",
  publish: "Publicar el curso",
  publishing: "Publicando…",
  unpublish: "Despublicar el curso",
  unpublishing: "Despublicando…",
  publishedOk: "Curso publicado.",
  unpublishedOk: "Curso despublicado.",
  unpublishTitle: "¿Despublicar el curso?",
  unpublishText:
    "Los alumnos dejan de ver el curso y sus lecciones hasta que lo vuelvas a publicar. Su avance se conserva.",
  unpublishStay: "Mantener publicado",
  unpublishConfirm: "Despublicar",
  styleHidden: (style: string) =>
    `${style} está sin publicar: los alumnos no verán el curso hasta que publiques el estilo.`,
  listLabel: "Camino del curso",
  courseSection: "Curso",
  courseTitle: "Título del curso",
  courseDescription: "Descripción",
  courseDescriptionHelp: "Opcional, máximo 2000 caracteres.",
  saveCourse: "Guardar el curso",
  saving: "Guardando…",
  saved: "Guardado.",
  createTitle: (style: string) => `${style} todavía no tiene curso`,
  createText:
    "Crea el curso con su título y una descripción; después agrega unidades y lecciones.",
  create: "Crear el curso",
  creating: "Creando…",
  pickTitle: "Elige una lección",
  pickText:
    "Ábrela desde el camino para editarla, o crea una nueva en una unidad.",
  notFoundTitle: "No encontramos esa lección",
  notFoundText:
    "Puede que se haya borrado o sea de otro estilo. Elige otra del camino.",
  removed: "Lección borrada.",
  back: "Volver al camino",
  noStyleTitle: "Aún no hay estilos",
  noStyleText: "Crea un estilo antes de armar su curso.",
  errorTitle: "No pudimos cargar el camino",
  errorText: "Revisa tu conexión e inténtalo de nuevo.",
  retry: "Reintentar",
  movedUnit: (title: string, pos: number) =>
    `«${title}» quedó como unidad ${pos}.`,
  movedLesson: (title: string, pos: number, unit: string) =>
    `«${title}» quedó en la posición ${pos} de ${unit}.`,
  addedUnit: (title: string) => `Unidad «${title}» creada.`,
  addedLesson: (title: string) => `Lección «${title}» creada.`,
  renamed: "Título guardado.",
  removedUnit: (title: string) => `Unidad «${title}» borrada.`,
  removeUnitTitle: (title: string) => `¿Borrar «${title}»?`,
  removeUnitText: (n: number) =>
    n === 0
      ? "Se borra la unidad. No se puede deshacer."
      : `Se borran la unidad y ${n === 1 ? "su lección" : `sus ${n} lecciones`} (los pasos siguen en el catálogo). No se puede deshacer.`,
  removeUnitBlockedTitle: (title: string) => `No se puede borrar «${title}»`,
  removeUnitBlockedText:
    "Algún alumno ya completó lecciones de esta unidad y perdería su avance. Mueve antes esas lecciones a otra unidad.",
  removeUnitStay: "Conservar la unidad",
  removeUnitConfirm: "Borrar la unidad",
  understood: "Entendido",
};

type Status = { tone: "success" | "error"; text: string } | null;

export type CourseAdminViewProps = {
  styles: readonly AdminStyle[];
  currentStyle: AdminStyle | null;
  /** `admin_course` del estilo actual. */
  data: AdminCourseData | null;
  loadError?: boolean;
  /** Ruta de los enlaces (la muestra usa la suya) y parámetros que conserva (`?state=`). */
  basePath?: string;
  extraParams?: Record<string, string>;
  /** Puerto de escritura; sin él, el real con el cliente del navegador. */
  port?: AdminCoursePort;
  /** Muestras: estado inicial del editor. */
  initialEditorStatus?: LessonEditorProps["initialStatus"];
};

/**
 * Admin · Camino (`/admin/course`): el Constructor del camino (handoff §3 Admin, D168–D173).
 * Estado en la URL: estilo (`?style=<slug>`) y lección abierta (`?lesson=<uuid>`, contrato del
 * Resumen). Cada escritura va por el puerto y después se vuelve a leer `admin_course`; el orden
 * se aplica antes en pantalla (optimista) y vuelve atrás si la base lo rechaza.
 */
export function CourseAdminView(props: CourseAdminViewProps) {
  return (
    <LeaveGuardProvider>
      <CourseAdminScreen {...props} />
    </LeaveGuardProvider>
  );
}

function CourseAdminScreen({
  styles,
  currentStyle,
  data: initialData,
  loadError = false,
  basePath = ADMIN_COURSE_PATH,
  extraParams = {},
  port: portProp,
  initialEditorStatus,
}: CourseAdminViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guard = useLeaveGuard();
  const ids = { reason: useId(), status: useId() };
  const port = useMemo(
    () => portProp ?? supabaseAdminCourse(createClient()),
    [portProp],
  );

  // Lo que llega del servidor manda; las escrituras lo reemplazan con lo que relee el puerto.
  const [data, setData] = useState(initialData);
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (initialData !== prevInitial) {
    setPrevInitial(initialData);
    setData(initialData);
  }
  const [busy, setBusy] = useState(false);
  const [treeStatus, setTreeStatus] = useState<Status>(null);
  const [headerStatus, setHeaderStatus] = useState<Status>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [unitToRemove, setUnitToRemove] = useState<CourseUnit | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const lessonId = searchParams.get("lesson");
  const href = (lesson: string | null, style = currentStyle?.slug) =>
    `${basePath}${courseSearch({ style, lesson }, extraParams)}`;

  async function reload(): Promise<boolean> {
    if (!currentStyle) return false;
    const result = await port.load(currentStyle.id);
    if (result.error || !result.data) return false;
    setData(result.data);
    return true;
  }

  /** Escritura del árbol: la hace, relee y deja el resultado en el aviso. */
  async function write(
    run: () => Promise<{ error: DbError | null }>,
    ok: string,
    before?: AdminCourseData,
  ): Promise<string | null> {
    setBusy(true);
    setTreeStatus(null);
    const { error } = await run();
    if (error) {
      if (before) setData(before);
      const text = courseErrorMessage(error);
      setTreeStatus({ tone: "error", text });
      setBusy(false);
      return text;
    }
    await reload();
    setBusy(false);
    setTreeStatus({ tone: "success", text: ok });
    return null;
  }

  const header = (actions?: React.ReactNode) => (
    <AdminPageHeader
      overline={COPY.overline}
      title={COPY.title}
      actions={actions}
    />
  );

  if (!currentStyle) {
    return (
      <div className="flex flex-col gap-8">
        {header()}
        <EditorEmpty title={COPY.noStyleTitle} text={COPY.noStyleText} />
      </div>
    );
  }

  const styleNav =
    styles.length > 1 ? (
      <nav aria-label={COPY.styleLegend}>
        <ul className="flex w-full max-w-xl flex-wrap rounded-pill border border-border-input p-1">
          {styles.map((s) => {
            const active = s.id === currentStyle.id;
            return (
              <li key={s.id} className="flex flex-1">
                <GuardedLink
                  href={`${basePath}${courseSearch({ style: s.slug }, extraParams)}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-pill px-4 text-center type-small",
                    "transition-colors duration-state ease-standard motion-reduce:transition-none",
                    "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
                    active
                      ? "bg-primary font-semibold text-on-primary"
                      : "font-medium text-text hover:bg-hover",
                  )}
                >
                  {s.name}
                  {s.published ? null : (
                    <span className="type-caption">
                      {COPY.unpublishedStyle}
                    </span>
                  )}
                </GuardedLink>
              </li>
            );
          })}
        </ul>
      </nav>
    ) : null;

  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-8">
        {header()}
        {styleNav}
        <Alert variant="error">
          <AlertContent>
            <AlertTitle>{COPY.errorTitle}</AlertTitle>
            <AlertDescription>{COPY.errorText}</AlertDescription>
          </AlertContent>
          <AlertAction>
            <Button variant="outline" onClick={() => router.refresh()}>
              {COPY.retry}
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  const course = data.course;
  const styleNote = data.style.published ? null : (
    <p className="type-small text-text-secondary">
      {COPY.styleHidden(data.style.name)}
    </p>
  );

  if (!course) {
    return (
      <div className="flex flex-col gap-8">
        {header()}
        {styleNav}
        <CreateCourse
          styleName={data.style.name}
          onCreate={async (title, description) => {
            const { error } = await port.createCourse(
              data.style.id,
              title,
              description,
            );
            if (error) return courseErrorMessage(error);
            await reload();
            return null;
          }}
        />
      </div>
    );
  }

  const publishBlock = course.published
    ? null
    : course.issues.length > 0
      ? course.issues.map((i) => COURSE_ISSUE_TEXT[i]).join(" ")
      : null;

  async function setPublished(on: boolean) {
    if (!course) return;
    setPublishing(true);
    setHeaderStatus(null);
    const { error } = await port.setCoursePublished(course.id, on);
    if (!error) await reload();
    setPublishing(false);
    setHeaderStatus(
      error
        ? { tone: "error", text: courseErrorMessage(error) }
        : { tone: "success", text: on ? COPY.publishedOk : COPY.unpublishedOk },
    );
  }

  const headerActions = (
    <div className="flex max-w-xl flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Badge variant={course.published ? "ok" : "neutral"}>
          {course.published ? COPY.published : COPY.draft}
        </Badge>
        {course.published ? (
          <Button
            variant="outline"
            loading={publishing}
            loadingText={COPY.unpublishing}
            onClick={() => setConfirmUnpublish(true)}
          >
            {COPY.unpublish}
          </Button>
        ) : (
          <Button
            loading={publishing}
            loadingText={COPY.publishing}
            disabled={publishBlock !== null}
            aria-describedby={publishBlock ? ids.reason : undefined}
            onClick={() => void setPublished(true)}
          >
            {COPY.publish}
          </Button>
        )}
      </div>
      {publishBlock ? (
        <p
          id={ids.reason}
          className="flex items-start justify-end gap-1.5 text-right type-small text-error"
        >
          <CircleAlert
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
            className="mt-px size-4.5 shrink-0"
          />
          <span>{publishBlock}</span>
        </p>
      ) : null}
      <div aria-live="polite" className="empty:hidden">
        {headerStatus ? (
          <FieldMessage tone={headerStatus.tone}>
            {headerStatus.text}
          </FieldMessage>
        ) : null}
      </div>
    </div>
  );

  const numbers = lessonNumbers(data.units);
  const found = lessonId ? findLesson(data.units, lessonId) : null;
  const units = data.units;

  const list = (
    <>
      <CourseDetails
        key={course.id}
        title={course.title}
        description={course.description}
        onSave={async (title, description) => {
          const { error } = await port.saveCourse(
            course.id,
            title,
            description,
          );
          if (error) return courseErrorMessage(error);
          await reload();
          return null;
        }}
      />
      <CourseTree
        units={units}
        numbers={numbers}
        selectedLessonId={found ? found.lesson.id : null}
        coursePublished={course.published}
        lessonHref={(id) => href(id)}
        hasWarnings={(lesson) => lessonHasWarnings(data, lesson)}
        busy={busy}
        onMoveUnit={(unitId, position) => {
          const unit = units.find((u) => u.id === unitId);
          if (!unit) return;
          const before = data;
          setData({ ...data, units: moveUnitLocal(units, unitId, position) });
          void write(
            () => port.moveUnit(unitId, position),
            COPY.movedUnit(unit.title, Math.min(position, units.length)),
            before,
          );
        }}
        onMoveLesson={(id, unitId, position) => {
          const lesson = findLesson(units, id)?.lesson;
          const target = units.find((u) => u.id === unitId);
          if (!lesson || !target) return;
          const before = data;
          const next = moveLessonLocal(units, id, unitId, position);
          const placed =
            (next
              .find((u) => u.id === unitId)
              ?.lessons.findIndex((l) => l.id === id) ?? 0) + 1;
          setData({ ...data, units: next });
          void write(
            () => port.moveLesson(id, unitId, position),
            COPY.movedLesson(lesson.title, placed, target.title),
            before,
          );
        }}
        onAddUnit={(title) =>
          write(() => port.addUnit(course.id, title), COPY.addedUnit(title))
        }
        onAddLesson={async (unitId, title) => {
          let created: string | null = null;
          const error = await write(async () => {
            const r = await port.addLesson(unitId, title);
            created = r.id;
            return r;
          }, COPY.addedLesson(title));
          // Abre la lección nueva (si no hay cambios sin guardar en otra).
          if (!error && created && !guard.dirty)
            window.history.pushState(null, "", href(created));
          return error;
        }}
        onRenameUnit={(unitId, title) =>
          write(() => port.renameUnit(unitId, title), COPY.renamed)
        }
        onRemoveUnit={(unit) => setUnitToRemove(unit)}
      />
      <div aria-live="polite" id={ids.status} className="empty:hidden">
        {treeStatus ? (
          <FieldMessage tone={treeStatus.tone}>{treeStatus.text}</FieldMessage>
        ) : null}
      </div>
    </>
  );

  let editor: React.ReactNode;
  if (!lessonId) {
    editor = (
      <EditorEmpty title={flash ?? COPY.pickTitle} text={COPY.pickText} />
    );
  } else if (!found) {
    editor = (
      <EditorEmpty title={COPY.notFoundTitle} text={COPY.notFoundText} />
    );
  } else {
    editor = (
      <LessonEditor
        key={found.lesson.id}
        data={data}
        lesson={found.lesson}
        number={numbers.get(found.lesson.id) ?? 0}
        unitNumber={found.unitIndex + 1}
        port={port}
        initialStatus={initialEditorStatus}
        onSaved={async () => {
          await reload();
        }}
        onRemoved={async () => {
          setFlash(COPY.removed);
          window.history.replaceState(null, "", href(null));
          await reload();
        }}
      />
    );
  }

  const removeProgress =
    unitToRemove?.lessons.reduce((n, l) => n + l.progressCount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {header(headerActions)}
      {styleNav}
      {styleNote}
      <ListEditorLayout
        list={list}
        editor={editor}
        hasSelection={lessonId !== null}
        back={{ href: href(null), label: COPY.back }}
        listLabel={COPY.listLabel}
      />

      <AlertDialog open={confirmUnpublish} onOpenChange={setConfirmUnpublish}>
        <AlertDialogContent>
          <AlertDialogTitle>{COPY.unpublishTitle}</AlertDialogTitle>
          <AlertDialogDescription>{COPY.unpublishText}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.unpublishStay}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void setPublished(false)}>
              {COPY.unpublishConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unitToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setUnitToRemove(null);
        }}
      >
        <AlertDialogContent>
          {unitToRemove && removeProgress > 0 ? (
            <>
              <AlertDialogTitle>
                {COPY.removeUnitBlockedTitle(unitToRemove.title)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {COPY.removeUnitBlockedText}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>{COPY.understood}</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : unitToRemove ? (
            <>
              <AlertDialogTitle>
                {COPY.removeUnitTitle(unitToRemove.title)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {COPY.removeUnitText(unitToRemove.lessons.length)}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>{COPY.removeUnitStay}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const unit = unitToRemove;
                    const openInside =
                      lessonId !== null &&
                      unit.lessons.some((l) => l.id === lessonId);
                    void write(
                      () => port.removeUnit(unit.id),
                      COPY.removedUnit(unit.title),
                    ).then((error) => {
                      if (!error && openInside) {
                        guard.setDirty(false);
                        window.history.replaceState(null, "", href(null));
                      }
                    });
                  }}
                >
                  {COPY.removeUnitConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Título y descripción del curso, arriba del camino. */
function CourseDetails({
  title: initialTitle,
  description: initialDescription,
  onSave,
}: {
  title: string;
  description: string;
  onSave: (title: string, description: string) => Promise<string | null>;
}) {
  const ids = { heading: useId(), title: useId(), description: useId() };
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section
      aria-labelledby={ids.heading}
      className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
    >
      <h2 id={ids.heading} className="type-h4">
        {COPY.courseSection}
      </h2>
      <Field
        htmlFor={ids.title}
        label={COPY.courseTitle}
        error={error ?? undefined}
      >
        <Input
          id={ids.title}
          value={title}
          maxLength={120}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId(ids.title) : undefined}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            setError(null);
            setStatus(null);
          }}
        />
      </Field>
      <Field
        htmlFor={ids.description}
        label={COPY.courseDescription}
        help={COPY.courseDescriptionHelp}
      >
        <Textarea
          id={ids.description}
          value={description}
          maxLength={2000}
          aria-describedby={messageId(ids.description)}
          onChange={(e) => {
            setDescription(e.currentTarget.value);
            setStatus(null);
          }}
        />
      </Field>
      <div aria-live="polite" className="empty:hidden">
        {status ? (
          <FieldMessage tone={status.tone}>{status.text}</FieldMessage>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="self-start"
        loading={busy}
        loadingText={COPY.saving}
        onClick={async () => {
          const invalid = titleError(title);
          if (invalid) {
            setError(invalid);
            document.getElementById(ids.title)?.focus();
            return;
          }
          setBusy(true);
          const failed = await onSave(title, description);
          setBusy(false);
          setStatus(
            failed
              ? { tone: "error", text: failed }
              : { tone: "success", text: COPY.saved },
          );
        }}
      >
        {COPY.saveCourse}
      </Button>
    </section>
  );
}

/** Estado vacío: el estilo no tiene curso. */
function CreateCourse({
  styleName,
  onCreate,
}: {
  styleName: string;
  onCreate: (title: string, description: string) => Promise<string | null>;
}) {
  const ids = { heading: useId(), title: useId(), description: useId() };
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section
      aria-labelledby={ids.heading}
      className="flex max-w-2xl flex-col gap-5 rounded-md border border-divider bg-surface p-5 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={ids.heading} className="type-h3">
          {COPY.createTitle(styleName)}
        </h2>
        <p className="type-small text-text-secondary">{COPY.createText}</p>
      </div>
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const invalid = titleError(title);
          if (invalid) {
            setError(invalid);
            document.getElementById(ids.title)?.focus();
            return;
          }
          setBusy(true);
          setFailed(await onCreate(title, description));
          setBusy(false);
        }}
      >
        <Field
          htmlFor={ids.title}
          label={COPY.courseTitle}
          error={error ?? undefined}
        >
          <Input
            id={ids.title}
            value={title}
            maxLength={120}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId(ids.title) : undefined}
            onChange={(e) => {
              setTitle(e.currentTarget.value);
              setError(null);
            }}
          />
        </Field>
        <Field
          htmlFor={ids.description}
          label={COPY.courseDescription}
          help={COPY.courseDescriptionHelp}
        >
          <Textarea
            id={ids.description}
            value={description}
            maxLength={2000}
            aria-describedby={messageId(ids.description)}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
        </Field>
        <div aria-live="polite" className="empty:hidden">
          {failed ? <FieldMessage tone="error">{failed}</FieldMessage> : null}
        </div>
        <Button
          type="submit"
          className="self-start"
          loading={busy}
          loadingText={COPY.creating}
        >
          {COPY.create}
        </Button>
      </form>
    </section>
  );
}
