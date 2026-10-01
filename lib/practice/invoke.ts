import { invoke } from "@/lib/lesson/invoke";
import type { InvokeResult } from "@/lib/lesson/lesson";
import type { FreePlanRequest } from "./config";

/** Lo que el configurador le pide al backend; la muestra (`/layouts/practice`) pasa uno falso. */
export interface PracticePorts {
  planSession(input: FreePlanRequest): Promise<InvokeResult>;
}

/** `plan-session` desde el navegador con la sesión del alumno (`{ status, body }`, sin lanzar). */
export const edgePracticePorts: PracticePorts = {
  planSession: (input) => invoke("plan-session", input),
};
