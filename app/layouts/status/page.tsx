import type { Metadata } from "next";
import Link from "next/link";
import {
  ErrorScreen,
  OfflineScreen,
  ServerErrorScreen,
} from "@/components/status/error-screen";
import { MaintenanceScreen } from "@/components/status/maintenance-screen";
import { NotFoundScreen } from "@/components/status/not-found-screen";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Estados · Layouts",
  robots: { index: false, follow: false },
};

// Código y hora de ejemplo: el real es el `digest` de Next y `MAINTENANCE_UNTIL`.
const SAMPLE_DIGEST = "3807164215";
const SAMPLE_UNTIL = "2026-10-01T23:30:00.000Z";

const SCREENS = {
  "not-found": {
    label: "404 · con sesión",
    render: () => <NotFoundScreen signedIn />,
  },
  "not-found-guest": {
    label: "404 · invitado",
    render: () => <NotFoundScreen signedIn={false} />,
  },
  error: {
    label: "500 · con código",
    render: () => <ServerErrorScreen digest={SAMPLE_DIGEST} />,
  },
  "error-no-code": {
    label: "500 · sin código",
    render: () => <ServerErrorScreen />,
  },
  offline: { label: "Sin conexión", render: () => <OfflineScreen /> },
  // La de `app/error.tsx`: 500 o sin conexión según la red del navegador (DevTools › Offline).
  live: {
    label: "Error según la red",
    render: () => <ErrorScreen digest={SAMPLE_DIGEST} />,
  },
  maintenance: {
    label: "Mantenimiento · con hora",
    render: () => <MaintenanceScreen until={SAMPLE_UNTIL} />,
  },
  "maintenance-no-time": {
    label: "Mantenimiento · sin hora",
    render: () => <MaintenanceScreen until={null} />,
  },
} as const;

type ScreenKey = keyof typeof SCREENS;

const LINK =
  "inline-flex min-h-12 items-center rounded-sm type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

function isScreenKey(value: string | undefined): value is ScreenKey {
  return value !== undefined && Object.hasOwn(SCREENS, value);
}

/**
 * Muestra de las pantallas de estado (D109–D111) sin provocar errores reales ni encender el
 * mantenimiento: `?screen=` elige cuál. "Reintentar" recarga la página. Copy: filas 61–62.
 */
export default async function StatusSample(
  props: PageProps<"/layouts/status">,
) {
  const params = await props.searchParams;
  const raw = firstParam(params.screen);
  const key: ScreenKey = isScreenKey(raw) ? raw : "not-found";

  return (
    <>
      {SCREENS[key].render()}
      <section
        aria-labelledby="muestra-estados"
        className="mx-auto mb-12 flex w-full max-w-240 flex-col gap-3 px-6 pt-8"
      >
        <h2 id="muestra-estados" className="type-h4">
          Muestra · pantalla de estado
        </h2>
        <ul className="flex flex-wrap gap-x-4">
          {Object.entries(SCREENS).map(([k, { label }]) => (
            <li key={k}>
              <Link
                href={`/layouts/status?screen=${k}`}
                aria-current={k === key ? "page" : undefined}
                className={LINK}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <ThemeSwitch />
        <Link href="/layouts" className={LINK}>
          Volver a las muestras
        </Link>
      </section>
    </>
  );
}
