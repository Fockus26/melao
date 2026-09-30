"use client";

import { useSyncExternalStore } from "react";

const format = (date: Date, timeZone?: string) =>
  new Intl.DateTimeFormat("es-419", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);

const noop = () => () => {};

/**
 * Fecha de hoy ("martes, 30 de septiembre") en la zona horaria del dispositivo. El servidor (y
 * la hidratación) la escriben en UTC, igual en los dos lados; después React la cambia a la
 * local (en la tarde de América, en UTC ya es mañana). `date` fija la fecha (muestras).
 */
export function TodayLabel({
  date,
  className,
}: {
  date?: string;
  className?: string;
}) {
  const text = useSyncExternalStore(
    noop,
    () => format(date ? new Date(date) : new Date()),
    () => format(date ? new Date(date) : new Date(), "UTC"),
  );
  return <p className={className}>{text}</p>;
}
