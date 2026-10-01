/**
 * Textos del resultado de la práctica. PROVISIONALES (CONTENT_CHECKLIST fila 69), salvo los que
 * el handoff (§ Práctica · resultado) escribe tal cual: "y N más que no vencen hoy · Mostrarlos",
 * "Otra vez" y "Guardar". Las etiquetas 1–4 son las de RatingButtons (fila 36).
 */
export const resultCopy = {
  title: "Resultado de la práctica",
  close: "Cerrar y volver a Practicar",
  eyebrow: (style: string) => `Práctica terminada · ${style}`,
  stats: {
    label: "Resumen de la sesión",
    duration: "Duración",
    steps: "Pasos distintos",
    phrases: "Frases",
  },

  // Calificación
  ratingTitle: "¿Cómo te fue?",
  ratingIntro:
    "Califica cada paso según cómo lo bailaste. Con eso decidimos cuándo vuelve a tu repaso.",
  ratingIntroNoneDue:
    "Hoy no te vencía ninguno de estos pasos. Califica los que quieras, al menos uno.",
  dueHint: "Vence hoy",
  optionalHint: "No vence hoy · opcional",
  clear: "Quitar calificación",
  more: (n: number) =>
    `y ${n} ${n === 1 ? "más que no vence" : "más que no vencen"} hoy · `,
  show: "Mostrarlos",
  hide: "Ocultarlos",
  again: "Otra vez",
  save: "Guardar",
  saving: "Guardando…",
  blocker: {
    due: (n: number) =>
      n === 1
        ? "Falta calificar 1 paso que vence hoy."
        : `Faltan calificar ${n} pasos que vencen hoy.`,
    none: "Califica al menos un paso para guardar.",
  },
  error: {
    subscription:
      "Necesitas un plan activo para guardar la calificación. Revisa tu plan y vuelve a intentarlo.",
    offline: "Sin conexión: no se guardó. Vuelve a intentarlo.",
    error: "No pudimos guardar la calificación. Vuelve a intentarlo.",
  },

  // Guardado (o ya calificada antes)
  savedTitle: "Calificación guardada",
  savedNow: "Listo. Cada paso vuelve a tu repaso en esta fecha:",
  savedBefore:
    "Ya calificaste esta práctica. Cada paso vuelve a tu repaso en esta fecha:",
  notRated: "Sin calificar",
  returnsToday: "vuelve hoy",
  returnsTomorrow: "vuelve mañana",
  returnsOn: (date: string) => `vuelve el ${date}`,
  noDate: "sin fecha de repaso",
  finish: "Terminar",
} as const;
