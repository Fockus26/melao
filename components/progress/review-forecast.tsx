"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FORECAST_DAYS,
  type ForecastDay,
  forecastAriaLabel,
  forecastBars,
  forecastTotal,
} from "@/lib/progress/progress";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { progressCopy as COPY } from "./copy";

export type ForecastState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; days: readonly ForecastDay[] };

/**
 * Próximos repasos con la zona del dispositivo (D130): el día de calendario lo define el
 * dispositivo, así que lo pide el navegador (`Intl…timeZone`) y no el Server Component, que
 * corre en UTC. Reintentar vuelve a montar la lectura.
 */
export function LiveReviewForecast({ styleId }: { styleId: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ForecastFetcher
      key={`${styleId}:${attempt}`}
      styleId={styleId}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function ForecastFetcher({
  styleId,
  onRetry,
}: {
  styleId: string;
  onRetry: () => void;
}) {
  const [state, setState] = useState<ForecastState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    createClient()
      .rpc("review_forecast", {
        p_style_id: styleId,
        p_days: FORECAST_DAYS,
        p_tz: tz,
      })
      .then(
        ({ data, error }) => {
          if (!active) return;
          setState(
            error || !data
              ? { status: "error" }
              : {
                  status: "ready",
                  days: data.map((r) => ({
                    day: r.day,
                    dueCount: r.due_count,
                  })),
                },
          );
        },
        () => active && setState({ status: "error" }),
      );
    return () => {
      active = false;
    };
  }, [styleId]);
  return <ReviewForecastCard state={state} onRetry={onRetry} />;
}

/**
 * Card "Próximos repasos" (handoff § Progreso): 7 barras de hasta 40 de ancho (radio 4 4 0 0)
 * con el número encima y el día debajo; los días sin repasos, una línea de 2 px en divider;
 * "Hoy" en 600. La gráfica es `role="img"` con un nombre que enumera los 7 días: no depende
 * solo del color ni del alto.
 */
export function ReviewForecastCard({
  state,
  onRetry,
}: {
  state: ForecastState;
  onRetry?: () => void;
}) {
  const total = state.status === "ready" ? forecastTotal(state.days) : 0;
  return (
    <Card
      aria-busy={state.status === "loading" || undefined}
      className="min-w-0 md:col-span-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="progress-forecast" className="type-eyebrow text-text-secondary">
          {COPY.forecast}
        </h2>
        {state.status === "ready" && total > 0 ? (
          <p className="type-small text-text-secondary">
            {COPY.forecastTotal(total)}
          </p>
        ) : null}
      </div>
      {state.status === "loading" ? (
        <>
          <p className="sr-only">{COPY.forecastLoading}</p>
          <div className="flex h-32 items-end gap-2">
            {Array.from({ length: FORECAST_DAYS }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: posiciones fijas del esqueleto.
                key={i}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <Skeleton className="h-16 w-full max-w-10" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </>
      ) : state.status === "error" ? (
        <div className="flex flex-col items-start gap-3">
          <p className="type-body text-text-secondary">{COPY.forecastError}</p>
          {onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              {COPY.retry}
            </Button>
          ) : null}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="type-h3">{COPY.forecastEmpty}</p>
          <p className="type-small text-text-secondary">
            {COPY.forecastEmptyText}
          </p>
        </div>
      ) : (
        <ForecastChart days={state.days} />
      )}
    </Card>
  );
}

/** Alto máximo de una barra: 20 pasos de la escala de espaciado (80 px). */
const BAR_MAX = "calc(var(--spacing) * 20)";

export function ForecastChart({ days }: { days: readonly ForecastDay[] }) {
  const bars = forecastBars(days);
  return (
    <div
      role="img"
      aria-label={forecastAriaLabel(bars)}
      data-slot="forecast-chart"
      className="flex items-end gap-2"
    >
      {bars.map((bar) => (
        <div
          key={bar.day}
          data-today={bar.isToday || undefined}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <span
            className={cn(
              "type-small tabular-nums",
              bar.count > 0 ? "text-text" : "text-text-secondary",
            )}
          >
            {bar.count}
          </span>
          {bar.count > 0 ? (
            <span
              className="w-full max-w-10 rounded-t-[calc(var(--radius-sm)/2)] bg-gold-600"
              style={{ height: `calc(${BAR_MAX} * ${bar.ratio})` }}
            />
          ) : (
            <span className="h-0.5 w-full max-w-10 bg-divider" />
          )}
          <span
            className={cn(
              "type-small",
              bar.isToday ? "font-semibold text-text" : "text-text-secondary",
            )}
          >
            {bar.shortLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
