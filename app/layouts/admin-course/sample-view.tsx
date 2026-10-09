"use client";

import { useMemo } from "react";
import {
  CourseAdminView,
  type CourseAdminViewProps,
} from "@/components/admin/course/course-admin-view";
import {
  type AdminCourseData,
  type CourseIssue,
  draftSongIssues,
  findLesson,
  moveLessonLocal,
  moveUnitLocal,
} from "@/lib/admin/course";
import type { AdminCoursePort } from "@/lib/admin/course-port";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = { error: null };
const offline = { error: { message: "Failed to fetch" } };

/** Motivos de publicar el curso, como `private.course_issues`. */
function courseIssues(data: AdminCourseData): CourseIssue[] {
  const lessons = data.units.flatMap((u) => u.lessons);
  const out: CourseIssue[] = [];
  if (lessons.length === 0) out.push("no_lessons");
  if (lessons.some((l) => l.stepIds.length === 0))
    out.push("lesson_without_steps");
  if (lessons.some((l) => !l.practiceSongId && !l.finalSongId))
    out.push("lesson_without_song");
  return out;
}

/**
 * Puerto falso de la muestra: nada va a la red. Guarda en memoria el camino y responde como la
 * base (orden, borrar con progreso, publicar incompleto). `failSave`: guardar la lección falla
 * como sin conexión.
 */
function samplePort(
  initial: AdminCourseData,
  failSave: boolean,
): AdminCoursePort {
  let data: AdminCourseData = structuredClone(initial);
  let n = 0;
  const nextId = (prefix: string) =>
    `${prefix}-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const set = (next: AdminCourseData) => {
    data = next.course
      ? { ...next, course: { ...next.course, issues: courseIssues(next) } }
      : next;
  };
  return {
    async load() {
      await wait(150);
      return { data: structuredClone(data), error: null };
    },
    async createCourse(_style, title, description) {
      await wait(400);
      set({
        ...data,
        course: {
          id: nextId("d0000000"),
          title,
          description,
          published: false,
          issues: [],
        },
      });
      return ok;
    },
    async saveCourse(_id, title, description) {
      await wait(300);
      if (data.course)
        set({ ...data, course: { ...data.course, title, description } });
      return ok;
    },
    async setCoursePublished(_id, published) {
      await wait(400);
      if (!data.course) return ok;
      if (published && courseIssues(data).length > 0)
        return { error: { code: "MS025", message: "incompleto" } };
      set({ ...data, course: { ...data.course, published } });
      return ok;
    },
    async addUnit(_course, title) {
      await wait(300);
      const id = nextId("d1000000");
      set({ ...data, units: [...data.units, { id, title, lessons: [] }] });
      return { id, error: null };
    },
    async renameUnit(unitId, title) {
      await wait(300);
      set({
        ...data,
        units: data.units.map((u) => (u.id === unitId ? { ...u, title } : u)),
      });
      return ok;
    },
    async removeUnit(unitId) {
      await wait(300);
      const unit = data.units.find((u) => u.id === unitId);
      if (unit?.lessons.some((l) => l.progressCount > 0))
        return { error: { code: "MS023", message: "progreso" } };
      set({ ...data, units: data.units.filter((u) => u.id !== unitId) });
      return ok;
    },
    async moveUnit(unitId, position) {
      await wait(400);
      set({ ...data, units: moveUnitLocal(data.units, unitId, position) });
      return ok;
    },
    async addLesson(unitId, title) {
      await wait(300);
      const id = nextId("d2000000");
      set({
        ...data,
        units: data.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                lessons: [
                  ...u.lessons,
                  {
                    id,
                    title,
                    intro: "",
                    practiceSongId: null,
                    practicePhrases: null,
                    finalSongId: null,
                    progressCount: 0,
                    stepIds: [],
                    songIssues: ["missing_song"],
                  },
                ],
              }
            : u,
        ),
      });
      return { id, error: null };
    },
    async moveLesson(lessonId, unitId, position) {
      await wait(400);
      set({
        ...data,
        units: moveLessonLocal(data.units, lessonId, unitId, position),
      });
      return ok;
    },
    async saveLesson(lessonId, draft) {
      await wait(500);
      if (failSave) return offline;
      set({
        ...data,
        units: data.units.map((u) => ({
          ...u,
          lessons: u.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  title: draft.title.trim(),
                  intro: draft.intro.trim(),
                  stepIds: [...draft.stepIds],
                  practiceSongId: draft.practiceSongId,
                  practicePhrases: draft.practiceSongId
                    ? draft.practicePhrases
                    : null,
                  finalSongId: draft.finalSongId,
                  songIssues: draftSongIssues(draft, data.songs),
                }
              : l,
          ),
        })),
      });
      return ok;
    },
    async removeLesson(lessonId) {
      await wait(300);
      if ((findLesson(data.units, lessonId)?.lesson.progressCount ?? 0) > 0)
        return { error: { code: "MS023", message: "progreso" } };
      set({
        ...data,
        units: data.units.map((u) => ({
          ...u,
          lessons: u.lessons.filter((l) => l.id !== lessonId),
        })),
      });
      return ok;
    },
  };
}

/** La vista real con un puerto falso (las funciones no cruzan de Server a Client Component). */
export function CourseAdminSample({
  failSave = false,
  ...props
}: Omit<CourseAdminViewProps, "port"> & { failSave?: boolean }) {
  const { data } = props;
  const port = useMemo(
    () =>
      data
        ? samplePort(data, failSave)
        : samplePort({} as AdminCourseData, failSave),
    [data, failSave],
  );
  return <CourseAdminView {...props} port={port} />;
}
