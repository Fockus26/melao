import type { StageSnapshot } from "@/lib/stage/source";
import type { StageView } from "@/lib/stage/view";

/**
 * Textos del escenario. PROVISIONALES (CONTENT_CHECKLIST fila 41): los de la rejilla del
 * handoff §3 (AHORA, SIGUIENTE · EN EL 1, SE REPITE, DESPUÉS) y los de los estados, que el
 * handoff no escribe. Las etiquetas van en minúscula: `type-stage-label` las pone en mayúscula.
 */
export const stageCopy = {
  title: "Sesión de práctica",
  now: "Ahora",
  next: "Siguiente",
  nextOnOne: "Siguiente · en el 1",
  entersOnOne: "entra en el 1",
  repeats: "Se repite",
  repeatsHint: "solo cuenta, sin nombrarlo",
  later: "Después",
  leadIn: "Entrada",
  end: "Fin",
  lastStep: "Fin de la práctica",
  phrase: (index: number, count: number) => `frase ${index} de ${count}`,
  exit: "Salir de la práctica",
  restart: "Reiniciar",
  pause: "Pausa",
  resume: "Reanudar",
  again: "Empezar de nuevo",
  voice: "Voz del coach",
  paused: "En pausa",
  voiceOff: "Cuenta en silencio",
  screen: "La pantalla puede apagarse",
  preparing: "Preparando audio",
  tapToStart: "Toca para empezar",
  progress: "Progreso de la canción",
  progressText: (pos: string, total: string) => `${pos} de ${total}`,
  exitTitle: "¿Salir de la práctica?",
  exitText:
    "La canción se detiene aquí. Puedes volver a empezar la práctica cuando quieras.",
  exitStay: "Seguir bailando",
  exitLeave: "Salir",
  ended: "Práctica terminada.",
  // PROVISIONAL (CONTENT_CHECKLIST fila 67): sesión de práctica libre.
  finish: "Terminar",
  blocked: "Audio listo. Toca para empezar.",
} as const;

/** Nombre del paso en curso o de la sección ("Entrada", "Fin"). */
export function currentName(view: StageView): string {
  if (view.current) return view.current.name;
  return view.section === "end" ? stageCopy.end : stageCopy.leadIn;
}

/**
 * Lo que oye el lector de pantalla al cambiar de paso (región `polite`, D068): nunca el tiempo
 * ni la cuenta, que cambian 3 veces por segundo; el coach de voz es el canal del ritmo.
 */
export function stepSummary(view: StageView): string {
  const now = view.current
    ? `${stageCopy.now}: ${view.current.name}.`
    : `${currentName(view)}.`;
  if (view.section === "end") return stageCopy.ended;
  if (view.repeats) return `${now} ${stageCopy.repeats}.`;
  if (!view.next) return `${now} ${stageCopy.lastStep}.`;
  return `${now} ${stageCopy.next}: ${view.next.name}.`;
}

/** Texto de la región `polite` del Stage: cambia con el paso o el estado, nunca con el tiempo. */
export function stageAnnouncement(snapshot: StageSnapshot): string {
  const { status, view, screenMayTurnOff } = snapshot;
  const screen = screenMayTurnOff ? ` ${stageCopy.screen}.` : "";
  switch (status.kind) {
    case "preparing":
      return `${stageCopy.preparing}.`;
    case "blocked":
      return stageCopy.blocked;
    case "paused":
      return `${stageCopy.paused}.${screen}`;
    case "ended":
      return stageCopy.ended;
    default:
      return `${stepSummary(view)}${screen}`;
  }
}
