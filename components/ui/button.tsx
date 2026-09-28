import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Button del handoff §2. Las variantes de escenario (`stage-*`) no van aquí: el escenario tiene
 * sus propios botones y no comparte componente con la app (handoff §8).
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent",
    "transition-[background-color,border-color,color,text-decoration-color,scale] duration-hover ease-standard",
    "active:scale-98 active:duration-press",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
    "[&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0",
    // Deshabilitado: sunken + muted, sin borde. La razón va en texto con aria-describedby.
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-sunken disabled:text-text-muted disabled:no-underline disabled:active:scale-100",
    "aria-busy:cursor-progress aria-busy:active:scale-100",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        outline:
          "border-border-input bg-transparent text-text hover:border-text hover:bg-hover",
        quiet:
          "bg-transparent text-text underline decoration-gold-500 decoration-1 underline-offset-5 hover:decoration-text",
        danger: "border-error bg-transparent text-error hover:bg-error-bg",
      },
      size: {
        md: "h-12 px-5 type-button",
        lg: "h-14 px-6 type-button-lg",
      },
    },
    compoundVariants: [
      // El enlace discreto conserva el alto táctil pero con 8 px a los lados.
      { variant: "quiet", className: "px-2" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (p. ej. `<Link>`) con los estilos del botón: `<a>` si navega. */
    asChild?: boolean;
    /** Estado cargando: spinner + `loadingText`, `aria-busy` y el mismo ancho que en reposo. */
    loading?: boolean;
    /** Texto en gerundio que reemplaza la etiqueta mientras carga ("Guardando…"). */
    loadingText?: string;
  };

/** Spinner de 20 px: borde de 2 px en currentColor con un lado transparente; sin giro si se reduce el movimiento. */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-5 shrink-0 animate-spinner rounded-pill border-2 border-current border-r-transparent motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  type = "button",
  children,
  onClick,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      data-variant={variant ?? "primary"}
      type={type}
      className={classes}
      aria-busy={loading || undefined}
      // Mientras carga sigue enfocable (el foco no salta), pero no repite la acción.
      aria-disabled={loading || props["aria-disabled"] || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...props}
    >
      {loadingText === undefined ? (
        loading ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          children
        )
      ) : (
        // Las dos etiquetas ocupan la misma celda: el botón mide lo que la más ancha y no salta.
        <span className="inline-grid items-center justify-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              loading && "invisible",
            )}
          >
            {children}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              !loading && "invisible",
            )}
          >
            <Spinner />
            {loadingText}
          </span>
        </span>
      )}
    </button>
  );
}

const iconButtonVariants = cva(
  [
    "inline-flex size-12 shrink-0 items-center justify-center rounded-pill border border-transparent text-text",
    "transition-[background-color,border-color] duration-hover ease-standard motion-reduce:transition-none",
    "hover:bg-hover disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        ghost: "bg-transparent",
        outline: "border-border-input hover:border-text",
      },
      // 48 × 48 siempre; cambia solo el ícono (24, o 18 en filas densas).
      iconSize: {
        md: "[&_svg]:size-6",
        dense: "[&_svg]:size-4.5",
      },
    },
    defaultVariants: { variant: "ghost", iconSize: "md" },
  },
);

type IconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    /** Obligatorio: un botón solo con ícono no tiene otro nombre accesible. */
    "aria-label": string;
    asChild?: boolean;
  };

function IconButton({
  className,
  variant,
  iconSize,
  asChild = false,
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = cn(iconButtonVariants({ variant, iconSize }), className);
  if (asChild)
    return <Slot.Root data-slot="icon-button" className={classes} {...props} />;
  return (
    <button
      data-slot="icon-button"
      type={type}
      className={classes}
      {...props}
    />
  );
}

export { Button, buttonVariants, IconButton, iconButtonVariants, Spinner };
