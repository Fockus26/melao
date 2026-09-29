"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";

/**
 * Plan activado (P-Planes): columna de 560, check en círculo con borde success, display "Tu
 * plan … está *activo*" y CTA a Inicio abajo. Copy provisional (CONTENT_CHECKLIST fila 48).
 * `focus`: al llegar tras activar, el foco pasa al título para que se anuncie el resultado.
 */
export function PlanActivated({
  planName,
  focus = false,
}: {
  planName: string;
  focus?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) titleRef.current?.focus();
  }, [focus]);

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4 px-6 pt-24 pb-12">
      <span className="flex size-14 items-center justify-center rounded-pill border-2 border-success text-success">
        <Check
          aria-hidden="true"
          strokeWidth={ICON_STROKE}
          className="size-6"
        />
      </span>
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="mt-2 type-display focus:outline-none"
      >
        Tu plan {planName} está <em>activo</em>
      </h1>
      <p className="type-body text-text-secondary">
        Ya puedes entrar a todas las lecciones.
      </p>
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/app">Empezar mi primera lección</Link>
      </Button>
    </div>
  );
}
