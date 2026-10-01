/**
 * Error de campo "con retraso" (D100): poner un error espera a que la persona deje de teclear
 * (o salga del campo, o envíe); quitarlo es inmediato. Puro: sin React, para probarlo con
 * `bun test` y portar la misma regla a Android/iOS.
 */

/** Pausa sin teclear tras la que se muestra el error de formato (≈ ritmo de escritura). */
export const FIELD_ERROR_DELAY_MS = 600;

type Timers = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const GLOBAL_TIMERS: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Programa `reveal` a los `delay` ms si hay un error pendiente de mostrar. Devuelve la limpieza:
 * cada tecla la llama (y vuelve a programar), así que el error solo sale tras una pausa.
 */
export function scheduleReveal(
  pending: boolean,
  reveal: () => void,
  delay: number = FIELD_ERROR_DELAY_MS,
  timers: Timers = GLOBAL_TIMERS,
): (() => void) | undefined {
  if (!pending) return undefined;
  const handle = timers.set(reveal, delay);
  return () => timers.clear(handle);
}

/** Lo que se pinta: el error candidato solo si ya se reveló. Sin candidato, nada (al instante). */
export function visibleError(
  candidate: string | null,
  revealed: boolean,
): string | null {
  return revealed ? candidate : null;
}
