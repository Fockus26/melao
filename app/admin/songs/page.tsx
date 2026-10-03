import type { Metadata } from "next";
import { SongsAdminView } from "@/components/admin/songs/songs-admin-view";
import {
  type AdminSongDetail,
  type AdminSongRow,
  type AdminSongStyle,
  parseAdminSongFilters,
  parseSongSelection,
} from "@/lib/admin/songs";
import {
  getAdminSongDetail,
  getAdminSongs,
  getSongStyles,
} from "@/lib/admin/songs-queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Canciones · Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin · Canciones: lista + editor (D158–D162). Exige rol admin (también aquí: el layout no
 * se vuelve a evaluar al navegar, D073). Lee los estilos, la lista (`admin_songs`) y, con
 * `?song=<uuid>`, la canción abierta; filtros y búsqueda van en el cliente.
 */
export default async function AdminSongsPage(props: PageProps<"/admin/songs">) {
  const params = await props.searchParams;
  await requireAdmin("/admin/songs");
  const selection = parseSongSelection(params);

  let loadError = false;
  let styles: AdminSongStyle[] = [];
  let songs: AdminSongRow[] = [];
  let detail: AdminSongDetail | null = null;
  try {
    [styles, songs] = await Promise.all([getSongStyles(), getAdminSongs()]);
    if (selection.kind === "song")
      detail = await getAdminSongDetail(
        selection.id,
        songs.find((s) => s.id === selection.id),
      );
  } catch (error) {
    console.error(error);
    loadError = true;
  }

  return (
    <SongsAdminView
      styles={styles}
      songs={songs}
      selection={selection}
      detail={detail}
      initialFilters={parseAdminSongFilters(params)}
      loadError={loadError}
    />
  );
}
