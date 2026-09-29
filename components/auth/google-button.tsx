"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type AuthErrorCopy, authErrorCopy } from "@/lib/auth/errors";
import { callbackUrl } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";
import { siteOrigin } from "@/lib/supabase/env";
import { GoogleMark } from "./google-mark";

/**
 * "Continuar con Google" (outline lg a ancho completo con la G). Redirige a Google y vuelve por
 * `/auth/callback?next=…`; mientras sale, queda cargando. Si Supabase rechaza antes de salir,
 * avisa al formulario para que muestre el banner.
 */
export function GoogleButton({
  next,
  disabled,
  onError,
}: {
  next: string;
  disabled?: boolean;
  onError: (error: AuthErrorCopy) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(siteOrigin(window.location.origin), next),
      },
    });
    if (error) {
      setPending(false);
      onError(authErrorCopy(error));
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      disabled={disabled}
      loading={pending}
      loadingText="Abriendo Google…"
      onClick={handleClick}
    >
      <GoogleMark className="size-5" />
      Continuar con Google
    </Button>
  );
}
