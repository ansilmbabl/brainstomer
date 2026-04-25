/** Stable for SSR (avoids locale drift). */
export function formatDateTimeUtc(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
