import type { Metadata } from "next";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";
import { parseWelcomeStep } from "@/lib/onboarding";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Bienvenida · Layouts · Melao",
  robots: { index: false, follow: false },
};

/**
 * Muestra de la Bienvenida sin sesión ni base (la real exige cuenta): los dos estilos del seed
 * y Bachata "Próximamente" para ver el estado deshabilitado. `?step=2|3` abre en ese paso.
 * Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */
export default async function WelcomeSample(
  props: PageProps<"/layouts/welcome">,
) {
  const params = await props.searchParams;
  const step = parseWelcomeStep(firstParam(params.step));
  return (
    <WelcomeFlow
      key={step}
      mode="sample"
      initialStep={step}
      styles={[
        { id: "salsa-casino", name: "Salsa casino" },
        { id: "merengue", name: "Merengue" },
        { id: "bachata", name: "Bachata", available: false },
      ]}
      initial={{ styleIds: step > 1 ? ["salsa-casino"] : [] }}
    />
  );
}
