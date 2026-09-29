import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";

/**
 * Banner de error del formulario (`role="alert"`: se anuncia al aparecer). Va arriba del
 * formulario, bajo Google; el campo que señala lo cita en `aria-describedby` con `id`.
 */
export function FormErrorBanner({
  id,
  message,
}: {
  id?: string;
  message: string | null;
}) {
  if (!message) return null;
  return (
    <Alert variant="error">
      <AlertContent>
        <AlertDescription id={id}>{message}</AlertDescription>
      </AlertContent>
    </Alert>
  );
}
