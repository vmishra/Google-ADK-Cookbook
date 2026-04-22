/**
 * Theme state — light is the default (warmer, editorial).
 * Persisted in localStorage. Applied by setting data-theme on <html>
 * so the OKLCH tokens in tokens.css swap cleanly.
 */
import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "adk-theme";

function read(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  // If the user has no preference stored, prefer *light* — we want the
  // warm paper tone as the default. Respect system only as a fallback.
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

// The store is keyed on a subscription to window storage events so tabs
// stay in sync. For single-tab toggles we also dispatch a custom event.
function subscribe(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("adk-theme-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("adk-theme-change", handler);
  };
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  useEffect(() => { apply(theme); }, [theme]);
  const set = (next: Theme) => {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event("adk-theme-change"));
  };
  return [theme, set];
}

/** Call once at boot so the first paint is on the right palette. */
export function applyInitialTheme(): void {
  apply(read());
}
