import type { DanceRole } from "@/lib/course/path";

/**
 * Textos de la lección. PROVISIONALES: los de las etapas, la calificación y el resumen
 * (CONTENT_CHECKLIST fila 56, con "Video en preparación"); los de la práctica que no arranca
 * (fila 57, con "Práctica disponible pronto"). Los del handoff (§ Lección) van tal cual.
 */
export const lessonCopy = {
  // Barra
  progressLabel: "Progreso de la lección",
  progressValue: (n: number, total: number, stage: string) =>
    `Etapa ${n} de ${total}: ${stage}`,
  stageNames: {
    intro: "Intro",
    video: "Video del paso",
    mini: "Mini práctica",
    final: "Práctica final",
    rating: "Calificación",
    summary: "Resumen",
  },
  exit: "Salir de la lección",
  exitTitle: "¿Salir de la lección?",
  exitText:
    "Lo que llevas de esta lección no se guarda. Puedes volver a empezarla desde el curso.",
  exitStay: "Seguir en la lección",
  exitLeave: "Salir",
  backToCourse: "Volver al curso",

  // 1 · Intro
  eyebrow: (number: number | null) =>
    number === null ? "Lección" : `Lección ${number}`,
  stepCount: (total: number, allNew: boolean) =>
    `${total} ${total === 1 ? "paso" : "pasos"}${
      allNew ? (total === 1 ? " nuevo" : " nuevos") : ""
    }`,
  minutes: (m: number) => `unos ${m} ${m === 1 ? "minuto" : "minutos"}`,
  stepsTitle: "Lo que vas a aprender",
  howTitle: "Cómo va",
  how: "Primero ves cada paso por tiempos y lo practicas solo, con la cuenta del coach. Al final lo bailas todo junto sobre una canción y nos cuentas cómo te fue.",
  start: "Empezar",
  noSteps: "Esta lección todavía no tiene pasos.",

  // 2 · Video
  videoEyebrow: (number: number | null, i: number, n: number) =>
    `${number === null ? "Lección" : `Lección ${number}`} · Paso ${i} de ${n}`,
  roleLabel: "Rol del video",
  roles: { leader: "Líder", follower: "Seguidor" } satisfies Record<
    DanceRole,
    string
  >,
  videoPending: "Video en preparación",
  play: "Reproducir video (en preparación)",
  byBeats: "Por tiempos",
  noBeatNotes: "La descripción por tiempos de este paso llega pronto.",
  beat: (n: number) => `Tiempo ${n}`,
  practiceStep: "Practicar este paso",

  // 3–4 · Práctica
  preparing: "Preparando la práctica…",
  continue: "Continuar",
  practiceTitle: {
    mini: (name: string) => `Mini práctica: ${name}`,
    final: "Práctica final",
  },
  problem: {
    soon: {
      title: "Práctica disponible pronto",
      text: "Estamos preparando la canción de esta práctica. Mientras tanto puedes ver los pasos; la lección se completa cuando la práctica esté lista.",
    },
    subscription: {
      title: "Activa tu plan para practicar",
      text: "La práctica con el coach y el repaso son parte del plan. Los videos y la descripción de los pasos se ven sin él.",
      action: "Ver planes",
    },
    locked: {
      title: "Esta lección se abre al terminar la anterior",
      text: "Termina la lección anterior del curso para practicar esta.",
    },
    offline: {
      title: "Sin conexión",
      text: "No pudimos preparar la práctica. Revisa tu conexión y vuelve a intentarlo.",
    },
    error: {
      title: "No pudimos preparar la práctica",
      text: "Algo falló de nuestro lado. Vuelve a intentarlo en un momento.",
    },
  },
  retry: "Reintentar",
  skipPractice: "Seguir sin practicar",

  // 5 · Calificación
  ratingTitle: "¿Cómo te fue?",
  ratingIntro:
    "Califica cada paso según cómo lo bailaste. Con eso decidimos cuándo vuelve a tu repaso.",
  notDue: "No vence hoy",
  skip: "Saltar este paso",
  skipped: "Saltado: sigue en su fecha de repaso.",
  finish: "Terminar lección",
  finishing: "Guardando…",
  finishHint: "Califica o salta cada paso; al menos uno con calificación.",
  ratingError: {
    subscription:
      "Necesitas un plan activo para guardar la calificación. Revisa tu plan y vuelve a intentarlo.",
    offline: "Sin conexión: no se guardó. Vuelve a intentarlo.",
    error: "No pudimos guardar la calificación. Vuelve a intentarlo.",
  },

  // 6 · Resumen
  doneEyebrow: "Lección completada",
  doneTitle: (title: string) => `Terminaste ${title}`,
  toReview: "Al repaso",
  toReviewText: "Cada paso vuelve a tu repaso en esta fecha:",
  returnsTomorrow: "vuelve mañana",
  returnsToday: "vuelve hoy",
  returnsOn: (date: string) => `vuelve el ${date}`,
  noDate: "sin fecha de repaso",
  nextEyebrow: (n: number) => `Siguiente · Lección ${n}`,
  nextCta: (n: number) => `Empezar lección ${n}`,
  courseDone: "Terminaste todas las lecciones del curso.",

  // Bloqueada
  lockedTitle: "Esta lección se abre al terminar la anterior",
  lockedText: (title: string) =>
    `"${title}" se desbloquea cuando completas la lección anterior del curso.`,
} as const;
