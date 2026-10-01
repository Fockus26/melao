import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { statusCopy } from "@/components/status/copy";
import { MaintenanceScreen } from "@/components/status/maintenance-screen";
import { isMaintenanceOn, maintenanceUntil } from "@/lib/maintenance";

/**
 * Pantalla de mantenimiento (D111). Llega por la reescritura de `proxy.ts` (503) con
 * `MAINTENANCE_MODE=1`; sin el modo encendido no existe (404).
 */
export const metadata: Metadata = {
  title: statusCopy.maintenance.pageTitle,
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  // Las variables se leen en cada petición, no al construir la página.
  await connection();
  if (!isMaintenanceOn(process.env)) notFound();
  const until = maintenanceUntil(process.env);
  return <MaintenanceScreen until={until?.toISOString() ?? null} />;
}
