import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { InvokeResult, PlanSessionRequest, ReviewRequest } from "./lesson";

/**
 * Edge Functions de la lección desde el navegador, con la sesión del alumno (patrón de
 * `lib/plans/invoke.ts`, D086). Devuelven `{ status, body }` sin lanzar: 4xx/5xx con el cuerpo
 * `{ error: { code, message } }`; sin conexión, `status: 0`.
 */
async function invoke(
  name: string,
  body: Record<string, unknown>,
): Promise<InvokeResult> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error) return { status: 200, body: data };
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      return { status: res.status, body: await res.json().catch(() => null) };
    }
    if (error instanceof FunctionsRelayError)
      return { status: 502, body: null };
    if (error instanceof FunctionsFetchError) return { status: 0, body: null };
    return { status: 500, body: null };
  } catch {
    return { status: 0, body: null };
  }
}

/** Lo que la lección le pide al backend; la muestra (`/layouts/lesson`) pasa unos falsos. */
export interface LessonPorts {
  planSession(input: PlanSessionRequest): Promise<InvokeResult>;
  reviewSteps(input: ReviewRequest): Promise<InvokeResult>;
}

export const edgeLessonPorts: LessonPorts = {
  planSession: (input) => invoke("plan-session", input),
  reviewSteps: (input) => invoke("review-steps", input),
};
