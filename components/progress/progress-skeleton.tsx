import { Skeleton } from "@/components/ui/skeleton";

// Copy provisional (CONTENT_CHECKLIST fila 72).
const LOADING = "Cargando tu progreso…";

/**
 * Carga de Progreso (handoff §2 Skeleton): título, las cards de lecciones, pasos y próximos
 * repasos, y tres filas. Decorativo; el texto para lectores de pantalla va en la región con
 * `aria-busy`.
 */
export function ProgressSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <output className="sr-only">{LOADING}</output>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 rounded-md" />
        <Skeleton className="h-44 rounded-md" />
        <Skeleton className="h-52 rounded-md md:col-span-2" />
      </div>
      <ul className="flex flex-col border-t border-divider">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex min-h-16 items-center gap-4 border-b border-divider py-2"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
