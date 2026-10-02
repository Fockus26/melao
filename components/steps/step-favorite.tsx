"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ICON_STROKE } from "@/components/ui/icon";
import { signInPathFor } from "@/lib/auth/redirect";
import {
  saveStepFavorite,
  supabaseUserSteps,
  type UserStepsPort,
} from "@/lib/steps/favorite";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Copy provisional (CONTENT_CHECKLIST fila 70).
export const STEP_FAVORITE_COPY = {
  label: (name: string) => `Agregar ${name} a favoritos`,
  error: "No pudimos guardar tu favorito. Inténtalo de nuevo.",
} as const;

type Favoritable = { id: string; favorite: boolean };

/**
 * Favoritos de pasos con estado optimista (D129): el corazón cambia al tocarlo, la escritura va
 * en fila por paso (dos toques rápidos escriben en orden y gana el último) y, si falla, vuelve
 * atrás y avisa; con la sesión vencida, a Entrar. En `sample` no escribe nada. Lo usan el
 * catálogo y el detalle del paso.
 */
export function useStepFavorites({
  userId,
  variant = "live",
  port,
}: {
  userId?: string;
  variant?: "live" | "sample";
  /** Para tests; por defecto, `user_steps` con el cliente del navegador. */
  port?: UserStepsPort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Favorito según el alumno, por encima de lo que trajo el servidor.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);
  const pending = useRef(new Map<string, Promise<void>>());

  const isFavorite = (step: Favoritable) => overrides[step.id] ?? step.favorite;

  function toggle(step: Favoritable) {
    const next = !isFavorite(step);
    setError(false);
    setOverrides((o) => ({ ...o, [step.id]: next }));
    if (variant === "sample" || !userId) return;
    const previous = pending.current.get(step.id) ?? Promise.resolve();
    const run = previous.then(async () => {
      const result = await saveStepFavorite(
        port ?? supabaseUserSteps(createClient()),
        userId,
        step.id,
        next,
      ).catch(() => "error" as const);
      if (result === "ok") return;
      if (result === "unauthorized") {
        router.replace(signInPathFor(`${pathname}${window.location.search}`));
        return;
      }
      setOverrides((o) => ({ ...o, [step.id]: !next }));
      setError(true);
    });
    pending.current.set(step.id, run);
  }

  return { isFavorite, toggle, error, dismissError: () => setError(false) };
}

/**
 * Corazón de 48 con `aria-pressed` (handoff §2): relleno dorado si es favorito; la forma
 * (relleno) cambia además del color. Va aparte del enlace de la fila, nunca dentro.
 */
export function StepFavoriteButton({
  name,
  favorite,
  onToggle,
  className,
}: {
  name: string;
  favorite: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={STEP_FAVORITE_COPY.label(name)}
      onClick={onToggle}
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-pill",
        "transition-colors duration-hover ease-standard hover:bg-hover motion-reduce:transition-none",
        favorite ? "text-gold-600" : "text-text-secondary",
        className,
      )}
    >
      <Heart
        aria-hidden="true"
        strokeWidth={ICON_STROKE}
        className={cn("size-6", favorite && "fill-current")}
      />
    </button>
  );
}
