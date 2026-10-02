import { ProgressSkeleton } from "@/components/progress/progress-skeleton";

/** Mientras llegan las lecturas de Progreso: la forma de la pantalla, dentro del AppShell. */
export default function Loading() {
  return <ProgressSkeleton />;
}
