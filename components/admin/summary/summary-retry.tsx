"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { summaryCopy as COPY } from "./copy";

/** Reintentar la lectura del Resumen: vuelve a pedir el Server Component sin recargar. */
export function SummaryRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="self-start"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => startTransition(() => router.refresh())}
    >
      {COPY.retry}
    </Button>
  );
}
