// Light/dark theme without a provider, following the bundled Next.js guide
// `01-app/02-guides/preventing-flash-before-hydration.md`: an inline <head> script sets the
// `.dark` class before first paint, so pages stay statically prerendered and never flash.

export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice still applies for this page view.
  }
  applyTheme(theme);
}

// Same logic as `readStoredTheme` + `applyTheme`, as a string the browser runs while parsing
// <head>. It also keeps following the OS setting while the stored choice is "system".
export const themeInitScript = `(function(){try{var m=matchMedia("${DARK_QUERY}");function a(){var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.classList.toggle("dark",t==="dark"||(t!=="light"&&m.matches))}a();m.addEventListener("change",a)}catch(e){}})()`;
