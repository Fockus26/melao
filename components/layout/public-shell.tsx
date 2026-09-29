import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MAIN_ID, SkipLink } from "./skip-link";

/** Copy provisional de header y footer públicos (CONTENT_CHECKLIST fila 38). */
const LANDING_LINKS = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#planes", label: "Planes" },
  { href: "/#preguntas", label: "Preguntas" },
] as const;

const LEGAL_LINKS = [
  { href: "/legal/terminos", label: "Términos" },
  { href: "/legal/privacidad", label: "Privacidad" },
] as const;

type PublicShellProps = {
  children: React.ReactNode;
  /**
   * `landing`: enlaces de secciones + Entrar + Empieza (en móvil solo Entrar).
   * `account`: logo y correo de la sesión (Planes, Checkout).
   */
  header?: "landing" | "account";
  /** Correo de la sesión para `header="account"`. Sin datos reales todavía: lo pasa la pantalla. */
  email?: string;
};

// Padding lateral 24 (móvil) · 64 (≥ 1024); el contenido se centra a máx. 1200, así que a
// 1440 el margen efectivo es 120, como en el handoff §4.
const GUTTER = "px-6 lg:px-16";

/** Shell pública (landing, planes, checkout, legal): header de 72 y footer (handoff §3). */
export function PublicShell({
  children,
  header = "landing",
  email,
}: PublicShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SkipLink />
      <header className={GUTTER}>
        <div className="mx-auto flex h-18 w-full max-w-300 items-center justify-between gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-self-start rounded-md"
          >
            <Logo />
          </Link>
          {header === "landing" ? (
            <>
              <nav aria-label="Secciones" className="hidden lg:block">
                <ul className="flex items-center gap-2">
                  {LANDING_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="inline-flex min-h-12 items-center rounded-md px-3 text-button text-text hover:bg-hover"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex items-center gap-2 justify-self-end">
                <Button asChild variant="quiet">
                  <Link href="/entrar">Entrar</Link>
                </Button>
                <Button asChild className="hidden lg:inline-flex">
                  <Link href="/registro">Empieza</Link>
                </Button>
              </div>
            </>
          ) : (
            email && (
              <p className="min-w-0 truncate type-small text-text-secondary lg:col-start-3 lg:justify-self-end">
                <span className="sr-only">Sesión iniciada como </span>
                {email}
              </p>
            )
          )}
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="min-w-0 flex-1 focus:outline-none"
      >
        {children}
      </main>
      <footer className={`border-t border-divider py-10 lg:py-12 ${GUTTER}`}>
        <div className="mx-auto flex w-full max-w-300 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center self-start rounded-md lg:self-auto"
          >
            <Logo size="sm" />
          </Link>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-4">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-12 items-center type-small text-text-secondary decoration-gold-500 underline-offset-4 hover:text-text hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="type-small tabular-nums text-text-secondary">
            © {new Date().getFullYear()} Melao
          </p>
        </div>
      </footer>
    </div>
  );
}
