"use client";

import { useEffect, useState } from "react";
import {
  FIELD_ERROR_DELAY_MS,
  scheduleReveal,
  visibleError,
} from "@/lib/auth/deferred-error";

/**
 * Error de un campo que se muestra con retraso (D100). `candidate` es el error que tendría el
 * valor actual (null si está vacío o es válido). Sale tras `delay` ms sin cambios, al llamar a
 * `reveal()` (blur, envío) y, una vez visible, sigue mientras el valor siga mal; en cuanto el
 * valor es válido o se vacía, se quita al instante y la próxima vez vuelve a esperar.
 */
export function useDeferredError(
  value: string,
  candidate: string | null,
  delay: number = FIELD_ERROR_DELAY_MS,
) {
  const [revealed, setRevealed] = useState(false);
  // Ajuste durante el render (patrón de React): sin candidato, el error deja de estar revelado.
  if (candidate === null && revealed) setRevealed(false);
  const pending = candidate !== null && !revealed;

  // `value` reinicia la espera en cada tecla aunque `pending` no cambie.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value reprograma el temporizador.
  useEffect(
    () => scheduleReveal(pending, () => setRevealed(true), delay),
    [pending, value, delay],
  );

  return {
    error: visibleError(candidate, revealed),
    reveal: () => setRevealed(true),
  };
}
