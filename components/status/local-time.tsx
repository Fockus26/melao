"use client";

import { useSyncExternalStore } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

/**
 * "1 de octubre, 18:30 GMT-5" en es-419 (12 o 24 h según el motor de Intl). `timeZone` solo
 * para el render del servidor.
 */
export function formatLocalTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-419", { ...OPTIONS, timeZone }).format(
    new Date(iso),
  );
}

const noop = () => () => {};

/**
 * Fecha y hora en la zona del usuario. El servidor no la conoce: pinta UTC (con la zona a la
 * vista) y al hidratar se cambia a la local, sin desajuste de hidratación.
 */
export function LocalTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const text = useSyncExternalStore(
    noop,
    () => formatLocalTime(iso),
    () => formatLocalTime(iso, "UTC"),
  );
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
