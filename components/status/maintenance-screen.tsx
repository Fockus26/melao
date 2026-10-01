import { statusCopy } from "./copy";
import { LocalTime } from "./local-time";
import { StatusScreen } from "./status-screen";

/**
 * Mantenimiento (D111): fondo `surface`, logo sin enlace, "Un momento…" en Fraunces cursiva
 * gold-700 y título display. "Volvemos aproximadamente" solo si hay `MAINTENANCE_UNTIL`.
 */
export function MaintenanceScreen({ until }: { until: string | null }) {
  const copy = statusCopy.maintenance;
  return (
    <StatusScreen
      tone="surface"
      logoHref={null}
      illustration={
        <p className="font-normal font-serif text-gold-700 text-h3 italic">
          {copy.eyebrow}
        </p>
      }
      title={copy.title}
      titleSize="display"
      text={copy.text}
      extra={
        until ? (
          <dl className="mt-8 flex flex-col gap-1 border-divider border-t pt-4">
            <dt className="type-small text-text-muted">{copy.backAt}</dt>
            <dd className="font-medium text-h2 tabular-nums">
              <LocalTime iso={until} />
            </dd>
          </dl>
        ) : null
      }
    />
  );
}
