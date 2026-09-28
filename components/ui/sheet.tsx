"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";
import { IconButton } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Sheet inferior (handoff §2): radio 20 arriba, bg, sombra `sheet`, asa 36 × 4, título h2 y
 * cerrar de 48. Entra en 320 ms ease-standard y sale en 240 ms ease-exit; el scrim en 240 ms.
 * Foco atrapado, Esc cierra y el foco vuelve al disparador (Radix Dialog). Solo `side="bottom"`:
 * es el único que usa la app.
 */
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(
  props: React.ComponentProps<typeof SheetPrimitive.Trigger>,
) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-scrim bg-scrim",
        "data-open:animate-in data-open:fade-in data-closed:animate-out data-closed:fade-out",
        "animation-duration-[var(--duration-move)] ease-standard motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  title,
  closeLabel = "Cerrar",
  ...props
}: Omit<React.ComponentProps<typeof SheetPrimitive.Content>, "title"> & {
  /** Título visible (h2); también da nombre al diálogo. */
  title: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-[calc(100dvh-var(--spacing-14))] w-full max-w-3xl flex-col rounded-t-lg bg-bg text-text shadow-sheet outline-none",
          "data-open:animate-in data-open:slide-in-from-bottom data-open:animation-duration-[var(--duration-enter)] data-open:ease-standard",
          "data-closed:animate-out data-closed:slide-out-to-bottom data-closed:animation-duration-[var(--duration-move)] data-closed:ease-exit",
          // Con movimiento reducido aparece sin desplazamiento.
          "motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-pill bg-divider"
        />
        <div className="flex items-center justify-between gap-4 py-1 pr-2 pl-5">
          <SheetPrimitive.Title className="type-h2">
            {title}
          </SheetPrimitive.Title>
          <SheetPrimitive.Close asChild>
            <IconButton aria-label={closeLabel}>
              <X strokeWidth={ICON_STROKE} aria-hidden="true" />
            </IconButton>
          </SheetPrimitive.Close>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-2 pb-6">
          {children}
        </div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("type-small text-text-secondary", className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTrigger };
