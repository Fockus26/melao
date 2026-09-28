"use client";

import { Check } from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Pestañas con el aspecto del SegmentedControl (handoff §2): cuando lo que cambia es un panel
 * de contenido (tablist/tab/tabpanel), no un valor de formulario. Flechas del teclado vía Radix.
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex w-full gap-1 rounded-pill border border-border-input p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group/tab relative inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-pill px-4 type-small font-medium text-text",
        "transition-[background-color,color] duration-state ease-standard motion-reduce:transition-none",
        "hover:bg-hover disabled:cursor-not-allowed disabled:text-text-muted",
        // Zona táctil de 48: el pseudo-elemento cubre el padding de la lista.
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        "data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-on-primary data-[state=active]:hover:bg-primary",
        className,
      )}
      {...props}
    >
      <Check
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className="hidden size-4.5 shrink-0 group-data-[state=active]/tab:block"
      />
      {children}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("type-body text-text", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
