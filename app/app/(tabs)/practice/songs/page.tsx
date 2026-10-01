import type { Metadata } from "next";
import { SongsView } from "@/components/songs/songs-view";
import { getOwnProfile, requireOnboardedUser } from "@/lib/auth/session";
import { pickCurrentStyle } from "@/lib/course/path";
import { getStyleOptions } from "@/lib/course/queries";
import { firstParam } from "@/lib/search-params";
import { getPracticeSongs } from "@/lib/songs/queries";
import {
  type PracticeSong,
  parseFilters,
  passthroughMode,
} from "@/lib/songs/songs";

export const metadata: Metadata = {
  title: "Canciones",
  robots: { index: false, follow: false },
};

/**
 * Practicar · canciones (App-Canciones). Exige sesión y Bienvenida hecha (D081). Estilo =
 * `?style` si es uno publicado; si no, el estilo actual de Inicio y Curso. La lista sale de
 * `practice_songs` (qué se ve y su dificultad viven en SQL, D003); búsqueda y filtros, en el
 * cliente. `?mode` y `?song` del configurador se conservan.
 */
export default async function PracticeSongsPage(
  props: PageProps<"/app/practice/songs">,
) {
  const params = await props.searchParams;
  const user = await requireOnboardedUser("/app/practice/songs");
  const [profile, styles] = await Promise.all([
    getOwnProfile(user.id),
    getStyleOptions(),
  ]);
  const requested = firstParam(params.style);
  const style =
    styles.find((s) => s.id === requested) ??
    pickCurrentStyle(styles, profile?.default_style_id);

  let songs: PracticeSong[] = [];
  let loadError = false;
  if (style) {
    try {
      songs = await getPracticeSongs(style.id);
    } catch (error) {
      console.error(error);
      loadError = true;
    }
  }

  return (
    <SongsView
      // Cambiar de estilo monta la vista de nuevo (favoritas y filtros del servidor).
      key={style?.id ?? "none"}
      styles={styles}
      currentStyle={style}
      songs={songs}
      initialFilters={parseFilters(params)}
      mode={passthroughMode(params.mode)}
      song={firstParam(params.song) ?? null}
      loadError={loadError}
      userId={user.id}
    />
  );
}
