import type { Metadata } from "next";
import { StepsView } from "@/components/steps/steps-view";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import { getStyleOptions } from "@/lib/course/queries";
import { firstParam } from "@/lib/search-params";
import { type CatalogStep, parseStepFilters } from "@/lib/steps/catalog";
import { getStepCatalog } from "@/lib/steps/queries";

export const metadata: Metadata = {
  title: "Pasos",
  robots: { index: false, follow: false },
};

/**
 * Pasos · catálogo (App-Pasos). Exige sesión y Bienvenida hecha (D081). Estilo = `?style` si
 * es uno publicado; si no, el estilo actual de Inicio y Curso. La lista sale de `step_catalog`
 * (qué pasos, su estado, el favorito y el próximo repaso viven en SQL, D003, D127); búsqueda y
 * filtros, en el cliente (D128). Sin suscripción se ve igual (D036).
 */
export default async function StepsPage(props: PageProps<"/app/steps">) {
  const params = await props.searchParams;
  const user = await requireOnboardedUser("/app/steps");
  const [profile, styles] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
  ]);
  const requested = firstParam(params.style);
  const style =
    styles.find((s) => s.id === requested) ??
    pickCurrentStyle(styles, profile?.default_style_id);

  let steps: CatalogStep[] = [];
  let loadError = false;
  if (style) {
    try {
      steps = await getStepCatalog(style.id);
    } catch (error) {
      console.error(error);
      loadError = true;
    }
  }

  return (
    <StepsView
      // Cambiar de estilo monta la vista de nuevo (favoritos y filtros del servidor).
      key={style?.id ?? "none"}
      styles={styles}
      currentStyle={style}
      steps={steps}
      initialFilters={parseStepFilters(params)}
      loadError={loadError}
      userId={user.id}
    />
  );
}
