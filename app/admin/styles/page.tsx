import type { Metadata } from "next";
import { StylesAdminView } from "@/components/admin/styles/styles-admin-view";
import {
  type AdminStyleFull,
  parseStyleSelection,
  type StyleIssue,
  type StyleStep,
  toStyleIssues,
} from "@/lib/admin/styles";
import { getAdminStylesFull, getStyleSteps } from "@/lib/admin/styles-queries";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Estilos · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin · Estilos (D163–D167). Exige rol admin (también aquí: el layout no se vuelve a evaluar
 * al navegar, D073). `?style=<slug>` abre ese estilo; `?style=new`, uno nuevo; sin parámetro,
 * el primero por `sort_order`. Lee `admin_styles` (todos, con contadores y posiciones) y, del
 * estilo abierto, sus pasos (catálogo) y `admin_style_issues`.
 */
export default async function AdminStylesPage(
  props: PageProps<"/admin/styles">,
) {
  const params = await props.searchParams;
  await requireAdmin("/admin/styles");
  const selection = parseStyleSelection(params);

  let loadError = false;
  const styles: AdminStyleFull[] = await getAdminStylesFull().catch((error) => {
    console.error(error);
    loadError = true;
    return [];
  });
  const isNew = selection.kind === "new";
  const requested = selection.kind === "slug" ? selection.slug : null;
  const current = isNew
    ? null
    : requested
      ? (styles.find((s) => s.slug === requested) ?? null)
      : (styles[0] ?? null);

  let steps: StyleStep[] = [];
  let issues: StyleIssue[] = [];
  if (current) {
    try {
      const supabase = await createClient();
      const [stepRows, issueRows] = await Promise.all([
        getStyleSteps(current.id),
        supabase.rpc("admin_style_issues", { p_style_id: current.id }),
      ]);
      if (issueRows.error)
        throw new Error(`admin_style_issues: ${issueRows.error.message}`);
      steps = stepRows;
      issues = toStyleIssues(issueRows.data);
    } catch (error) {
      console.error(error);
      loadError = true;
    }
  }

  return (
    <StylesAdminView
      styles={styles}
      current={current}
      isNew={isNew}
      notFound={Boolean(requested) && !current && !loadError}
      steps={steps}
      issues={issues}
      loadError={loadError}
    />
  );
}
