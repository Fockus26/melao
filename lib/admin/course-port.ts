import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "@/supabase/functions/_shared/database.types";
import {
  type AdminCourseData,
  type DbError,
  draftToPayload,
  type LessonDraft,
  parseCourseData,
} from "./course";

/**
 * Escrituras (y la relectura) del constructor del camino (D168–D172). Todas como el admin con el
 * cliente del navegador: la RLS de contenido exige `private.is_admin()` y
 * `20261003170000_admin_course.sql` cuida el orden, el estilo de pasos y canciones, publicar y
 * borrar con progreso. Tras cada escritura la pantalla vuelve a leer `admin_course` (una
 * llamada). En las muestras de `/layouts` y en los tests, un puerto falso (nada va a la red).
 */
export type AdminCoursePort = {
  load(
    styleId: string,
  ): Promise<{ data: AdminCourseData | null; error: DbError | null }>;
  createCourse(
    styleId: string,
    title: string,
    description: string,
  ): Promise<{ error: DbError | null }>;
  saveCourse(
    courseId: string,
    title: string,
    description: string,
  ): Promise<{ error: DbError | null }>;
  setCoursePublished(
    courseId: string,
    published: boolean,
  ): Promise<{ error: DbError | null }>;
  addUnit(
    courseId: string,
    title: string,
  ): Promise<{ id: string | null; error: DbError | null }>;
  renameUnit(unitId: string, title: string): Promise<{ error: DbError | null }>;
  removeUnit(unitId: string): Promise<{ error: DbError | null }>;
  /** `position` 1-based dentro del curso. */
  moveUnit(
    unitId: string,
    position: number,
  ): Promise<{ error: DbError | null }>;
  addLesson(
    unitId: string,
    title: string,
  ): Promise<{ id: string | null; error: DbError | null }>;
  /** A `unitId` (la misma u otra del curso) en `position` (1-based). */
  moveLesson(
    lessonId: string,
    unitId: string,
    position: number,
  ): Promise<{ error: DbError | null }>;
  saveLesson(
    lessonId: string,
    draft: LessonDraft,
  ): Promise<{ error: DbError | null }>;
  removeLesson(lessonId: string): Promise<{ error: DbError | null }>;
};

/** El puerto real, sobre el cliente de Supabase del navegador. */
export function supabaseAdminCourse(
  client: SupabaseClient<Database>,
): AdminCoursePort {
  return {
    async load(styleId) {
      const { data, error } = await client.rpc("admin_course", {
        p_style_id: styleId,
      });
      return { data: error ? null : parseCourseData(data), error };
    },
    async createCourse(styleId, title, description) {
      const { error } = await client.from("courses").insert({
        style_id: styleId,
        title: title.trim(),
        description: description.trim() || null,
      });
      return { error };
    },
    async saveCourse(courseId, title, description) {
      const { error } = await client
        .from("courses")
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq("id", courseId);
      return { error };
    },
    async setCoursePublished(courseId, published) {
      const { error } = await client
        .from("courses")
        .update({ published })
        .eq("id", courseId);
      return { error };
    },
    async addUnit(courseId, title) {
      const { data, error } = await client.rpc("admin_add_unit", {
        p_course_id: courseId,
        p_title: title,
      });
      return { id: error ? null : (data ?? null), error };
    },
    async renameUnit(unitId, title) {
      const { error } = await client
        .from("course_units")
        .update({ title: title.trim() })
        .eq("id", unitId);
      return { error };
    },
    async removeUnit(unitId) {
      const { error } = await client
        .from("course_units")
        .delete()
        .eq("id", unitId);
      return { error };
    },
    async moveUnit(unitId, position) {
      const { error } = await client.rpc("admin_move_unit", {
        p_unit_id: unitId,
        p_position: position,
      });
      return { error };
    },
    async addLesson(unitId, title) {
      const { data, error } = await client.rpc("admin_add_lesson", {
        p_unit_id: unitId,
        p_title: title,
      });
      return { id: error ? null : (data ?? null), error };
    },
    async moveLesson(lessonId, unitId, position) {
      const { error } = await client.rpc("admin_move_lesson", {
        p_lesson_id: lessonId,
        p_unit_id: unitId,
        p_position: position,
      });
      return { error };
    },
    async saveLesson(lessonId, draft) {
      const { error } = await client.rpc("admin_save_lesson", {
        p_lesson_id: lessonId,
        p_lesson: draftToPayload(draft) as unknown as Json,
        p_steps: draft.stepIds,
      });
      return { error };
    },
    async removeLesson(lessonId) {
      const { error } = await client
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      return { error };
    },
  };
}
