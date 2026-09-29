import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { InvokeResult } from "./activation";

/**
 * Llama a `activate-subscription` con la sesión del alumno (navegador) y devuelve
 * `{ status, body }` sin lanzar: 4xx/5xx llegan como `FunctionsHttpError` con la `Response`
 * en `context`; sin conexión, `status: 0`.
 */
export async function invokeActivateSubscription(
  planSlug: string,
): Promise<InvokeResult> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.functions.invoke(
      "activate-subscription",
      { body: { planSlug } },
    );
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
