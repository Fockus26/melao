import { Skeleton } from "@/components/ui/skeleton";
import { summaryCopy as COPY } from "./copy";

/**
 * Carga del Resumen (handoff §2 Skeleton): los 4 contadores y las dos listas, con la misma
 * grilla que el cuerpo real. Decorativo; el texto para lectores de pantalla va en la región
 * con `aria-busy`.
 */
export function SummarySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <output className="sr-only">{COPY.loading}</output>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-md" />
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-md border border-divider bg-surface p-5"
          >
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-3/5" />
            <ul className="flex flex-col border-t border-divider">
              {[0, 1, 2].map((j) => (
                <li
                  key={j}
                  className="flex flex-col gap-2 border-b border-divider py-3"
                >
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-3/5" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
