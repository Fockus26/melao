import type { Metadata } from "next";
import { CalibrationFlow } from "@/components/calibration/calibration-flow";
import { PROFILE_PATH } from "@/lib/auth/redirect";
import { requireOnboardedUser } from "@/lib/auth/session";
import { CALIBRATION_PATH } from "@/lib/calibration/calibration";
import { getSavedLatencies } from "@/lib/calibration/queries";

export const metadata: Metadata = {
  title: "Calibrar audífonos",
  robots: { index: false, follow: false },
};

/**
 * Calibrar audífonos (App-Calibracion): fuera del grupo `(tabs)`, a pantalla completa y sin
 * navegación, como la Lección. Exige sesión y Bienvenida hecha. Lee los ajustes web guardados
 * (para "Sin audífonos" y el valor de partida del ajuste a mano); medir y guardar es cliente
 * (`save_audio_latency()`, D142). Cerrar, Listo y Guardar vuelven a Perfil.
 */
export default async function CalibrationPage() {
  const user = await requireOnboardedUser(CALIBRATION_PATH);
  const saved = await getSavedLatencies(user.id);
  return <CalibrationFlow saved={saved} closeHref={PROFILE_PATH} />;
}
