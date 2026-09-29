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
 * Destinos de navegación de las shells. Las rutas siguen el handoff (`/app`, `/app/course`,
 * `/app/practice`…); las que aún no existen dan 404 hasta que llegue su pantalla (07b).
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
  { href: "/app/course", label: "Curso", icon: Route },
  { href: "/app/practice", label: "Practicar", icon: Metronome },
  { href: "/app/steps", label: "Pasos", icon: List },
  { href: "/app/profile", label: "Perfil", icon: User },
];

/** Progreso no ocupa destino en la barra: es el ítem 6 del lateral (D028). */
export const PROGRESS_NAV: NavItem = {
  href: "/app/progress",
  label: "Progreso",
  icon: ChartColumn,
};

/** Lateral ≥ 1024: los 5 de la barra + Progreso. */
export const SIDE_NAV: readonly NavItem[] = [...APP_NAV, PROGRESS_NAV];

/** Navegación del admin (handoff §2 AdminNav), en orden. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Resumen", icon: ChartColumn },
  { href: "/admin/styles", label: "Estilos", icon: Settings },
  { href: "/admin/steps", label: "Pasos", icon: List },
  { href: "/admin/songs", label: "Canciones", icon: Music },
  {
    href: "/admin/rhythm-analyzer",
    label: "Analizador de ritmo",
    icon: AudioWaveform,
  },
  { href: "/admin/course", label: "Camino", icon: Route },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

/** Al pie del AdminNav: salir a la app del alumno. */
export const ADMIN_STUDENT_VIEW: NavItem = {
  href: "/app",
  label: "Ver como alumno",
  icon: Eye,
};
