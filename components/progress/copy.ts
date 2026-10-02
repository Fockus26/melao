// Copy provisional de Progreso (CONTENT_CHECKLIST fila 72). Los textos de la gráfica de
// próximos repasos (días y nombre accesible) viven en `lib/progress/progress.ts` (fila 73).
export const progressCopy = {
  title: "Progreso",
  styleNav: "Estilo",
  lessons: "Lecciones",
  lessonsOf: (total: number) =>
    total === 1
      ? "de 1 lección completada"
      : `de ${total} lecciones completadas`,
  lessonsBar: "Lecciones completadas",
  lessonsBarValue: (done: number, total: number) =>
    `${done} de ${total} lecciones`,
  noCourse: (style: string) => `${style} todavía no tiene curso.`,
  seeCourse: "Ver el curso",
  steps: "Pasos",
  stepsTotal: (n: number) =>
    n === 1 ? "1 paso publicado" : `${n} pasos publicados`,
  stepsEmpty: "Este estilo todavía no tiene pasos publicados.",
  forecast: "Próximos repasos",
  forecastTotal: (n: number) =>
    n === 1 ? "1 repaso en 7 días" : `${n} repasos en 7 días`,
  forecastLoading: "Cargando tus próximos repasos…",
  forecastError: "No pudimos cargar tus próximos repasos.",
  forecastEmpty: "Nada vence en los próximos 7 días",
  forecastEmptyText:
    "Los pasos que califiques vuelven aquí el día que toca repasarlos.",
  retry: "Reintentar",
  hardest: "Lo que más te cuesta",
  practiceThese: "Practicar estos",
  lastTime: (rating: string, when: string) => `Última vez: ${rating} · ${when}`,
  hardestEmpty:
    "Cuando califiques tus prácticas, aquí vas a ver los pasos que más te cuestan.",
  sessions: "Sesiones recientes",
  sessionsEmpty:
    "Todavía no hay sesiones. Tus prácticas y lecciones aparecen aquí.",
  freeSession: "Práctica libre",
  lessonSession: (title: string | null) =>
    title ? `Lección · ${title}` : "Lección",
  songUnavailable: "Canción no disponible",
  seeResult: "Ver resultado",
  firstDay: "Tu progreso empieza con la primera lección",
  firstDayText:
    "Al terminarla vas a ver aquí tus lecciones, tus pasos y cuándo repasarlos.",
  firstDayCta: (n: number) => `Empezar la lección ${n}`,
  noStyle: "Elige un estilo en Inicio para ver tu progreso.",
} as const;
