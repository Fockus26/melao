import { ChartColumn, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ICON_STROKE } from "@/components/ui/icon";
import { EMAIL_CHANGE_NOTICES } from "@/lib/auth/errors";
import type { EmailChangeResult } from "@/lib/auth/redirect";
import type { DanceRole, StyleOption } from "@/lib/course/path";
import {
  PROFILE_LINKS,
  type ProfileAccount,
  type ProfileCoach,
  type ProfileLatency,
  type ProfileSubscription,
} from "@/lib/profile/profile";
import type { ThemePreference } from "@/lib/theme";
import { AccountSection } from "./account-section";
import { LocalDate } from "./local-date";
import { CoachSection, DanceSection, ThemeSection } from "./preferences";
import { SubscriptionCard } from "./subscription-card";

// Copy provisional (CONTENT_CHECKLIST fila 74).
const COPY = {
  title: "Perfil",
  progress: "Tu progreso",
  progressText: "Lecciones, pasos y próximos repasos",
} as const;

export type ProfileViewProps = {
  account: ProfileAccount;
  role: DanceRole | null;
  /** Estilos publicados (`style_progress`). */
  styles: readonly StyleOption[];
  /** Estilo con el que abre la app (`pickCurrentStyle`, el mismo de Inicio y Curso). */
  currentStyle: StyleOption | null;
  coach: ProfileCoach;
  latency: ProfileLatency;
  theme: ThemePreference;
  subscription: ProfileSubscription | null;
  /** Resultado del enlace de cambio de correo (`?email=`, D134). */
  notice?: EmailChangeResult | null;
  userId?: string;
  mode?: "live" | "sample";
};

/**
 * Perfil (handoff § Perfil): cuenta, enlace a Progreso (D028), tu baile, coach, tema,
 * suscripción y cerrar sesión. Solo presenta y guarda preferencias del alumno (SDK + RLS, sin
 * reglas); la suscripción llega resuelta por `my_subscription()`. La usan `/app/profile` y la
 * muestra `/layouts/profile`.
 */
export function ProfileView(props: ProfileViewProps) {
  const { userId, mode } = props;
  const notice = props.notice ? EMAIL_CHANGE_NOTICES[props.notice] : null;
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div className="flex flex-col gap-6">
        <h1 className="type-display">{COPY.title}</h1>
        {notice ? (
          <Alert variant={notice.tone}>
            <AlertContent>
              <AlertTitle>{notice.title}</AlertTitle>
              <AlertDescription>{notice.text}</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}
        <AccountSection account={props.account} userId={userId} mode={mode} />
        <Link
          href={PROFILE_LINKS.progress}
          className="flex min-h-16 items-center gap-4 rounded-md border border-divider px-4 py-2 transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none"
        >
          <ChartColumn
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className="size-6 shrink-0"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="type-h4">{COPY.progress}</span>
            <span className="type-small text-text-secondary">
              {COPY.progressText}
            </span>
          </span>
          <ChevronRight
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className="size-4.5 shrink-0 text-text-secondary"
          />
        </Link>
      </div>

      <DanceSection
        role={props.role}
        styles={props.styles}
        currentStyle={props.currentStyle}
        userId={userId}
        mode={mode}
      />
      <CoachSection
        coach={props.coach}
        latency={props.latency}
        latencyDate={
          props.latency ? <LocalDate iso={props.latency.measuredAt} /> : null
        }
        userId={userId}
        mode={mode}
      />
      <ThemeSection theme={props.theme} userId={userId} mode={mode} />
      <SubscriptionCard subscription={props.subscription} />
      <SignOutButton className="w-full" />
    </div>
  );
}
