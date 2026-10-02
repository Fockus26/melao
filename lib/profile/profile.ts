/**
 * Perfil (App-Perfil): tipos y reglas de presentación, puros (sin React ni Next) para probarlos
 * con `bun test` y portarlos a Android/iOS. Lo que tiene regla de negocio (qué suscripción se
 * ve y en qué estado) sale de `my_subscription()` (D135); aquí solo se le pone texto.
 * Copy provisional (CONTENT_CHECKLIST fila 74).
 */

import {
  EMAIL_EMPTY_ERROR,
  EMAIL_FORMAT_ERROR,
  isValidEmail,
  isValidName,
  NAME_MAX_LENGTH,
} from "@/lib/auth/validation";
import type { DanceRole } from "@/lib/course/path";
import { billingInterval, formatPricePer } from "@/lib/plans/format";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

/** Destinos de Perfil. Calibrar llega en la ola 2 (404 hasta entonces). */
export const PROFILE_LINKS = {
  calibration: "/app/profile/calibration",
  plans: "/plans",
  progress: "/app/progress",
} as const;

export type SubscriptionState = "active" | "past_due" | "canceled" | "expired";

export type ProfileSubscription = {
  /** `null` si el plan dejó de estar activo (el alumno ya no lo lee). */
  planName: string | null;
  /** "US$20 / mes", o `null` sin plan legible. */
  price: string | null;
  state: SubscriptionState;
  currentPeriodEnd: string;
};

export type ProfileAccount = {
  name: string | null;
  email: string | null;
  /** Correo nuevo de un cambio que aún no se confirma (`user.new_email`). */
  pendingEmail: string | null;
};

export type ProfileCoach = {
  /** `profiles.coach_voice_volume`, 0–100. */
  volume: number;
  /** `profiles.coach_spoken_count`. */
  spokenCount: boolean;
};

/** Última calibración web (D124); `null` = sin calibrar. */
export type ProfileLatency = { offsetMs: number; measuredAt: string } | null;

export const ROLE_LABELS: Record<DanceRole, string> = {
  leader: "Líder",
  follower: "Seguidor",
};

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

/**
 * Iniciales del avatar: las de las dos primeras palabras del nombre ("Laura Gómez" → "LG"),
 * una si es una sola palabra, y la del correo si no hay nombre. Siempre en mayúscula.
 */
export function initials(name: string | null, email: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 0
      ? words.slice(0, 2).map((w) => [...w][0])
      : [[...(email ?? "").trim()][0] ?? "?"];
  return letters.join("").toLocaleUpperCase("es");
}

// ── Editar nombre y correo ───────────────────────────────────────────────────

export const NAME_EMPTY_ERROR = "Escribe tu nombre.";
export const NAME_LENGTH_ERROR = `Tu nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`;

export type AccountDraft = { name: string; email: string };

export type AccountCheck = {
  errors: { name: string | null; email: string | null };
  /** Nombre a guardar (recortado) si cambió; `null` si no. */
  name: string | null;
  /** Correo nuevo (recortado) si cambió; `null` si no o si es el mismo sin importar mayúsculas. */
  email: string | null;
};

/**
 * Valida el formulario de cuenta contra lo guardado. Nombre 1–80 (el CHECK de
 * `profiles.display_name`); correo con forma mínima (Supabase valida el resto). Un correo igual
 * al actual (o al pendiente) no es un cambio.
 */
export function checkAccount(
  draft: AccountDraft,
  current: ProfileAccount,
): AccountCheck {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const nameError = !name
    ? NAME_EMPTY_ERROR
    : isValidName(name)
      ? null
      : NAME_LENGTH_ERROR;
  const emailError = !email
    ? EMAIL_EMPTY_ERROR
    : isValidEmail(email)
      ? null
      : EMAIL_FORMAT_ERROR;
  const same = (a: string | null) =>
    !!a && a.trim().toLowerCase() === email.toLowerCase();
  return {
    errors: { name: nameError, email: emailError },
    name: !nameError && name !== (current.name ?? "") ? name : null,
    email:
      !emailError && !same(current.email) && !same(current.pendingEmail)
        ? email
        : null,
  };
}

// ── Coach ────────────────────────────────────────────────────────────────────

export const VOLUME_STEP = 5;

/** `80` → "80 %" (es-419 separa el signo). */
export function volumeLabel(volume: number): string {
  return `${Math.round(volume)} %`;
}

/** "120 ms" con signo si es negativa; `null` → "Sin calibrar". */
export function latencyLabel(latency: ProfileLatency): string {
  return latency ? `${latency.offsetMs} ms` : "Sin calibrar";
}

// ── Suscripción ──────────────────────────────────────────────────────────────

type SubscriptionRow = {
  plan_name: string | null;
  price_cents: number | null;
  currency: string | null;
  billing_interval: string | null;
  state: string;
  current_period_end: string;
};

const STATES: readonly SubscriptionState[] = [
  "active",
  "past_due",
  "canceled",
  "expired",
];

/** Fila de `my_subscription()` → lo que muestra la card. Un estado desconocido, vencido. */
export function toProfileSubscription(
  row: SubscriptionRow | null | undefined,
): ProfileSubscription | null {
  if (!row) return null;
  const state = (STATES as readonly string[]).includes(row.state)
    ? (row.state as SubscriptionState)
    : "expired";
  return {
    planName: row.plan_name,
    price:
      row.price_cents !== null && row.billing_interval
        ? formatPricePer(
            row.price_cents,
            row.currency ?? "USD",
            billingInterval(row.billing_interval),
          )
        : null,
    state,
    currentPeriodEnd: row.current_period_end,
  };
}

/** Pill con texto (nunca solo color) y su tono. */
export const SUBSCRIPTION_PILLS: Record<
  SubscriptionState,
  { label: string; variant: "ok" | "warning" | "neutral" }
> = {
  active: { label: "Activo", variant: "ok" },
  past_due: { label: "Pago pendiente", variant: "warning" },
  canceled: { label: "Cancelado", variant: "neutral" },
  expired: { label: "Vencido", variant: "neutral" },
};

/** Inicio de la línea del período, antes de la fecha: "Se renueva el" 30 de octubre de 2026. */
export const PERIOD_PREFIX: Record<SubscriptionState, string> = {
  active: "Se renueva el",
  past_due: "Pago pendiente desde el",
  canceled: "Terminó el",
  expired: "Venció el",
};

// ── Tema (D136) ──────────────────────────────────────────────────────────────

/**
 * Tema que hay que aplicar al cargar con sesión: si el del perfil difiere del guardado en este
 * navegador, manda el perfil (lo eligió en otro dispositivo o en otra sesión). `null` = nada.
 */
export function themeToApply(
  profileTheme: string | null | undefined,
  localTheme: ThemePreference,
): ThemePreference | null {
  if (!isThemePreference(profileTheme)) return null;
  return profileTheme === localTheme ? null : profileTheme;
}
