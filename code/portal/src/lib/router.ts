/**
 * Minimal hash-based router. Routes:
 *   #/           home
 *   #/a/:id      agent detail page
 */
import { useEffect, useSyncExternalStore } from "react";

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function getHash(): string {
  return window.location.hash.slice(1) || "/";
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getHash, () => "/");
}

export function navigate(path: string): void {
  window.location.hash = path;
}

/** Jump to top on every route change. */
export function useScrollReset(path: string): void {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
}
