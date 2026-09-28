import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type * as React from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Banner, aviso en línea (handoff §2): padding 12 14, radio 12, gap 12, ícono 24 en el color del
 * estado y texto 14/20 en `text`. Error usa `role="alert"`; los demás, `role="status"`.
 */
const alertVariants = cva(
  "flex w-full items-start gap-3 rounded-md px-3.5 py-3 type-small text-text",
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
      <Icon
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className={cn("size-6 shrink-0", iconClass)}
      />
      {children}
    </div>
  );
}

/** Cuerpo del aviso: título opcional + descripción, ocupa el espacio entre ícono y acción. */
function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5", className)}
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

/** Botón opcional a la derecha (outline, en admin). */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("shrink-0 self-center", className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle };
