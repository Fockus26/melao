"use client";

import {
  StepDetailView,
  type StepDetailViewProps,
} from "@/components/steps/detail/step-detail-view";
import type { StepStatusPort } from "@/lib/steps/detail";

/** Respuestas falsas de `review-steps` para ver los avisos sin escribir nada. */
const FAILING: Record<"role" | "error", StepStatusPort> = {
  role: {
    reviewSteps: async () => ({
      status: 400,
      body: { error: { code: "role_required", message: "Falta el rol." } },
    }),
  },
  error: {
    reviewSteps: async () => ({ status: 500, body: null }),
  },
};

/**
 * El detalle con un puerto de estado falso (las funciones no cruzan de Server a Client
 * Component). Sin `userId`, el corazón no escribe nada.
 */
export function StepDetailSample({
  failWith,
  ...props
}: Omit<StepDetailViewProps, "statusPort"> & {
  failWith?: "role" | "error";
}) {
  return (
    <StepDetailView
      {...props}
      variant={failWith ? "live" : "sample"}
      statusPort={failWith ? FAILING[failWith] : undefined}
    />
  );
}
