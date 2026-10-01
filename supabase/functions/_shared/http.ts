/**
 * HTTP común de las Edge Functions (`docs/spec/api.md` § Edge Functions).
 *
 * - CORS: responde el preflight `OPTIONS`; la sesión viaja en `Authorization` (sin cookies),
 *   así que el origen puede ser `*`.
 * - Solo `POST` con cuerpo JSON.
 * - Errores con una sola forma: `{ error: { code, message } }` y el estado HTTP del código.
 *
 * Sin APIs de Deno: se importa desde bun (tests) y desde Deno (despliegue).
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

/** Estados HTTP que usan las funciones (api.md § Errores). */
export type HttpStatus = 400 | 401 | 403 | 404 | 405 | 409 | 422 | 500;

/** Error de regla o de entrada: se responde tal cual al cliente. */
export class HttpError extends Error {
  constructor(
    readonly status: HttpStatus,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (code: string, message: string) =>
  new HttpError(400, code, message);

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: HttpError): Response {
  return json(
    { error: { code: error.code, message: error.message } },
    error.status,
  );
}

/** Contexto que recibe cada endpoint: la petición y su cuerpo ya parseado. */
export interface EndpointContext {
  req: Request;
  body: unknown;
}

/**
 * Envuelve la lógica de una función: CORS, método, JSON de entrada y salida, y errores.
 * Lo que no sea `HttpError` se registra y sale como 500 `internal` sin detalles.
 */
export function jsonEndpoint(
  run: (ctx: EndpointContext) => Promise<unknown>,
  log: (message: string, error: unknown) => void = console.error,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    try {
      if (req.method !== "POST") {
        throw new HttpError(405, "method_not_allowed", "Usa POST.");
      }
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw badRequest("invalid_json", "El cuerpo no es JSON válido.");
      }
      return json(await run({ req, body }));
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      log("edge function: error no controlado", error);
      return errorResponse(
        new HttpError(500, "internal", "Error interno. Intenta de nuevo."),
      );
    }
  };
}
