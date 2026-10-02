import { clsx, type ClassValue } from "clsx";

/** Tailwind-safe conditional class joiner. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
