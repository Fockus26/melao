import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";

/**
 * Índice de las muestras de layout (handoff §7 paso 4, D060). Interna como /primitivos: sin
 * enlace desde la app y fuera de buscadores. Copy de ejemplo (CONTENT_CHECKLIST fila 39).
 */
export const metadata: Metadata = {
  title: "Layouts · Melao",
  robots: { index: false, follow: false },
};

const SAMPLES = [
  {
    href: "/layouts/app",
    title: "AppShell",
    text: "Barra inferior de 5 destinos por debajo de 1024 px y lateral de 248 desde 1024, con la columna de 640 u 800.",
  },
  {
    href: "/layouts/pantalla-completa",
    title: "FullscreenShell",
    text: "Lección a pantalla completa: sin navegación, barra superior con salir y progreso, columna de 640.",
  },
  {
    href: "/layouts/escenario",
    title: "FullscreenShell · escenario",
    text: "Sesión de práctica en negro, igual en tema claro y oscuro.",
  },
  {
    href: "/layouts/publico",
    title: "PublicShell",
    text: "Header de 72 y footer de la landing; variante con el correo de la sesión para Planes y Checkout.",
  },
  {
    href: "/layouts/admin",
    title: "AdminShell",
    text: "Navegación de 232 con etiquetas desde 1280 px y riel de 72 solo con íconos por debajo.",
  },
] as const;

export default function LayoutsPage() {
  return (
    <main className="mx-auto flex w-full max-w-200 flex-col gap-8 px-5 py-12 md:px-8 lg:px-12">
      <header className="flex flex-col gap-3">
        <p className="type-eyebrow text-text-secondary">Muestra interna</p>
        <h1 className="type-h1">Layouts</h1>
        <p className="type-body text-text-secondary">
          Las cuatro shells de la app con contenido de relleno. Cambia el ancho
          de la ventana para ver cada punto de quiebre.
        </p>
        <ThemeSwitch />
      </header>
      <ul className="flex flex-col gap-4">
        {SAMPLES.map((sample) => (
          <li key={sample.href}>
            <Link
              href={sample.href}
              className="flex flex-col gap-1 rounded-md border border-divider bg-surface p-5 hover:border-border-input"
            >
              <span className="type-h4">{sample.title}</span>
              <span className="type-small text-text-secondary">
                {sample.text}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
