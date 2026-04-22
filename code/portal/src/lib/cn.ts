import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose Tailwind classes with conflict resolution. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(...classes));
}
