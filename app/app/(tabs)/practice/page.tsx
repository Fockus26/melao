import type { Metadata } from "next";
import { PracticeView } from "@/components/practice/practice-view";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import { getStyleOptions, hasActiveSubscription } from "@/lib/course/queries";
import { initialConfig } from "@/lib/practice/config";
import { getPracticeStyles } from "@/lib/practice/queries";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Practicar",
  robots: { index: false, follow: false },
};

/** Ruta para volver tras entrar, con el enlace que traía. */
function practiceReturnPath(
  style?: string,
  song?: string,
  mode?: string,
): string {
  const q = new URLSearchParams();
  if (style) q.set("style", style);
  if (song) q.set("song", song);
  if (mode) q.set("mode", mode);
  const search = q.toString();
  return search ? `/app/practice?${search}` : "/app/practice";
}

/** Semilla de la visita (uint32) para "Aleatoria" y "Favoritas": la misma en servidor y cliente. */
function visitSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/**
 * Practicar · configurador (App-Practicar). Exige sesión y Bienvenida hecha (D081). Estilo:
 * `?style=` o el actual de Inicio y Curso (`pickCurrentStyle`); `?song=` fija la canción (la
 * elige Canciones); `?mode=review` llega desde "Repasar" (criterio "Según repaso"). Las
 * canciones salen de `practice_songs`; sin suscripción se ve todo y Empezar lleva a Planes (D036).
 */
export default async function PracticePage(props: PageProps<"/app/practice">) {
  const params = await props.searchParams;
  const user = await requireOnboardedUser(
    practiceReturnPath(
      firstParam(params.style),
      firstParam(params.song),
      firstParam(params.mode),
    ),
  );
  const [profile, options, subscribed] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
    hasActiveSubscription(),
  ]);
  const current = pickCurrentStyle(options, profile?.default_style_id);
  const styles = await getPracticeStyles(options, current?.id ?? null);
  const mode = firstParam(params.mode);
  const initial = initialConfig(styles, current?.id ?? null, {
    style: firstParam(params.style),
    song: firstParam(params.song),
    mode,
  });

  return (
    <PracticeView
      // Un enlace nuevo (p. ej. volver de Canciones con otra canción) reinicia la configuración.
      key={`${initial?.styleId}:${initial?.songId}`}
      styles={styles}
      initial={initial}
      seed={visitSeed()}
      subscribed={subscribed}
      review={mode === "review"}
    />
  );
}
