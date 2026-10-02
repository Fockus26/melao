import type { DanceRole } from "@/lib/course/path";
import type { Relation } from "@/lib/steps/detail";

// Copy provisional (CONTENT_CHECKLIST fila 78). Fuera del módulo cliente: también lo leen la
// página (título) y la muestra.
export const detailCopy = {
  back: "Pasos",
  /** Se lee antes de `back`: "Volver a Pasos". */
  backSr: "Volver a ",
  roleLabel: "Rol del video",
  roles: { leader: "Líder", follower: "Seguidor" } satisfies Record<
    DanceRole,
    string
  >,
  videoPending: "Video en preparación",
  play: "Reproducir video (en preparación)",
  freeNote: {
    libre:
      "Paso libre: lo bailas sin pareja, por eso tiene un solo video para todos.",
    noRoles: "En este estilo no hay roles: un solo video para los dos.",
  },
  description: "Descripción",
  status: "Tu estado",
  statusHint: "Cambia cuándo vuelve este paso a tu repaso.",
  saving: "Guardando…",
  statusProblem: {
    subscription: {
      title: "Activa tu plan para marcar tu estado",
      text: "El repaso es parte del plan. El video y la descripción del paso se ven sin él.",
      action: "Ver planes",
    },
    role: {
      title: "Elige tu rol para marcar tu estado",
      text: "El repaso es por rol. Elige si bailas como líder o como seguidor en tu perfil.",
      action: "Ir a Perfil",
    },
    offline: "Sin conexión: no se guardó tu estado. Vuelve a intentarlo.",
    error: "No pudimos guardar tu estado. Vuelve a intentarlo.",
  },
  byBeats: "Por tiempos",
  beat: (n: number) => `Tiempo ${n}`,
  noBeatNotes: "La descripción por tiempos de este paso llega pronto.",
  position: "Posición",
  start: "Empieza en",
  end: "Termina en",
  related: "Relacionados",
  relations: {
    prerequisite: "Antes aprende",
    base: "Es una variación de",
    variation: "Variaciones",
  } satisfies Record<Relation, string>,
  noRelated: "Este paso no tiene pasos relacionados por ahora.",
  history: "Historial",
  nextReview: "Próximo repaso",
  noCard: "Sin repaso programado",
  noHistory: "Aún no has repasado este paso.",
  historyRole: (role: DanceRole) =>
    role === "leader" ? "como líder" : "como seguidor",
} as const;
