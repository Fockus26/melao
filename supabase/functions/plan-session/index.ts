// Entrada de Deno: arma el cliente con la clave secreta y sirve el handler. La lógica vive
// en handler.ts (se prueba desde bun).
import { supabaseAuth } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/client.ts";
import { deno } from "../_shared/runtime.ts";
import { createHandler, cryptoSeed } from "./handler.ts";
import { supabasePort } from "./supabase.ts";

const client = createServiceClient((name) => deno.env.get(name));

deno.serve(
  createHandler({
    auth: supabaseAuth(client),
    data: supabasePort(client),
    now: () => new Date(),
    randomSeed: cryptoSeed,
  }),
);
