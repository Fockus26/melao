import type { Metadata } from "next";
import { StepsAdminView } from "@/components/admin/steps/steps-admin-view";
import {
  type AdminPosition,
  type AdminStepDetail,
  type AdminStepRow,
  parseAdminStepFilters,
  parseSelection,
} from "@/lib/admin/steps";
import {
  getAdminStepDetail,
  getAdminSteps,
  getAdminStyles,
  getStylePositions,
} from "@/lib/admin/steps-queries";
import { requireAdmin } from "@/lib/auth/session";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Pasos · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin · Pasos: lista + editor (D149–D153). Exige rol admin (también aquí: el layout no se
 * vuelve a evaluar al navegar, D073). Estilo = `?style=<slug>` si existe; si no, el primero por
 * `sort_order`, publicado o no. Lee la lista (`admin_steps`), las posiciones del estilo y, con
 * `?step=<uuid>`, el paso abierto; filtros y búsqueda van en el cliente.
 */
export default async function AdminStepsPage(props: PageProps<"/admin/steps">) {
  const params = await props.searchParams;
  await requireAdmin("/admin/steps");
  const selection = parseSelection(params);

  let loadError = false;
  const styles = await getAdminStyles().catch((error) => {
    console.error(error);
    loadError = true;
    return [];
  });
  const requested = firstParam(params.style);
  const style = styles.find((s) => s.slug === requested) ?? styles[0] ?? null;

  let steps: AdminStepRow[] = [];
  let positions: AdminPosition[] = [];
  let detail: AdminStepDetail | null = null;
  if (style) {
    try {
      [steps, positions, detail] = await Promise.all([
        getAdminSteps(style.id),
        getStylePositions(style.id),
        selection.kind === "step"
          ? getAdminStepDetail(style, selection.id)
          : Promise.resolve(null),
      ]);
    } catch (error) {
      console.error(error);
      loadError = true;
    }
  }

  return (
    <StepsAdminView
      // Cambiar de estilo monta la vista de nuevo (filtros y lista del servidor).
      key={style?.id ?? "none"}
      styles={styles}
      currentStyle={style}
      positions={positions}
      steps={steps}
      selection={selection}
      detail={detail}
      initialFilters={parseAdminStepFilters(params)}
      loadError={loadError}
    />
  );
}
