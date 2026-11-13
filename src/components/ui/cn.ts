/** Tiny className joiner (no tailwind-merge: keep variants non-conflicting). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
