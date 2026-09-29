import Link from "next/link";
import type * as React from "react";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";

/** Enlace dentro del texto legal: subrayado siempre visible (no depende solo del color). */
export const LEGAL_INLINE_LINK =
  "rounded-sm text-text underline decoration-gold-500 underline-offset-4 hover:decoration-text";

type LegalDocumentProps = {
  title: string;
  /** Fecha de la versión: ISO para `<time>` y texto legible. */
  updated: { iso: string; label: string };
  /** Enlace al otro documento legal, al pie. */
  related: { href: string; label: string };
  children: React.ReactNode;
};

/**
 * Documento legal en columna de lectura (680 máx.): título, fecha de actualización, aviso de
 * texto provisional y secciones `LegalSection`. Va dentro de `PublicShell`.
 */
export function LegalDocument({
  title,
  updated,
  related,
  children,
}: LegalDocumentProps) {
  return (
    <article className="px-6 py-12 lg:px-16 lg:py-20">
      <div className="mx-auto flex w-full max-w-170 flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="type-eyebrow text-gold-700">Legal</p>
          <h1 className="type-h1 lg:text-display">{title}</h1>
          <p className="type-small text-text-secondary">
            Última actualización:{" "}
            <time dateTime={updated.iso} className="tabular-nums">
              {updated.label}
            </time>
          </p>
          {/* Aviso mientras el texto sea borrador (CONTENT_CHECKLIST filas 51–52). */}
          <Alert variant="warning">
            <AlertContent>
              <AlertDescription>
                <strong className="font-semibold">Texto provisional:</strong>{" "}
                aún no es el documento legal vigente.
              </AlertDescription>
            </AlertContent>
          </Alert>
        </header>
        {children}
        <p className="type-small text-text-secondary">
          Consulta también{" "}
          <Link href={related.href} className={LEGAL_INLINE_LINK}>
            {related.label}
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

type LegalSectionProps = {
  /** Ancla de la sección (`/legal/terms#cancelacion`). */
  id: string;
  title: string;
  children: React.ReactNode;
};

/** Sección numerada por el autor en el título; párrafos y listas con ritmo de lectura. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  const headingId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="flex scroll-mt-6 flex-col gap-4 type-body text-text [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6"
    >
      <h2 id={headingId} className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
