import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepDetailView } from "@/components/steps/detail/step-detail-view";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import { getStyleOptions, hasActiveSubscription } from "@/lib/course/queries";
import { firstParam } from "@/lib/search-params";
import { isStepSlug } from "@/lib/steps/detail";
import { getStepDetail } from "@/lib/steps/detail-queries";

/**
 * Estilo preferido para el slug: `?style` si es uno publicado (enlaces desde un paso de otro
 * estilo, D138); si no, el estilo actual de Inicio, Curso y Pasos.
 */
async function load(props: PageProps<"/app/steps/[slug]">, path: string) {
  const [{ slug }, params] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const user = await requireOnboardedUser(path);
  if (!isStepSlug(slug)) notFound();
  const [profile, styles] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
  ]);
  const requested = firstParam(params.style);
  const style =
    styles.find((s) => s.id === requested) ??
    pickCurrentStyle(styles, profile?.default_style_id);
  // Sin estilos publicados no hay pasos publicados.
  if (!style) notFound();
  const step = await getStepDetail(style.id, slug);
  if (!step) notFound();
  return {
    user,
    step,
    currentStyle: pickCurrentStyle(styles, profile?.default_style_id),
  };
}

export async function generateMetadata(
  props: PageProps<"/app/steps/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const { step } = await load(props, `/app/steps/${slug}`);
  return { title: step.name, robots: { index: false, follow: false } };
}

/**
 * Pasos · detalle (App-Paso, `/app/steps/[slug]`). Exige sesión y Bienvenida hecha (D081). Todo
 * sale de `step_detail` (D003, D138–D140); el cambio de estado va a `review-steps` (exige plan:
 * sin suscripción se ve pero no se cambia, D036). Paso inexistente o sin publicar: 404.
 */
export default async function StepDetailPage(
  props: PageProps<"/app/steps/[slug]">,
) {
  const { slug } = await props.params;
  const { user, step, currentStyle } = await load(props, `/app/steps/${slug}`);
  const canChangeStatus = await hasActiveSubscription().catch((error) => {
    console.error(error);
    // Si la lectura falla, se deja intentar: `review-steps` vuelve a exigir el plan.
    return true;
  });

  return (
    <StepDetailView
      // Otro paso (un relacionado) monta la vista de nuevo: estado y favorito del servidor.
      key={step.id}
      step={step}
      currentStyleId={currentStyle?.id ?? null}
      canChangeStatus={canChangeStatus}
      userId={user.id}
    />
  );
}
