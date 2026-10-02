import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProfileView,
  type ProfileViewProps,
} from "@/components/profile/profile-view";
import type { StyleOption } from "@/lib/course/path";
import type { ProfileSubscription } from "@/lib/profile/profile";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Perfil · Layouts",
  robots: { index: false, follow: false },
};

/**
 * Muestra de Perfil sin sesión ni base (el real exige cuenta): los estados por `?state=`. Los
 * controles cambian en pantalla pero no escriben nada; el tema sí se aplica en este navegador.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */

const STATES = {
  subscribed: "Con suscripción",
  "no-subscription": "Sin suscripción",
  uncalibrated: "Sin calibrar",
  "three-styles": "3 estilos",
  long: "Nombre y correo largos",
  "pending-email": "Correo por confirmar",
  "email-changed": "Correo cambiado",
  "email-expired": "Enlace vencido",
} as const;
type SampleState = keyof typeof STATES;

const style = (id: string, name: string, done: number): StyleOption => ({
  id,
  name,
  hasRoles: true,
  chosen: true,
  hasCourse: true,
  lessonCount: 6,
  completedCount: done,
});

const TWO_STYLES = [
  style("salsa-casino", "Salsa casino", 2),
  style("merengue", "Merengue", 0),
];
const THREE_STYLES = [
  ...TWO_STYLES,
  { ...style("rueda", "Rueda de casino", 0), hasCourse: false, lessonCount: 0 },
];

const ACTIVE: ProfileSubscription = {
  planName: "Básico",
  price: "US$20 / mes",
  state: "active",
  currentPeriodEnd: "2026-10-30T15:00:00.000Z",
};

const BASE: ProfileViewProps = {
  account: {
    name: "Laura Gómez",
    email: "laura.gomez@example.com",
    pendingEmail: null,
  },
  role: "follower",
  styles: TWO_STYLES,
  currentStyle: TWO_STYLES[0],
  coach: { volume: 80, spokenCount: true },
  latency: { offsetMs: 124, measuredAt: "2026-09-28T21:30:00.000Z" },
  theme: "system",
  subscription: ACTIVE,
  mode: "sample",
};

function propsFor(state: SampleState): ProfileViewProps {
  switch (state) {
    case "no-subscription":
      return { ...BASE, subscription: null };
    case "uncalibrated":
      return { ...BASE, latency: null };
    case "three-styles":
      return {
        ...BASE,
        styles: THREE_STYLES,
        currentStyle: THREE_STYLES[0],
        role: "leader",
      };
    case "long":
      return {
        ...BASE,
        account: {
          // 40 caracteres de nombre y un correo que no cabe a 320 px.
          name: "María Fernanda de los Ángeles Valdés Ruiz",
          email:
            "maria.fernanda.valdes.ruiz.bailarina@correo-largo.example.com",
          pendingEmail: null,
        },
        subscription: {
          ...ACTIVE,
          state: "expired",
          currentPeriodEnd: "2026-09-15T15:00:00.000Z",
        },
      };
    case "pending-email":
      return {
        ...BASE,
        account: { ...BASE.account, pendingEmail: "laura@example.org" },
      };
    case "email-changed":
      return { ...BASE, notice: "changed" };
    case "email-expired":
      return { ...BASE, notice: "link-expired" };
    default:
      return BASE;
  }
}

export default async function ProfileSample(
  props: PageProps<"/layouts/profile">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.state);
  const state: SampleState =
    raw && raw in STATES ? (raw as SampleState) : "subscribed";

  return (
    <AppShell
      currentPath="/app/profile"
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-12">
        <ProfileView key={state} {...propsFor(state)} />
        <section
          aria-labelledby="muestra-estados"
          className="flex flex-col gap-4 rounded-md border border-divider bg-surface p-5"
        >
          <h2 id="muestra-estados" className="type-h4">
            Estados de la muestra
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(STATES) as SampleState[]).map((key) => (
              <li key={key}>
                <Link
                  href={`/layouts/profile?state=${key}`}
                  aria-current={key === state ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-pill border px-4 type-small",
                    key === state
                      ? "border-primary bg-primary font-semibold text-on-primary"
                      : "border-border-input text-text hover:bg-hover",
                  )}
                >
                  {STATES[key]}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
