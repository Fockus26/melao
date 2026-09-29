"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Diálogo de confirmación (handoff §2): card radio 20, padding 24, gap 12, título h2, texto
 * small, botones apilados de 52. **Primero la acción segura** (primary, `AlertDialogCancel`: es
 * la que recibe el foco al abrir), después la destructiva (outline, `AlertDialogAction`). Entra
 * con opacidad y `scale(.96) → 1` en 200 ms; con movimiento reducido solo aparece. La variante
 * de escenario (bg stage-panel) no va aquí.
 */
function AlertDialog(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Root>,
) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>,
) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        className={cn(
          "fixed inset-0 z-scrim bg-scrim",
          "data-open:animate-in data-open:fade-in data-open:animation-duration-[var(--duration-state)] data-open:ease-standard motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
        )}
      />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-dialog flex w-[calc(100%-var(--spacing-8))] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border border-divider bg-surface p-6 text-text shadow-modal outline-none",
          "data-open:animate-in data-open:fade-in data-open:zoom-in-96 data-open:animation-duration-[var(--duration-state)] data-open:ease-standard motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("type-h2", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("type-small text-text-secondary", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("mt-3 flex flex-col gap-3", className)}
      {...props}
    />
  );
}

/** Acción segura ("Seguir en la lección"): primary, arriba, con el foco inicial. */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <Button variant="primary" className={cn("h-13 w-full", className)} asChild>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />
    </Button>
  );
}

/** Acción destructiva ("Salir de la práctica"): outline, debajo. */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <Button variant="outline" className={cn("h-13 w-full", className)} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
};
