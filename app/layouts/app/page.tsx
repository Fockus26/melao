import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SIDE_NAV } from "@/components/layout/nav-items";
import { firstParam } from "@/lib/search-params";
import { PlaceholderCard, pickItem, SampleControls } from "../sample";

export const metadata: Metadata = {
  title: "AppShell · Layouts",
  robots: { index: false, follow: false },
};

// Copy de ejemplo (CONTENT_CHECKLIST fila 39).
const CARDS = [
  {
    title: "Para hoy",
    text: "6 pasos vencen hoy. Un repaso corto con una canción de 184 BPM toma unos 9 minutos.",
  },
  {
    title: "Continuar lección",
    text: "Lección 3 · Enchufla y dile que no. Te quedaste en el video del paso 2.",
  },
  {
    title: "Práctica rápida",
    text: "Cinco minutos con los pasos que ya sabes, sobre una canción que eliges al azar.",
  },
  {
    title: "Pasos que más te cuestan",
    text: "Sombrero, Vacílala y Setenta: los calificaste como difíciles en las últimas sesiones.",
  },
];

export default async function AppShellSample(props: PageProps<"/layouts/app">) {
  const { active } = await props.searchParams;
  const item = pickItem(SIDE_NAV, firstParam(active));

  return (
    <AppShell
      currentPath={item.href}
      plan={{ name: "Básico", status: "activo" }}
    >
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="type-eyebrow text-text-secondary">Muestra · AppShell</p>
          <h1 className="type-display">{item.label}</h1>
        </header>
        <SampleControls
          base="/layouts/app"
          items={SIDE_NAV}
          activeHref={item.href}
        />
        <section
          aria-labelledby="muestra-relleno"
          className="flex flex-col gap-4"
        >
          <h2 id="muestra-relleno" className="type-h4">
            Contenido de relleno
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CARDS.map((card) => (
              <PlaceholderCard key={card.title} {...card} />
            ))}
          </div>
        </section>
        <p className="type-small text-text-secondary">
          Final del contenido: la barra inferior no debe taparlo.
        </p>
      </div>
    </AppShell>
  );
}
