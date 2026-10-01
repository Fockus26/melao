import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type * as React from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Banner, aviso en línea (handoff §2): padding 12 14, radio 12, gap 12, ícono 24 en el color
 * del estado y texto 14/20 en `text`. Error usa `role="alert"`; los demás, `role="status"`.
 * Angosto (contenido del aviso < 20rem: teléfonos de 320 a 360): sin columna para el ícono,
 * que baja a 18 y flota en la primera línea (el título, o la descripción si no hay); el resto
 * del texto usa todo el ancho (D104). Por container query: depende del ancho del aviso, no de
 * la pantalla.
 */
const alertVariants = cva(
  "@container w-full rounded-md px-3.5 py-3 type-small text-text",
  {
    variants: {
      variant: {
        info: "bg-surface-sunken",
        success: "bg-success-bg",
        warning: "bg-warning-bg",
        error: "bg-error-bg",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const ICONS: Record<AlertVariant, { Icon: typeof Info; className: string }> = {
  info: { Icon: Info, className: "text-info" },
  success: { Icon: CircleCheck, className: "text-success" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
  error: { Icon: CircleAlert, className: "text-error" },
};

function Alert({
  className,
  variant,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const tone = variant ?? "info";
  const { Icon, className: iconClass } = ICONS[tone];
  return (
    <div
      data-slot="alert"
      data-variant={tone}
      role={tone === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {/* Ancho: fila con el ícono en su columna. Angosto: bloque con el ícono flotando. */}
      <div className="flow-root @xs:flex @xs:items-start @xs:gap-3">
        <Icon
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className={cn(
            "float-left mt-px mr-2 size-4.5 shrink-0 @xs:float-none @xs:m-0 @xs:size-6",
            iconClass,
          )}
        />
        {children}
      </div>
    </div>
  );
}

/** Cuerpo del aviso: título opcional + descripción, ocupa el espacio entre ícono y acción. */
function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn(
        "min-w-0 space-y-0.5 @xs:flex @xs:flex-1 @xs:flex-col @xs:gap-0.5 @xs:space-y-0 @xs:pt-0.5",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-semibold", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-description" className={className} {...props} />;
}

/** Botón opcional a la derecha (outline, en admin); en angosto, debajo del texto. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("mt-3 @xs:mt-0 @xs:shrink-0 @xs:self-center", className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle };
