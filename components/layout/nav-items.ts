import {
  AudioWaveform,
  ChartColumn,
  Eye,
  House,
  List,
  type LucideIcon,
  Metronome,
  Music,
  Route,
  Settings,
  User,
  Users,
} from "lucide-react";

/**
 * Destinos de navegación de las shells. Las rutas siguen el handoff (`/app`, `/app/curso`,
 * `/app/practicar`…); las que aún no existen dan 404 hasta que llegue su pantalla (07b).
 * Copy provisional: etiquetas de navegación (CONTENT_CHECKLIST fila 38).
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Los 5 destinos de la barra inferior, en orden (D028). */
export const APP_NAV: readonly NavItem[] = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/curso", label: "Curso", icon: Route },
  { href: "/app/practicar", label: "Practicar", icon: Metronome },
  { href: "/app/pasos", label: "Pasos", icon: List },
  { href: "/app/perfil", label: "Perfil", icon: User },
];

/** Progreso no ocupa destino en la barra: es el ítem 6 del lateral (D028). */
export const PROGRESS_NAV: NavItem = {
  href: "/app/progreso",
  label: "Progreso",
  icon: ChartColumn,
};

/** Lateral ≥ 1024: los 5 de la barra + Progreso. */
export const SIDE_NAV: readonly NavItem[] = [...APP_NAV, PROGRESS_NAV];

/** Navegación del admin (handoff §2 AdminNav), en orden. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Resumen", icon: ChartColumn },
  { href: "/admin/estilos", label: "Estilos", icon: Settings },
  { href: "/admin/pasos", label: "Pasos", icon: List },
  { href: "/admin/canciones", label: "Canciones", icon: Music },
  {
    href: "/admin/analizador",
    label: "Analizador de ritmo",
    icon: AudioWaveform,
  },
  { href: "/admin/camino", label: "Camino", icon: Route },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

/** Al pie del AdminNav: salir a la app del alumno. */
export const ADMIN_STUDENT_VIEW: NavItem = {
  href: "/app",
  label: "Ver como alumno",
  icon: Eye,
};
