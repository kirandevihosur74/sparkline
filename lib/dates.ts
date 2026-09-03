// Find the date a document prints on itself — the load-bearing fact for the
// staleness beat ("the memo is dated March 20; the filing is April 15"). Pure:
// works on the DWS text layer, no provider call.

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

const MONTH_NAME = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)";

const PATTERNS: Array<{ re: RegExp; build: (m: RegExpMatchArray) => [number, number, number] | null }> = [
  // March 20, 2026 · Mar 20 2026
  {
    re: new RegExp(`\\b${MONTH_NAME}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "i"),
    build: (m) => [Number(m[3]), MONTHS[m[1].toLowerCase()] ?? 0, Number(m[2])],
  },
  // 20 March 2026
  {
    re: new RegExp(`\\b(\\d{1,2})\\s+${MONTH_NAME}\\.?,?\\s+(20\\d{2})\\b`, "i"),
    build: (m) => [Number(m[3]), MONTHS[m[2].toLowerCase()] ?? 0, Number(m[1])],
  },
  // 2026-03-20
  {
    re: /\b(20\d{2})-(\d{2})-(\d{2})\b/,
    build: (m) => [Number(m[1]), Number(m[2]), Number(m[3])],
  },
];

function iso(parts: [number, number, number] | null): string | undefined {
  if (!parts) return undefined;
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The first printed date in `text`, as an ISO calendar date, or undefined when
 * the text carries none. Earliest position wins, not earliest pattern.
 */
export function sniffPrintedDate(text: string): string | undefined {
  let best: { at: number; value: string } | undefined;
  for (const { re, build } of PATTERNS) {
    const m = text.match(re);
    if (!m || m.index === undefined) continue;
    const value = iso(build(m));
    if (value && (!best || m.index < best.at)) best = { at: m.index, value };
  }
  return best?.value;
}
