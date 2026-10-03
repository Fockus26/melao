"use client";

import { EllipsisVertical } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Menú "Más acciones" de una fila del árbol (unidad o lección): la alternativa sin arrastre para
 * reordenar (Subir, Bajar, Mover a otra unidad; WCAG 2.5.7) y lo demás de la fila. Botón de 48
 * con nombre "Más acciones para {nombre}"; opciones de 48 de alto. Una opción con `disabled`
 * se ve y se anuncia, pero no se elige.
 */
export type RowMenuItem =
  | {
      kind?: "item";
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | { kind: "separator" }
  | { kind: "label"; label: string };

export function RowMenu({
  label,
  items,
}: {
  /** Nombre accesible del botón. */
  label: string;
  items: readonly RowMenuItem[];
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-pill text-text",
          "transition-colors duration-hover ease-standard motion-reduce:transition-none hover:bg-hover",
          "data-[state=open]:bg-hover",
        )}
      >
        <EllipsisVertical
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-4.5"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className={cn(
            "z-popover min-w-56 max-w-[calc(100vw-2rem)] rounded-sm border border-border-input bg-bg p-1 text-text",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:animation-duration-[var(--duration-hover)] motion-reduce:data-[state=open]:animate-none",
          )}
        >
          {items.map((item, i) => {
            if (item.kind === "separator")
              return (
                <DropdownMenu.Separator
                  // biome-ignore lint/suspicious/noArrayIndexKey: lista fija por render.
                  key={i}
                  className="-mx-1 my-1 h-px bg-divider"
                />
              );
            if (item.kind === "label")
              return (
                <DropdownMenu.Label
                  // biome-ignore lint/suspicious/noArrayIndexKey: lista fija por render.
                  key={i}
                  className="px-3.5 py-2 type-caption text-text-secondary"
                >
                  {item.label}
                </DropdownMenu.Label>
              );
            return (
              <DropdownMenu.Item
                // biome-ignore lint/suspicious/noArrayIndexKey: lista fija por render.
                key={i}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  "flex min-h-12 cursor-default select-none items-center rounded-sm px-3.5 py-2 type-body outline-none",
                  "focus:bg-hover data-disabled:pointer-events-none data-disabled:text-text-muted",
                  item.danger ? "text-error" : "text-text",
                )}
              >
                {item.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
