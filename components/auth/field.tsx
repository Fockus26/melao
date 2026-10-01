import { FieldMessage } from "@/components/ui/field-message";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/ui/reveal";

type FieldProps = {
  id: string;
  label: string;
  /** Mensaje de error del campo; con él, el control va con `aria-invalid`. */
  error?: string | null;
  /** Ayuda bajo el campo cuando no hay error. */
  help?: React.ReactNode;
  /** Arriba a la derecha de la etiqueta ("¿Olvidaste tu contraseña?"). */
  aside?: React.ReactNode;
  /** Recibe el id que el control debe citar en `aria-describedby` (si hay mensaje). */
  children: (describedBy: string | undefined) => React.ReactNode;
};

/** Label (small 500) + control + ayuda o error, gap 6 (handoff §2 Input). */
export function Field({ id, label, error, help, aside, children }: FieldProps) {
  const messageId = `${id}-mensaje`;
  const hasMessage = Boolean(error || help);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children(hasMessage ? messageId : undefined)}
      {/* El mensaje entra y sale con la altura animada (D103). */}
      <Reveal show={hasMessage}>
        {error ? (
          <FieldMessage id={messageId} tone="error">
            {error}
          </FieldMessage>
        ) : (
          <FieldMessage id={messageId}>{help}</FieldMessage>
        )}
      </Reveal>
    </div>
  );
}
