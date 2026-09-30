import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";
import { ADMIN_NAV } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { firstParam } from "@/lib/search-params";
import { PlaceholderCard, pickItem, SampleControls } from "../sample";

export const metadata: Metadata = {
  title: "AdminShell · Layouts",
  robots: { index: false, follow: false },
};

// Copy de ejemplo (CONTENT_CHECKLIST fila 39).
const STATS = [
  {
    title: "Pasos publicados",
    text: "24 de 31 · 7 sin video del rol seguidor",
  },
  { title: "Canciones", text: "12 publicadas · 3 sin licencia registrada" },
  { title: "Lecciones", text: "9 en el camino de salsa casino" },
  { title: "Alumnos", text: "Sin datos todavía" },
];

export default async function AdminShellSample(
  props: PageProps<"/layouts/admin">,
) {
  const { active } = await props.searchParams;
  const item = pickItem(ADMIN_NAV, firstParam(active));

  return (
    <AdminShell currentPath={item.href}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="type-overline text-text-secondary">
              Muestra · AdminShell
            </p>
            <h1 className="type-h1">{item.label}</h1>
          </div>
          <Button>Nuevo</Button>
        </header>
        <section
          aria-labelledby="muestra-relleno"
          className="flex flex-col gap-4"
        >
          <h2 id="muestra-relleno" className="type-h4">
            Contenido de relleno
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATS.map((stat) => (
              <PlaceholderCard key={stat.title} {...stat} />
            ))}
          </div>
        </section>
        <SampleControls
          base="/layouts/admin"
          items={ADMIN_NAV}
          activeHref={item.href}
        />
      </div>
    </AdminShell>
  );
}
