/** Estados de la muestra del resultado (`?state=`). Fuera del módulo cliente: los lee la página. */
export const SAMPLE_STATES = {
  rating: "Por calificar (3 vencidos, 5 plegados)",
  expanded: "Por calificar, opcionales a la vista",
  "none-due": "Ningún paso vence hoy",
  saved: "Ya calificada",
  error: "Error al guardar",
  long: "Título largo",
} as const;
export type SampleState = keyof typeof SAMPLE_STATES;
