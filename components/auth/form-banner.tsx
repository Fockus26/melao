import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Reveal } from "@/components/ui/reveal";

/**
 * Banner de error del formulario (`role="alert"`: se anuncia al aparecer). Va arriba del
 * formulario, bajo Google; el campo que señala lo cita en `aria-describedby` con `id`. Entra y
 * sale con la altura animada (D103): al irse, se desvanece con el último mensaje.
 */
export function FormErrorBanner({
  id,
  message,
}: {
  id?: string;
  message: string | null;
}) {
  return (
    <Reveal show={Boolean(message)}>
      <Alert variant="error">
        <AlertContent>
          <AlertDescription id={id}>{message}</AlertDescription>
        </AlertContent>
      </Alert>
    </Reveal>
  );
}
