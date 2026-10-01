import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Copy provisional (CONTENT_CHECKLIST fila 63).
const COPY = {
  title: "Practicar",
  loading: "Cargando estilos y canciones…",
} as const;

/** Chips de una fila (anchos de la escala de 4 px, como los textos reales). */
const CHIP_WIDTHS = ["w-20", "w-28", "w-24", "w-24", "w-24"] as const;

/**
 * Practicar mientras carga (`loading.tsx` y la muestra): el título real y la forma de los grupos
 * y del Resumen en Skeleton. La sección lleva `aria-busy` y un texto para lectores de pantalla.
 */
export function PracticeSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="type-display">{COPY.title}</h1>
        <span aria-hidden="true" className="h-0.5 w-12 bg-gold-500" />
      </header>
      <output className="sr-only">{COPY.loading}</output>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-pill" />
          </div>
          {[0, 1].map((group) => (
            <div key={group} className="flex flex-col gap-4">
              <Skeleton className="h-4 w-20" />
              <div className="flex flex-wrap gap-2">
                {CHIP_WIDTHS.map((w, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: forma fija, sin datos.
                  <Skeleton key={i} className={`h-10 ${w}`} />
                ))}
              </div>
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Card className="gap-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-14 w-full rounded-md" />
        </Card>
      </div>
    </div>
  );
}
