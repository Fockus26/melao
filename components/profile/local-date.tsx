"use client";

import { useSyncExternalStore } from "react";

const format = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat("es-419", { dateStyle: "long", timeZone }).format(
    new Date(iso),
  );

const noop = () => () => {};

/**
 * Fecha larga ("30 de octubre de 2026") en la zona del dispositivo. Como TodayLabel: el
 * servidor y la hidratación la escriben en UTC y después React la cambia a la local.
 */
export function LocalDate({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noop,
    () => format(iso),
    () => format(iso, "UTC"),
  );
  return <time dateTime={iso}>{text}</time>;
}
