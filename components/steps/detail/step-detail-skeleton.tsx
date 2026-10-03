import { Skeleton } from "@/components/ui/skeleton";

// Copy provisional (CONTENT_CHECKLIST fila 78).
const LOADING = "Cargando el paso…";

/**
 * Carga del detalle del paso (handoff §2 Skeleton): barra, eyebrow, nombre y metadatos; el video
 * a la izquierda y Tu estado y Por tiempos a la derecha. Decorativo; el texto para lectores de
 * pantalla va en la región con `aria-busy`.
 */
export function StepDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <output className="sr-only">{LOADING}</output>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="size-12 rounded-pill" />
      </div>
      <div className="flex flex-col gap-3 border-b border-divider pb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full rounded-pill" />
          <Skeleton className="h-70 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="mt-6 h-6 w-32" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
