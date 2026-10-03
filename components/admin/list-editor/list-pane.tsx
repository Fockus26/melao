"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { GuardedLink } from "./leave-guard";

/**
 * Columna de la lista del patrón lista + editor (handoff §3 Admin): búsqueda, chips de filtro
 * con contador y filas de 56 con pill. Genérica: el dueño (Pasos, Canciones) pone los datos.
 *
 * API:
 * - `ListSearch`: SearchField (solo línea inferior) con "Borrar"; controlado.
 * - `SingleFilterChips`: chips de elección única (`role="radiogroup"`); volver a tocar el activo
 *   lo apaga (= todos). `MultiFilterChips`: chips que se combinan (`aria-pressed`). Cada opción
 *   lleva `count`, que se muestra al lado de la etiqueta y forma parte del nombre.
 * - `ListRows` + `ListRow`: la fila es un enlace (pasa por el aviso de cambios sin guardar) de
 *   56 de alto; la abierta va en tint con `aria-current="true"` y el nombre en negrita.
 * - `ListEmpty`: aviso cuando no hay filas (sin datos o sin resultados), con acción opcional.
 */

export function ListSearch({
  id,
  value,
  onChange,
  label,
  placeholder,
  clearLabel,
  clearLabelSr,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  clearLabel: string;
  clearLabelSr: string;
  describedBy?: string;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {/* SearchField (handoff §2): solo línea inferior; foco = línea de 2 px. */}
      <div
        className={cn(
          "flex h-13 items-center gap-3 border-b border-border-input",
          "transition-[border-color,box-shadow] duration-hover ease-standard motion-reduce:transition-none",
          "hover:border-text has-focus-visible:border-text has-focus-visible:shadow-[0_1px_0_0_var(--color-text)]",
        )}
      >
        <Search
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-6 shrink-0 text-text-secondary"
        />
        <input
          id={id}
          type="search"
          value={value}
          maxLength={120}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.currentTarget.value)}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent type-body text-text outline-none placeholder:text-text-muted",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
        {value ? (
          <Button
            variant="quiet"
            className="type-small font-semibold"
            onClick={() => {
              onChange("");
              document.getElementById(id)?.focus();
            }}
          >
            <span aria-hidden="true">{clearLabel}</span>
            <span className="sr-only">{clearLabelSr}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

function ChipLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      <span className="tabular-nums text-text-secondary group-data-[state=on]/toggle:text-text">
        {count}
      </span>
    </>
  );
}

function ChipFieldset({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-2 type-overline text-text-secondary">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function SingleFilterChips<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly FilterOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <ChipFieldset legend={legend}>
      <ToggleGroup
        type="single"
        variant="chip"
        value={value ?? ""}
        onValueChange={(v) => onChange(v ? (v as T) : null)}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value}>
            <ChipLabel label={o.label} count={o.count} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </ChipFieldset>
  );
}

export function MultiFilterChips<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly FilterOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <ChipFieldset legend={legend}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Toggle
            key={o.value}
            variant="chip"
            pressed={value.includes(o.value)}
            onPressedChange={(on) => {
              const set = new Set(value);
              if (on) set.add(o.value);
              else set.delete(o.value);
              onChange(options.map((x) => x.value).filter((v) => set.has(v)));
            }}
          >
            <ChipLabel label={o.label} count={o.count} />
          </Toggle>
        ))}
      </div>
    </ChipFieldset>
  );
}

export function ListRows({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ul aria-label={label} className="flex flex-col border-t border-divider">
      {children}
    </ul>
  );
}

export function ListRow({
  href,
  current,
  title,
  meta,
  pills,
}: {
  href: string;
  current: boolean;
  title: string;
  /** Texto secundario bajo el nombre (categoría, dificultad…). */
  meta?: ReactNode;
  /** Pills de estado (siempre con texto). */
  pills?: ReactNode;
}) {
  return (
    <li className="border-b border-divider">
      <GuardedLink
        href={href}
        aria-current={current ? "true" : undefined}
        className={cn(
          "flex min-h-14 items-center gap-3 px-3 py-2",
          "transition-colors duration-hover ease-standard motion-reduce:transition-none",
          current ? "bg-gold-tint" : "hover:bg-hover",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate type-body text-text",
              current && "font-semibold",
            )}
          >
            {title}
          </span>
          {meta ? (
            <span className="truncate type-caption text-text-secondary">
              {meta}
            </span>
          ) : null}
        </span>
        {pills ? (
          <span className="flex shrink-0 flex-wrap justify-end gap-1">
            {pills}
          </span>
        ) : null}
      </GuardedLink>
    </li>
  );
}

export function ListEmpty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-divider bg-surface p-5">
      <p className="type-h4">{title}</p>
      <p className="type-small text-text-secondary">{text}</p>
      {action}
    </div>
  );
}
