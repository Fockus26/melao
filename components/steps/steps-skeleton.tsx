import { Skeleton } from "@/components/ui/skeleton";

// Copy provisional (CONTENT_CHECKLIST fila 70).
const LOADING = "Cargando pasos…";

/**
 * Carga del catálogo de pasos (handoff §2 Skeleton): título y contador, búsqueda, dos filas de
 * chips y un grupo de cinco filas. Decorativo; el texto para lectores de pantalla va en la
 * región con `aria-busy`.
 */
export function StepsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <output className="sr-only">{LOADING}</output>
      <div className="flex flex-col gap-2 border-b border-divider pb-4">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-13 w-full" />
        {[
          ["w-24", "w-20", "w-24", "w-20"],
          ["w-28", "w-32", "w-24"],
        ].map((row, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista fija y decorativa.
          <div key={r} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              {row.map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lista fija y decorativa.
                <Skeleton key={i} className={`h-10 ${w}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        <Skeleton className="mb-2 h-4 w-24" />
        <ul className="flex flex-col border-t border-divider">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="flex min-h-18 items-center gap-2 border-b border-divider py-3"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="size-12 rounded-pill" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
