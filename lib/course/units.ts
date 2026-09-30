import type { CoursePath, PathLesson } from "./path";

/**
 * Presentación del camino en Curso: agrupa por unidad las filas de `course_path` (ya en orden y
 * con su estado resuelto en SQL, D092) y cuenta las completadas. Sin reglas de negocio (D003).
 */

export type PathUnit = {
  id: string;
  position: number;
  title: string;
  lessons: PathLesson[];
  /** Lecciones completadas de la unidad. */
  done: number;
};

/** Unidades en el orden en que llegan las lecciones. */
export function groupPathByUnit(path: CoursePath | null): PathUnit[] {
  const units: PathUnit[] = [];
  for (const lesson of path?.lessons ?? []) {
    let unit = units.at(-1);
    if (!unit || unit.id !== lesson.unitId) {
      unit = {
        id: lesson.unitId,
        position: lesson.unitPosition,
        title: lesson.unitTitle,
        lessons: [],
        done: 0,
      };
      units.push(unit);
    }
    unit.lessons.push(lesson);
    if (lesson.status === "completed") unit.done += 1;
  }
  return units;
}

/**
 * Dónde va el nodo de repaso (solo con pasos vencidos): antes de la lección actual; con el
 * curso terminado (sin actual), al final del camino (D095).
 */
export function reviewPlacement(
  path: CoursePath | null,
  dueCount: number,
): { before: string } | "end" | null {
  if (dueCount <= 0 || !path || path.lessons.length === 0) return null;
  const current = path.lessons.find((l) => l.status === "current");
  return current ? { before: current.lessonId } : "end";
}
