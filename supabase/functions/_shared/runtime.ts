/**
 * Acceso tipado al runtime de Deno para los `index.ts` (D050).
 *
 * `tsconfig.json` incluye todos los `.ts` y no tiene los tipos de Deno: en vez de excluir los
 * `index.ts`, declaramos aquí solo lo que usan (`serve` y `env.get`). En bun `deno` es
 * `undefined`, pero bun nunca importa un `index.ts`.
 */

export interface DenoRuntime {
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
}

export const deno = (globalThis as unknown as { Deno: DenoRuntime }).Deno;
