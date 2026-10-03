// Copy provisional del Resumen del admin (CONTENT_CHECKLIST fila 84). Los motivos llegan como
// códigos de `admin_summary()` (D155); aquí está su texto.
import type { SummaryItemKind } from "@/lib/admin/summary";

const dateFormat = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `YYYY-MM-DD` → "12 oct 2026" (fecha de calendario, sin zona). */
export function formatDay(day: string): string {
  const time = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(time) ? day : dateFormat.format(time);
}

const plural = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

export const summaryCopy = {
  overline: "Panel",
  title: "Resumen",
  statsHeading: "Contadores",
  steps: "Pasos publicados",
  songs: "Canciones publicadas",
  lessons: "Lecciones publicadas",
  lessonsNote: "En cursos publicados",
  students: "Alumnos",
  of: (total: number) => `de ${total}`,
  styleCount: (published: number, total: number) => `${published} de ${total}`,
  styleDraft: "sin publicar",
  studentsActive: (n: number) =>
    n === 1 ? "1 con suscripción activa" : `${n} con suscripción activa`,
  noStyles: "Todavía no hay estilos.",
  warnings: "Avisos",
  warningsText: "Lo que ya ven los alumnos y necesita arreglo.",
  warningsEmpty: "Sin avisos.",
  pending: "Pendientes",
  pendingText: "Borradores y lo que les falta para publicarse.",
  pendingEmpty: "Sin pendientes.",
  count: (n: number, kind: "warnings" | "pending") =>
    kind === "warnings"
      ? plural(n, "aviso", "avisos")
      : plural(n, "pendiente", "pendientes"),
  more: (n: number) => `Ver ${n} más`,
  noStyle: "Sin estilo",
  readyToPublish: "Listo para publicar",
  error: "No pudimos cargar el resumen.",
  errorText: "Revisa tu conexión y vuelve a intentarlo.",
  retry: "Reintentar",
  loading: "Cargando el resumen…",
  kind: {
    step: "Paso",
    song: "Canción",
    lesson: "Lección",
    style: "Estilo",
  } satisfies Record<SummaryItemKind, string>,
  reason: (code: string, expiresOn: string | null): string => {
    switch (code) {
      case "missing_video":
        return "Le falta el video de algún rol";
      case "license_expired":
        return expiresOn
          ? `Licencia vencida el ${formatDay(expiresOn)}`
          : "Licencia vencida";
      case "license_expiring":
        return expiresOn
          ? `La licencia vence el ${formatDay(expiresOn)}`
          : "La licencia vence pronto";
      case "step_unpublished":
        return "Usa pasos sin publicar";
      case "song_unavailable":
        return "Usa una canción sin publicar o con la licencia vencida";
      case "missing_song":
        return "No tiene canción de práctica ni final";
      case "missing_audio":
        return "Falta el audio";
      case "missing_grid":
        return "Falta marcar el ritmo (2 anclas)";
      case "missing_dance_end":
        return "Falta el fin de baile";
      case "missing_license":
        return "Falta la licencia";
      case "missing_start_position":
        return "Falta la posición inicial";
      default:
        return "Revisar";
    }
  },
} as const;
