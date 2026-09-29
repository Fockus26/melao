import { Check, X } from "lucide-react";
import { ICON_STROKE } from "@/components/ui/icon";
import { checkPassword } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

/**
 * Requisitos de contraseña bajo el campo (handoff §2): check en success si se cumple, × en
 * text-secondary si falta, y el estado también en texto oculto (nunca solo color ni ícono).
 */
export function PasswordRequirements({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  const { rules } = checkPassword(password);
  return (
    <div id={id} className="flex flex-col gap-1">
      <p className="sr-only">Tu contraseña necesita:</p>
      <ul className="flex flex-col gap-1">
        {rules.map(({ id: ruleId, label, met }) => {
          const Icon = met ? Check : X;
          return (
            <li
              key={ruleId}
              data-met={met}
              className={cn(
                "flex items-center gap-1.5 type-small",
                met ? "text-success" : "text-text-secondary",
              )}
            >
              <Icon
                aria-hidden="true"
                strokeWidth={ICON_STROKE}
                className="size-4.5 shrink-0"
              />
              <span>
                {label}
                <span className="sr-only">
                  {met ? " (cumplido)" : " (pendiente)"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
