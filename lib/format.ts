const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Deterministic UTC timestamp ("31 Aug 2026, 04:47 UTC") built from getUTC*
 * parts — no Intl. Intl output differs between Node's ICU and the browser's
 * even with a pinned locale (CLDR versions disagree on the date–time joiner),
 * which breaks hydration. Manual assembly is identical on both passes.
 */
export function formatUtc(iso: string): string | undefined {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(at.getUTCDate())} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}, ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`;
}
