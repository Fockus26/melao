"use client";

import { Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "radix-ui";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FormErrorBanner } from "@/components/auth/form-banner";
import { Logo } from "@/components/layout/logo";
import { MAIN_ID, SkipLink } from "@/components/layout/skip-link";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/ui/icon";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DEFAULT_AFTER_AUTH,
  signInPathFor,
  WELCOME_PATH,
} from "@/lib/auth/redirect";
import {
  type DanceRole,
  type ExperienceLevel,
  LEVEL_OPTIONS,
  ONBOARDING_ERROR_COPY,
  onboardingFailure,
  ROLE_OPTIONS,
  WELCOME_STEPS,
  type WelcomeStep,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type WelcomeStyle = {
  id: string;
  name: string;
  /** `false`: se ve deshabilitado con candado y "Próximamente" (solo en la muestra, D082). */
  available?: boolean;
};

type WelcomeFlowProps = {
  styles: WelcomeStyle[];
  initial?: {
    styleIds?: string[];
    danceRole?: DanceRole | null;
    level?: ExperienceLevel | null;
  };
  initialStep?: WelcomeStep;
  /** `sample`: la muestra de `/layouts/welcome`; no llama a la base y vuelve al índice. */
  mode?: "live" | "sample";
};

// Card de selección (handoff P-Bienvenida): borde divider sobre bg; elegida, tint + borde
// gold-600. La casilla o el círculo marcan el estado además del color.
const CARD = [
  "flex w-full items-center gap-4 rounded-md border border-divider bg-bg px-5 py-4 text-left text-text",
  "transition-[background-color,border-color] duration-hover ease-standard motion-reduce:transition-none",
  "hover:bg-hover data-[state=checked]:border-gold-600 data-[state=checked]:bg-gold-tint",
  "disabled:cursor-not-allowed",
];

/**
 * Bienvenida en 3 pasos (estilos → rol → nivel) con el estado en el cliente; al final llama a
 * `complete_onboarding` (la regla vive en la base, D003) y va a Inicio. Columna de 560,
 * barra de 3 segmentos + "Paso n de 3", CTA abajo. Al cambiar de paso el foco va al título.
 * Copy provisional (CONTENT_CHECKLIST filas 45 y 46).
 */
export function WelcomeFlow({
  styles,
  initial,
  initialStep = 1,
  mode = "live",
}: WelcomeFlowProps) {
  const router = useRouter();
  const id = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const available = styles.filter((s) => s.available !== false);
  const [step, setStep] = useState<WelcomeStep>(initialStep);
  const [styleIds, setStyleIds] = useState<string[]>(() =>
    (initial?.styleIds ?? []).filter((sid) =>
      available.some((s) => s.id === sid),
    ),
  );
  const [role, setRole] = useState<DanceRole | "">(initial?.danceRole ?? "");
  const [level, setLevel] = useState<ExperienceLevel | "">(
    initial?.level ?? "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = `${id}-titulo`;
  const reasonId = `${id}-motivo`;

  function go(next: WelcomeStep) {
    // El foco va al título del paso nuevo (al cargar se queda donde lo deja el navegador).
    flushSync(() => {
      setError(null);
      setStep(next);
    });
    titleRef.current?.focus();
  }

  function choose(value: string) {
    if (step === 2) setRole(value as DanceRole);
    else setLevel(value as ExperienceLevel);
  }

  function toggleStyle(styleId: string, checked: boolean) {
    setStyleIds((current) =>
      checked
        ? [...current, styleId]
        : current.filter((sid) => sid !== styleId),
    );
  }

  const ready =
    step === 1 ? styleIds.length > 0 : step === 2 ? role !== "" : level !== "";
  const reason =
    step === 1
      ? "Elige al menos un estilo para seguir."
      : step === 2
        ? "Elige tu rol para seguir."
        : "Elige desde dónde empiezas.";

  async function finish() {
    if (!ready || pending || role === "" || level === "") return;
    if (mode === "sample") {
      router.push("/layouts");
      return;
    }
    setPending(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc(
      "complete_onboarding",
      { p_style_ids: styleIds, p_dance_role: role, p_level: level },
    );
    const failure = onboardingFailure(rpcError);
    if (failure === "session") {
      router.replace(signInPathFor(WELCOME_PATH));
      return;
    }
    if (failure) {
      setError(ONBOARDING_ERROR_COPY[failure]);
      setPending(false);
      return;
    }
    // "Ya sé pasos" también va a Inicio mientras no exista el catálogo (D083).
    router.replace(DEFAULT_AFTER_AUTH);
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    if (step < WELCOME_STEPS) go((step + 1) as WelcomeStep);
    else void finish();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SkipLink />
      <div className="mx-auto flex w-full max-w-140 flex-1 flex-col gap-6 px-6 pt-4 pb-[calc(var(--spacing-6)+env(safe-area-inset-bottom))]">
        <header className="flex flex-col gap-3">
          <div className="flex min-h-14 items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="type-small tabular-nums text-text-secondary">
              Paso {step} de {WELCOME_STEPS}
            </p>
          </div>
          {/* El paso ya está en texto; la barra es solo visual. */}
          <div aria-hidden="true" className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-0.75 flex-1",
                  n <= step ? "bg-gold-600" : "bg-divider",
                )}
              />
            ))}
          </div>
        </header>

        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col focus:outline-none"
        >
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-1 flex-col gap-6"
          >
            <header className="flex flex-col gap-2 pt-6">
              <h1
                ref={titleRef}
                id={titleId}
                tabIndex={-1}
                className="type-display"
              >
                {step === 1 ? (
                  <>
                    ¿Qué quieres <em>bailar</em>?
                  </>
                ) : step === 2 ? (
                  <>
                    ¿Cómo <em>bailas</em>?
                  </>
                ) : (
                  "¿Desde dónde empiezas?"
                )}
              </h1>
              {step === 1 ? (
                <p className="type-body text-text-secondary">
                  Elige uno o varios. Puedes sumar otro después.
                </p>
              ) : step === 2 ? (
                <p className="type-body text-text-secondary">
                  Verás los videos de tu rol en todos los estilos. Lo cambias
                  cuando quieras en tu perfil.
                </p>
              ) : null}
            </header>

            <FormErrorBanner message={error} />

            {step === 1 ? (
              styles.length === 0 ? (
                <FormErrorBanner message="No pudimos cargar los estilos. Recarga la página para intentarlo de nuevo." />
              ) : (
                <fieldset
                  aria-labelledby={titleId}
                  className="flex flex-col gap-3"
                >
                  {styles.map((style) =>
                    style.available === false ? (
                      <div
                        key={style.id}
                        className="flex min-h-18 items-center gap-4 rounded-md border border-dashed border-border-input px-5 py-4"
                      >
                        <span className="flex grow flex-col gap-0.5">
                          <span className="type-h2 text-text-muted">
                            {style.name}
                          </span>
                          <span className="type-small text-text-muted">
                            Próximamente
                          </span>
                        </span>
                        <Lock
                          aria-hidden="true"
                          strokeWidth={ICON_STROKE}
                          className="size-4.5 shrink-0 text-text-muted"
                        />
                      </div>
                    ) : (
                      <Checkbox.Root
                        key={style.id}
                        checked={styleIds.includes(style.id)}
                        onCheckedChange={(v) =>
                          toggleStyle(style.id, v === true)
                        }
                        disabled={pending}
                        className={cn(CARD, "group/card min-h-22")}
                      >
                        <span className="grow type-h2">{style.name}</span>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border-2 border-border-input group-data-[state=checked]/card:border-primary group-data-[state=checked]/card:bg-primary group-data-[state=checked]/card:text-on-primary">
                          <Checkbox.Indicator>
                            <Check
                              aria-hidden="true"
                              strokeWidth={ICON_STROKE}
                              className="size-4.5"
                            />
                          </Checkbox.Indicator>
                        </span>
                      </Checkbox.Root>
                    ),
                  )}
                </fieldset>
              )
            ) : (
              <RadioGroup
                aria-labelledby={titleId}
                value={step === 2 ? role : level}
                onValueChange={choose}
                disabled={pending}
              >
                {(step === 2 ? ROLE_OPTIONS : LEVEL_OPTIONS).map((option) => (
                  <RadioGroupItem
                    key={option.value}
                    value={option.value}
                    aria-labelledby={`${id}-${option.value}`}
                    aria-describedby={`${id}-${option.value}-texto`}
                    className={cn(CARD, "group/card min-h-24")}
                  >
                    <span className="flex grow flex-col gap-1">
                      <span id={`${id}-${option.value}`} className="type-h3">
                        {option.label}
                      </span>
                      <span
                        id={`${id}-${option.value}-texto`}
                        className="type-small text-text-secondary"
                      >
                        {option.description}
                      </span>
                    </span>
                    {/* Círculo de 24: anillo de 2 en reposo (el 1,5 del tablero no está en la escala), de 7 en primary elegido. */}
                    <span className="size-6 shrink-0 rounded-pill border-2 border-border-input group-data-[state=checked]/card:border-7 group-data-[state=checked]/card:border-primary" />
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            )}

            {step === 2 ? (
              <p className="type-small text-text-secondary">
                Los pasos libres, sin pareja, tienen un solo video para todos.
              </p>
            ) : null}

            <div className="flex flex-1 flex-col justify-end gap-3">
              {!ready ? (
                <p id={reasonId} className="type-small text-text-secondary">
                  {reason}
                </p>
              ) : null}
              <div className="flex gap-2">
                {step > 1 ? (
                  <Button
                    variant="outline"
                    size="lg"
                    // Base de 120 que cede a 320 px: el principal no baja de su contenido.
                    className="shrink basis-30"
                    disabled={pending}
                    onClick={() => go((step - 1) as WelcomeStep)}
                  >
                    Atrás
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={!ready}
                  aria-describedby={ready ? undefined : reasonId}
                  loading={pending}
                  loadingText="Guardando…"
                >
                  {step < WELCOME_STEPS ? "Siguiente" : "Empezar"}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
