/**
 * Tema claro/oscuro (D007, D034). La clase `.dark` va en `<html>`; la preferencia
 * (claro, oscuro o sistema) vive en localStorage y un script inline en `<head>` la aplica antes
 * del primer pintado, sin flash. "Sistema" sigue `prefers-color-scheme`, también en vivo.
 *
 * El escenario de práctica no depende de esto: usa `--color-stage-*`, iguales en los dos temas.
 */

export const THEME_STORAGE_KEY = "melao-theme";
export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Script que corre en `<head>` antes de pintar. Autocontenido (se serializa como texto) y a
 * prueba de localStorage bloqueado. Además deja escuchando el cambio del sistema para quien
 * esté en "sistema".
 */
export const THEME_INIT_SCRIPT = `(function(){var k=${JSON.stringify(THEME_STORAGE_KEY)},q=window.matchMedia(${JSON.stringify(DARK_QUERY)});function p(){try{var v=localStorage.getItem(k);return v==="light"||v==="dark"?v:"system"}catch(e){return"system"}}function a(){var v=p(),d=v==="dark"||(v==="system"&&q.matches);document.documentElement.classList.toggle("dark",d)}a();q.addEventListener("change",a)})()`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference): void {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();

export function setThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin almacenamiento: el cambio vale para esta visita.
  }
  applyTheme(preference);
  for (const listener of listeners) listener();
}

/** Para `useSyncExternalStore`: avisa cuando cambia la preferencia (aquí o en otra pestaña). */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readThemePreference());
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
