/**
 * ConfidenceMeter — DESIGN_SYSTEM.md item 11.
 *
 * A 44px bar plus the percentage. Fill colour follows the one confidence
 * scale the whole system uses:
 *
 *   ≥ 0.80  → accent   (verified)
 *   0.70–0.79 → warn   (caution)
 *   < 0.70  → alert    (do not rely on it)
 *
 * `value` arrives ALREADY NORMALIZED 0–1: `normalizeConfidence` in
 * lib/data/types.ts turns the DWS 0–100 domain into 0–1 exactly once, at the
 * data-layer boundary. This component renders that number as a percentage and
 * NEVER re-normalizes it — a second divide would silently halve every figure
 * in the app, and a missing one would print "9540%".
 *
 * Colour never carries meaning alone, so the band is also spelled out in text
 * beside the bar ("high" / "moderate" / "low"). The bar itself is decorative
 * and aria-hidden; the text is the accessible value.
 *
 * Server component — renders props, holds no state.
 */

/** The three bands of the confidence scale, named so text can carry them. */
export type ConfidenceBand = "high" | "moderate" | "low";

/** DESIGN_SYSTEM.md, Confidence. The only place these numbers appear. */
const HIGH_FLOOR = 0.8;
const MODERATE_FLOOR = 0.7;

const BANDS: Record<
  ConfidenceBand,
  { /** The word that carries the band when colour cannot. */ word: string; fill: string; text: string }
> = {
  high: { word: "high", fill: "bg-accent", text: "text-accent" },
  moderate: { word: "moderate", fill: "bg-warn", text: "text-warn" },
  low: { word: "low", fill: "bg-alert", text: "text-alert" },
};

/**
 * Which band a normalized confidence falls in. Exported so a row that tints
 * itself (e.g. ClaimsTable holding back sub-0.70 rows) reads the same
 * thresholds instead of re-stating them.
 */
export function confidenceBand(value: number): ConfidenceBand {
  if (value >= HIGH_FLOOR) return "high";
  if (value >= MODERATE_FLOOR) return "moderate";
  return "low";
}

export interface ConfidenceMeterProps {
  /**
   * Confidence in [0, 1] — already normalized upstream. Rendered as a
   * percentage; never divided again here.
   */
  value: number;
  /**
   * What the number measures, e.g. "extraction confidence" or "match
   * confidence". Reads after the band word: "96% high extraction confidence".
   */
  caption?: string;
}

export default function ConfidenceMeter({
  value,
  caption = "confidence",
}: ConfidenceMeterProps) {
  // The system says what it does not know: an absent or unusable number is
  // named, not drawn as an empty bar the reader would take for zero.
  if (!Number.isFinite(value)) {
    return (
      <span className="inline-flex items-center gap-2">
        <Track />
        <span className="text-caption text-ink-3">{caption} not recorded</span>
      </span>
    );
  }

  const band = BANDS[confidenceBand(value)];
  const percent = Math.round(value * 100);
  // Only the BAR WIDTH is clamped — a value outside 0–1 means a raw DWS
  // number leaked past lib/data, and the printed percentage has to show it.
  const width = Math.min(Math.max(value, 0), 1) * 100;

  return (
    <span className="inline-flex items-center gap-2">
      <Track>
        <span
          className={`block h-full rounded-full ${band.fill}`}
          style={{ width: `${width}%` }}
        />
      </Track>
      <span className={`tabular text-caption font-medium ${band.text}`}>
        {percent}%
      </span>
      <span className="text-caption text-ink-3">
        {band.word} {caption}
      </span>
    </span>
  );
}

/** The 44px rail. w-11 is exactly 44px on the default 4px spacing step. */
function Track({ children }: { children?: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="block h-1 w-11 shrink-0 overflow-hidden rounded-full bg-line"
    >
      {children}
    </span>
  );
}
