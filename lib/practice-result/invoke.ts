import { invoke } from "@/lib/lesson/invoke";
import type { PracticeResultPorts } from "./result";

/** `review-steps` desde el navegador, con la sesión del alumno (mismo `invoke` que la lección). */
export const edgeResultPorts: PracticeResultPorts = {
  reviewSteps: (input) => invoke("review-steps", input),
};
