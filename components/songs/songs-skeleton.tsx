import { Skeleton } from "@/components/ui/skeleton";

// Copy provisional (CONTENT_CHECKLIST fila 65).
const LOADING = "Cargando canciones…";

/**
 * Carga de Canciones (handoff §2 Skeleton): título, búsqueda, chips y cinco filas. Decorativo;
 * el texto para lectores de pantalla va en la región con `aria-busy`.
 */
export function SongsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <output className="sr-only">{LOADING}</output>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-11 w-48" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-13 w-full" />
        <div className="flex flex-wrap gap-2">
          {["w-24", "w-20", "w-20", "w-24", "w-28", "w-28"].map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lista fija y decorativa.
            <Skeleton key={i} className={`h-10 ${w}`} />
          ))}
        </div>
      </div>
      <ul className="flex flex-col border-t border-divider">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="flex min-h-18 items-center gap-2 border-b border-divider py-3"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="size-12 rounded-pill" />
          </li>
        ))}
      </ul>
    </div>
  );
}
