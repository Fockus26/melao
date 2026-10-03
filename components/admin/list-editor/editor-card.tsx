import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { FieldMessage } from "@/components/ui/field-message";
import { ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Editor del patrón lista + editor (handoff §3 Admin): card con grilla de 2 columnas de campos,
 * secciones separadas por divider y botonera abajo a la derecha con el motivo de bloqueo en
 * texto rojo con ícono antes del botón deshabilitado.
 *
 * API:
 * - `EditorCard`: `<section>` con título (h2), `eyebrow` y `badges` opcionales, el cuerpo
 *   (`EditorSection`es) y `actions` (una `EditorActions`).
 * - `EditorSection`: título h3, descripción opcional y contenido; la separa un divider.
 * - `FieldGrid`: 1 columna; 2 desde 768. `Field` con `wide` ocupa las dos.
 * - `Field`: etiqueta arriba, control, y debajo la ayuda o el error (`FieldMessage`). El
 *   control lo pone el dueño con `id={htmlFor}` y `aria-describedby={messageId(htmlFor)}`.
 * - `EditorActions`: `blockReason` (texto) + `blockReasonId` (el botón bloqueado lo referencia
 *   con `aria-describedby`), `status` (p. ej. "Guardado." o el error) y los botones.
 * - `EditorEmpty`: la columna del editor sin nada abierto.
 */

export function EditorCard({
  titleId,
  title,
  eyebrow,
  badges,
  children,
  actions,
}: {
  titleId: string;
  title: string;
  eyebrow?: string;
  badges?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-md border border-divider bg-surface"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 p-5 md:px-6">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow ? (
            <p className="type-overline text-text-secondary">{eyebrow}</p>
          ) : null}
          <h2 id={titleId} className="type-h2 break-words">
            {title}
          </h2>
        </div>
        {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
      </header>
      {children}
      <div className="border-t border-divider p-5 md:px-6">{actions}</div>
    </section>
  );
}

export function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 border-t border-divider p-5 md:px-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id={id} className="type-h4">
          {title}
        </h3>
        {description ? (
          <p className="type-small text-text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
      {children}
    </div>
  );
}

/** Id del mensaje bajo un campo (ayuda o error). */
export const messageId = (fieldId: string) => `${fieldId}-message`;

export function Field({
  htmlFor,
  label,
  help,
  error,
  wide = false,
  children,
}: {
  htmlFor: string;
  label: string;
  help?: ReactNode;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1.5", wide && "md:col-span-2")}
    >
      <label htmlFor={htmlFor} className="type-small font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <FieldMessage id={messageId(htmlFor)} tone="error">
          {error}
        </FieldMessage>
      ) : help ? (
        <FieldMessage id={messageId(htmlFor)}>{help}</FieldMessage>
      ) : null}
    </div>
  );
}

export function EditorActions({
  blockReason,
  blockReasonId,
  status,
  children,
}: {
  blockReason?: ReactNode;
  blockReasonId?: string;
  /** Resultado de la última acción ("Guardado." o el error), anunciado con `aria-live`. */
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite" className="empty:hidden">
        {status}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {blockReason ? (
          <p
            id={blockReasonId}
            className="flex min-w-0 flex-1 basis-60 items-start justify-end gap-1.5 text-right type-small text-error"
          >
            <CircleAlert
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="mt-px size-4.5 shrink-0"
            />
            <span>{blockReason}</span>
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function EditorEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-input p-8 text-center">
      <p className="type-h4">{title}</p>
      <p className="max-w-sm type-small text-text-secondary">{text}</p>
    </div>
  );
}
