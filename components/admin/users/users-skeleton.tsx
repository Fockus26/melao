import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader } from "../admin-page-header";

// Copy provisional (CONTENT_CHECKLIST fila 85).
const COPY = {
  overline: "Alumnos",
  title: "Usuarios",
  loading: "Cargando usuarios…",
} as const;

const ROWS = 8;

/** Usuarios mientras carga: encabezado real, búsqueda, chips y filas de relleno. */
export function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader overline={COPY.overline} title={COPY.title} />
      <section aria-busy="true" className="flex flex-col gap-5">
        <p className="sr-only">{COPY.loading}</p>
        <Skeleton className="h-13 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: relleno fijo, sin identidad.
            <Skeleton key={i} className="h-10 w-28 rounded-sm" />
          ))}
        </div>
        <div className="flex flex-col">
          {Array.from({ length: ROWS }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: relleno fijo, sin identidad.
              key={i}
              className="flex items-center gap-6 border-b border-divider py-4"
            >
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="hidden h-5 flex-1 lg:block" />
              <Skeleton className="hidden h-5 w-24 md:block" />
              <Skeleton className="h-6 w-24 rounded-pill" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
