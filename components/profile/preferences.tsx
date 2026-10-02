"use client";

import { ChevronRight, Headphones } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { StyleSheet } from "@/components/app/style-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ICON_STROKE } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { SwitchField } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PROFILE_PATH } from "@/lib/auth/redirect";
import type { DanceRole, StyleOption } from "@/lib/course/path";
import {
  latencyLabel,
  PROFILE_LINKS,
  type ProfileCoach,
  type ProfileLatency,
  ROLE_LABELS,
  THEME_LABELS,
  VOLUME_STEP,
  volumeLabel,
} from "@/lib/profile/profile";
import { setThemePreference, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { type SaveStatus, useProfileSave } from "./use-profile-save";

// Copy provisional (CONTENT_CHECKLIST fila 74).
const COPY = {
  dance: "Tu baile",
  role: "Rol",
  roleHelp:
    "Ves los videos de tu rol en todos los estilos, y tus repasos son los de ese rol.",
  style: "Estilo con el que abre la app",
  styleHelp: "Inicio, Curso y Práctica empiezan en este estilo.",
  chooseStyle: "Cambiar el estilo con el que abre la app",
  coach: "Coach",
  volume: "Volumen de la voz",
  spoken: "Cuenta hablada",
  spokenHelp: "El coach dice los tiempos en voz alta mientras bailas.",
  latency: "Latencia de los audífonos",
  latencyCalibrated: "Calibrada el ",
  latencyNone:
    "Sin calibrar, la cuenta usa la latencia que informa el navegador. Calibra si la sientes desfasada.",
  calibrate: "Calibrar",
  theme: "Tema",
  themeNote: "La práctica siempre va en negro, para leerla de lejos.",
} as const;

export type PreferencesMode = { userId?: string; mode?: "live" | "sample" };

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="border-b border-divider pb-2 type-h3">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** "Guardado." discreto o el error (`role="alert"`) bajo la sección. */
function SaveLine({ status }: { status: SaveStatus }) {
  return (
    <p
      role={status && !status.ok ? "alert" : "status"}
      className={cn(
        "min-h-5 type-small",
        status?.ok === false ? "text-error" : "text-text-secondary",
      )}
    >
      {status?.text}
    </p>
  );
}

function Labelled({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p id={id} className="type-body font-medium text-text">
        {label}
      </p>
      {children}
      {help ? (
        <p id={`${id}-help`} className="type-small text-text-secondary">
          {help}
        </p>
      ) : null}
    </div>
  );
}

// ── Tu baile ─────────────────────────────────────────────────────────────────

/**
 * Rol (D023: uno para todos los estilos) y estilo con el que abre la app
 * (`profiles.default_style_id`). Con 2 estilos, segmentado; con 3 o más, una fila que abre el
 * Sheet "Elige tu estilo" de Inicio y Curso; con 1, solo se muestra.
 */
export function DanceSection({
  role,
  styles,
  currentStyle,
  userId,
  mode = "live",
}: PreferencesMode & {
  role: DanceRole | null;
  styles: readonly StyleOption[];
  currentStyle: StyleOption | null;
}) {
  const roleId = useId();
  const styleId = useId();
  const [value, setValue] = useState<DanceRole | null>(role);
  const [styleValue, setStyleValue] = useState(currentStyle?.id ?? null);
  const { status, save } = useProfileSave({ userId, mode });

  function changeRole(next: DanceRole) {
    const previous = value;
    setValue(next);
    void save({ dance_role: next }, () => setValue(previous));
  }

  function changeStyle(next: string) {
    const previous = styleValue;
    setStyleValue(next);
    void save({ default_style_id: next }, () => setStyleValue(previous));
  }

  return (
    <Section id="profile-dance" title={COPY.dance}>
      <Labelled id={roleId} label={COPY.role} help={COPY.roleHelp}>
        <ToggleGroup
          type="single"
          variant="segment"
          aria-labelledby={roleId}
          aria-describedby={`${roleId}-help`}
          value={value ?? ""}
          onValueChange={(v) => v && changeRole(v as DanceRole)}
        >
          {(Object.keys(ROLE_LABELS) as DanceRole[]).map((r) => (
            <ToggleGroupItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Labelled>

      {styles.length > 0 ? (
        <Labelled id={styleId} label={COPY.style} help={COPY.styleHelp}>
          {styles.length === 2 ? (
            <ToggleGroup
              type="single"
              variant="segment"
              aria-labelledby={styleId}
              aria-describedby={`${styleId}-help`}
              value={styleValue ?? ""}
              onValueChange={(v) => v && changeStyle(v)}
            >
              {styles.map((s) => (
                <ToggleGroupItem
                  key={s.id}
                  value={s.id}
                  // Nombres largos a 320 px: parten en dos líneas en vez de desbordar.
                  className="h-auto min-h-10 whitespace-normal text-center"
                >
                  {s.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : styles.length > 2 ? (
            <StyleSheet
              styles={styles}
              currentStyleId={currentStyle?.id ?? null}
              role={value}
              userId={userId}
              mode={mode}
              returnTo={PROFILE_PATH}
            >
              <button
                type="button"
                aria-describedby={`${styleId}-help`}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-md border border-border-input px-4 text-left",
                  "transition-colors duration-hover ease-standard hover:border-text hover:bg-hover motion-reduce:transition-none",
                )}
              >
                <span className="sr-only">{COPY.chooseStyle}: </span>
                <span className="min-w-0 flex-1 type-body font-medium">
                  {currentStyle?.name}
                </span>
                <ChevronRight
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                  className="size-4.5 shrink-0 text-text-secondary"
                />
              </button>
            </StyleSheet>
          ) : (
            <p className="type-body">{styles[0].name}</p>
          )}
        </Labelled>
      ) : null}
      <SaveLine status={status} />
    </Section>
  );
}

// ── Coach ────────────────────────────────────────────────────────────────────

/**
 * Volumen de la voz (se guarda al soltar el slider) y cuenta hablada (al cambiar). La card de
 * latencia muestra la última calibración web (D124) y lleva a Calibrar.
 */
export function CoachSection({
  coach,
  latency,
  latencyDate,
  userId,
  mode = "live",
}: PreferencesMode & {
  coach: ProfileCoach;
  latency: ProfileLatency;
  /** Fecha de la calibración ya formateada (la pone el servidor o la muestra). */
  latencyDate?: React.ReactNode;
}) {
  const volumeId = useId();
  const [volume, setVolume] = useState(coach.volume);
  const [saved, setSaved] = useState(coach.volume);
  const [spoken, setSpoken] = useState(coach.spokenCount);
  const { status, save } = useProfileSave({ userId, mode });

  return (
    <Section id="profile-coach" title={COPY.coach}>
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <span id={volumeId} className="type-body text-text">
            {COPY.volume}
          </span>
          <span className="type-small tabular-nums text-text-secondary">
            {volumeLabel(volume)}
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={VOLUME_STEP}
          value={[volume]}
          onValueChange={([v]) => v !== undefined && setVolume(v)}
          onValueCommit={([v]) => {
            if (v === undefined || v === saved) return;
            const previous = saved;
            setSaved(v);
            void save({ coach_voice_volume: v }, () => {
              setVolume(previous);
              setSaved(previous);
            });
          }}
          aria-labelledby={volumeId}
          valueText={volumeLabel}
        />
      </div>
      <SwitchField
        label={COPY.spoken}
        description={COPY.spokenHelp}
        checked={spoken}
        onCheckedChange={(next) => {
          setSpoken(next);
          void save({ coach_spoken_count: next }, () => setSpoken(!next));
        }}
      />
      <Card size="compact" className="flex-row flex-wrap items-center">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-text"
        >
          <Headphones strokeWidth={ICON_STROKE} className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <h3 className="type-h4">{COPY.latency}</h3>
          <p className="type-body tabular-nums">{latencyLabel(latency)}</p>
          <p className="type-small text-text-secondary">
            {latency ? (
              <>
                {COPY.latencyCalibrated}
                {latencyDate}.
              </>
            ) : (
              COPY.latencyNone
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={PROFILE_LINKS.calibration}>{COPY.calibrate}</Link>
        </Button>
      </Card>
      <SaveLine status={status} />
    </Section>
  );
}

// ── Tema ─────────────────────────────────────────────────────────────────────

/** Orden del handoff: Sistema, Claro, Oscuro. */
const THEME_ORDER: readonly ThemePreference[] = ["system", "light", "dark"];

/**
 * Sistema / Claro / Oscuro (D007). Se aplica al instante en este navegador (`lib/theme.ts`) y
 * se guarda en `profiles.theme`, que manda al cargar con sesión (D136, ThemeSync). Si guardar
 * falla, vuelve al anterior en los dos lados.
 */
export function ThemeSection({
  theme,
  userId,
  mode = "live",
}: PreferencesMode & { theme: ThemePreference }) {
  const [value, setValue] = useState(theme);
  const { status, save } = useProfileSave({ userId, mode });

  function change(next: ThemePreference) {
    const previous = value;
    setValue(next);
    setThemePreference(next);
    void save({ theme: next }, () => {
      setValue(previous);
      setThemePreference(previous);
    });
  }

  return (
    <Section id="profile-theme" title={COPY.theme}>
      <div className="flex flex-col gap-2">
        <ToggleGroup
          type="single"
          variant="segment"
          aria-labelledby="profile-theme"
          aria-describedby="profile-theme-help"
          value={value}
          onValueChange={(v) => v && change(v as ThemePreference)}
        >
          {THEME_ORDER.map((t) => (
            <ToggleGroupItem key={t} value={t}>
              {THEME_LABELS[t]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p id="profile-theme-help" className="type-small text-text-secondary">
          {COPY.themeNote}
        </p>
      </div>
      <SaveLine status={status} />
    </Section>
  );
}
