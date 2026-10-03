import { invoke } from "@/lib/lesson/invoke";
import type { StatusRequest, StepStatusPort } from "./detail";

/** `review-steps` desde el navegador, con la sesión del alumno (mismo `invoke` que la lección). */
export const edgeStepStatusPort: StepStatusPort = {
  reviewSteps: (input: StatusRequest) =>
    invoke("review-steps", input as unknown as Record<string, unknown>),
};
