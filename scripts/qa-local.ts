/**
 * Servidor de QA contra una base LOCAL — nunca contra la de verdad.
 *
 * Uso (con node; Node ≥ 23.6):
 *   node scripts/qa-local.ts --port 4301            (= bun run qa:local -- --port 4301)
 *   node scripts/qa-local.ts --port 4301 --no-reset (conserva los datos de la corrida anterior)
 *
 * Qué hace:
 *   1. `supabase start` (Docker Desktop abierto): la pila local del proyecto.
 *   2. `supabase db reset`: base vacía con las migraciones y el seed del árbol actual (en un
 *      slot del pool, las de `main`). La base local es desechable: no guardes nada en ella.
 *   3. Crea las cuentas de prueba de `.env.test.local` en esa base (Auth de la pila local):
 *        EMAIL_TEST / PASSWORD_TEST              → rol "user"
 *        ADMIN_EMAIL_TEST / ADMIN_PASSWORD_TEST  → rol "admin"
 *        <ROL>_EMAIL_TEST / <ROL>_PASSWORD_TEST  → rol "<rol>"
 *      El rol va a `app_metadata.role`. Si el proyecto guarda el rol en otro sitio (una tabla
 *      `profiles`), adapta `asignarRol` abajo: es la única parte propia de cada proyecto.
 *   4. Levanta `bun run dev -- --port <puerto>` con las variables de Supabase apuntando a la
 *      pila local. Van por process.env, que en Next gana a `.env.local`: no se escribe
 *      ningún archivo y el slot queda limpio.
 *
 * Seguro: antes de arrancar, si alguna variable de `.env*` apunta a un Supabase remoto
 * (`*.supabase.co`) y este script no la sobrescribe, se aborta. Mejor no arrancar que
 * probar contra la base real por una variable con un nombre distinto.
 *
 * Los correos que mande la app (registro, recuperación) no salen: los recoge Mailpit
 * (la URL se imprime al arrancar).
 *
 * Sin `supabase/config.toml` (el proyecto no usa Supabase): arranca el servidor normal.
 *
 * Las contraseñas de prueba no se imprimen nunca. Las claves locales de la pila sí son
 * públicas (las mismas en toda instalación) y no son secretos.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

// Variable de la app ← campo de `supabase status -o json`. Añade aquí la que use tu proyecto
// si tiene otro nombre (el chequeo de seguridad te avisará si falta alguna).
const MAPEO: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "API_URL",
  SUPABASE_URL: "API_URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "ANON_KEY",
  SUPABASE_ANON_KEY: "ANON_KEY",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "PUBLISHABLE_KEY",
  SUPABASE_PUBLISHABLE_KEY: "PUBLISHABLE_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "SERVICE_ROLE_KEY",
  SUPABASE_SECRET_KEY: "SECRET_KEY",
  DATABASE_URL: "DB_URL",
  DIRECT_URL: "DB_URL",
};

const args = process.argv.slice(2);
const puerto = args[args.indexOf("--port") + 1];
if (!args.includes("--port") || !/^\d+$/.test(puerto ?? "")) {
  console.error("Uso: node scripts/qa-local.ts --port <puerto> [--no-reset]");
  process.exit(2);
}
const reset = !args.includes("--no-reset");

function leerEnv(archivo: string): Record<string, string> {
  if (!existsSync(archivo)) return {};
  const salida: Record<string, string> = {};
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    );
    if (m) salida[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return salida;
}

function supabase(...a: string[]): string {
  const r = spawnSync("supabase", a, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    const detalle = (r.stderr || r.stdout || "").trim();
    const docker = /docker|daemon|pipe/i.test(detalle)
      ? "\n→ ¿Está abierto Docker Desktop?"
      : "";
    throw new Error(`supabase ${a.join(" ")} falló:\n${detalle}${docker}`);
  }
  return r.stdout;
}

// No vuelve: el script vive mientras viva el servidor.
function arrancarDev(env: NodeJS.ProcessEnv): Promise<never> {
  const hijo = spawn("bun", ["run", "dev", "--", "--port", puerto], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  for (const s of ["SIGINT", "SIGTERM"] as const)
    process.on(s, () => hijo.kill(s));
  hijo.on("exit", (code) => process.exit(code ?? 0));
  return new Promise<never>(() => {});
}

// 1. ¿Hay algo que apunte a un Supabase remoto?
const envArchivos = readdirSync(".").filter(
  (f) => /^\.env/.test(f) && f !== ".env.example",
);
const remotas = envArchivos.flatMap((f) =>
  Object.entries(leerEnv(f))
    .filter(([, v]) => /\.supabase\.(co|com)/i.test(v))
    .map(([k]) => ({ archivo: f, clave: k })),
);

if (!existsSync("supabase/config.toml")) {
  if (remotas.length) {
    console.error(
      "Hay variables que apuntan a un Supabase remoto pero el proyecto no tiene supabase/ local:\n" +
        remotas.map((r) => `  ${r.archivo}: ${r.clave}`).join("\n") +
        "\nLa QA no corre contra la base real. Hace falta `supabase init` y las migraciones en el repo (backend-build).",
    );
    process.exit(1);
  }
  console.log(
    "Sin supabase/config.toml: no hay base externa que sustituir. Servidor normal.",
  );
  await arrancarDev(process.env);
}

const sinCubrir = remotas.filter((r) => !(r.clave in MAPEO));
if (sinCubrir.length) {
  console.error(
    "Estas variables apuntan a Supabase remoto y el script no las sobrescribe (añádelas a MAPEO):\n" +
      sinCubrir.map((r) => `  ${r.archivo}: ${r.clave}`).join("\n"),
  );
  process.exit(1);
}

// 2. Pila local y base limpia.
console.log("… supabase start");
supabase("start");
if (reset) {
  console.log("… supabase db reset (migraciones + seed)");
  supabase("db", "reset");
}
const estado = JSON.parse(supabase("status", "-o", "json")) as Record<
  string,
  string
>;
const api = estado.API_URL;
const claveServicio = estado.SERVICE_ROLE_KEY;
if (!api || !claveServicio)
  throw new Error("supabase status no devolvió API_URL / SERVICE_ROLE_KEY");

// 3. Cuentas de prueba.
// Melao: el rol vive en `profiles.app_role` (D017); el trigger on_auth_user_created crea el
// perfil como 'student'. El alumno de prueba ("user") recibe además una suscripción activa
// 'placeholder' al plan básico, o la QA solo vería el muro de pago (D036).
async function rest(ruta: string, init: RequestInit): Promise<Response> {
  const r = await fetch(`${api}/rest/v1/${ruta}`, {
    ...init,
    headers: { ...cabeceras, ...init.headers },
  });
  if (!r.ok) throw new Error(`REST ${ruta}: ${r.status} ${await r.text()}`);
  return r;
}

async function asignarRol(id: string, rol: string): Promise<void> {
  if (rol === "admin") {
    await rest(`profiles?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ app_role: "admin" }),
    });
    return;
  }
  if (rol !== "user") return;
  const [plan] = (await (
    await rest("plans?slug=eq.basico&select=id", { method: "GET" })
  ).json()) as { id: string }[];
  if (!plan) throw new Error('El seed no trae el plan "basico"');
  const fin = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await rest("subscriptions", {
    method: "POST",
    body: JSON.stringify({
      user_id: id,
      plan_id: plan.id,
      status: "active",
      provider: "placeholder",
      current_period_end: fin,
    }),
  });
}

const cabeceras = {
  apikey: claveServicio,
  Authorization: `Bearer ${claveServicio}`,
  "Content-Type": "application/json",
};
const pruebas = leerEnv(".env.test.local");
const cuentas = Object.keys(pruebas)
  .map((k) => k.match(/^(?:([A-Z0-9_]+)_)?EMAIL_TEST$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => {
    const prefijo = m[1] ? `${m[1]}_` : "";
    return {
      rol: m[1] ? m[1].toLowerCase() : "user",
      email: pruebas[`${prefijo}EMAIL_TEST`],
      password: pruebas[`${prefijo}PASSWORD_TEST`],
    };
  });

if (!cuentas.length)
  console.warn(
    "! .env.test.local sin *_EMAIL_TEST: la QA solo podrá probar lo público.",
  );
for (const c of cuentas) {
  if (!c.email || !c.password) {
    console.warn(
      `! rol ${c.rol}: falta el correo o la contraseña en .env.test.local; se salta`,
    );
    continue;
  }
  const r = await fetch(`${api}/auth/v1/admin/users`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      email: c.email,
      password: c.password,
      email_confirm: true,
      app_metadata: { role: c.rol },
    }),
  });
  if (r.ok) {
    const { id } = (await r.json()) as { id: string };
    await asignarRol(id, c.rol);
    console.log(`  + cuenta de prueba: rol ${c.rol}`);
  } else if (r.status === 422 && !reset) {
    console.log(`  = cuenta de prueba: rol ${c.rol} (ya existía)`);
  } else {
    throw new Error(
      `No se pudo crear la cuenta del rol ${c.rol}: ${r.status} ${await r.text()}`,
    );
  }
}

// 4. Servidor apuntando a la pila local.
const env: NodeJS.ProcessEnv = { ...process.env, QA_LOCAL: "1" };
for (const [variable, campo] of Object.entries(MAPEO)) {
  if (estado[campo]) env[variable] = estado[campo];
}
console.log(
  `Base local: ${api}${estado.MAILPIT_URL ? ` · correos en ${estado.MAILPIT_URL}` : ""}`,
);
console.log(`… bun run dev en el puerto ${puerto}`);
await arrancarDev(env);
