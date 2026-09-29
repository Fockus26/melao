/**
 * Variables públicas de Supabase (`.env.example`). Se leen con el nombre literal para que Next
 * las incruste en el bundle del navegador. La clave secreta nunca pasa por aquí.
 */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey)
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example).",
    );
  if (!url.startsWith("https://") && !url.startsWith("http://"))
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL debe ser la URL completa (https://<ref>.supabase.co), no solo el ref.",
    );
  return { url, publishableKey };
}

/**
 * Origen público del sitio para las URLs de vuelta de Google y de los correos. Sin
 * `NEXT_PUBLIC_SITE_URL`, el origen actual (útil en local con otro puerto).
 */
export function siteOrigin(fallback: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL || fallback;
}
