import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { Button } from "@/components/ui/button";
import { firstParam } from "../sample";

export const metadata: Metadata = {
  title: "PublicShell · Layouts · Melao",
  robots: { index: false, follow: false },
};

/** Muestra de la shell pública. Copy de ejemplo (CONTENT_CHECKLIST fila 39). */
export default async function PublicSample(
  props: PageProps<"/layouts/publico">,
) {
  const { cabecera } = await props.searchParams;
  const account = firstParam(cabecera) === "cuenta";

  return (
    <PublicShell
      header={account ? "account" : "landing"}
      email={account ? "maria.gonzalez@ejemplo.com" : undefined}
    >
      <div className="px-6 py-20 lg:px-16 lg:py-32">
        <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
          <p className="type-eyebrow text-text-secondary">
            Muestra · PublicShell
          </p>
          <h1 className="type-display lg:type-display-xl">
            Baila en casa con alguien que te cuenta los tiempos
          </h1>
          <p className="max-w-prose type-body text-text-secondary">
            El contenido de la landing llega en su propia unidad; aquí solo se
            ven el header de 72, el ancho máximo de 1200 y el footer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={account ? "outline" : "primary"}>
              <Link href="/layouts/publico">Header de la landing</Link>
            </Button>
            <Button asChild variant={account ? "primary" : "outline"}>
              <Link href="/layouts/publico?cabecera=cuenta">
                Header con la sesión
              </Link>
            </Button>
          </div>
          <ThemeSwitch />
          <Link
            href="/layouts"
            className="inline-flex min-h-12 items-center self-start type-small text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text"
          >
            Volver a las muestras
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
