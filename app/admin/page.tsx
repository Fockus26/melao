import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { summaryCopy as COPY } from "@/components/admin/summary/copy";
import { SummarySkeleton } from "@/components/admin/summary/summary-skeleton";
import { SummaryView } from "@/components/admin/summary/summary-view";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getAdminSummary } from "@/lib/admin/summary-queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Resumen · Admin",
  robots: { index: false, follow: false },
};

/**
 * Resumen del admin (`/admin`): contadores, avisos y pendientes de `admin_summary()`
 * (D154–D155). Cerrar sesión va en el encabezado mientras el admin no tenga otro sitio para
 * hacerlo (AdminShell no lo trae). El encabezado se pinta al momento; el cuerpo, con Skeleton
 * mientras llega la lectura.
 */
export default async function AdminSummaryPage() {
  await requireAdmin("/admin");
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        overline={COPY.overline}
        title={COPY.title}
        actions={<SignOutButton />}
      />
      <Suspense fallback={<SummarySkeleton />}>
        <SummaryBody />
      </Suspense>
    </div>
  );
}

async function SummaryBody() {
  return <SummaryView state={await getAdminSummary()} />;
}
