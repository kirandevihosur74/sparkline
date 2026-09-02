/**
 * The trust panel for screen 3 (`/reviews/[id]`, complete) — and the dial
 * inside it.
 *
 * TWO EXPORTS, AND THE SPLIT IS THE POINT. `TrustScorePanel` (default) takes
 * the discriminated `TrustScoreBreakdown` and decides what stands at the head
 * of the panel; `TrustScoreDial` takes a `ScoredTrustBreakdown` and therefore
 * CANNOT be rendered without a score. There is no code path on which a dial
 * shows a number its own bars do not support: a run that recorded no blend
 * hands the panel `unavailable`, and the panel renders that copy in the dial's
 * place.
 *
 * THE DIAL NEVER APPEARS ALONE. A single blended number with no visible parts
 * is a number the reviewer has to take on faith, so this component renders the
 * whole argument in one block, in the order the reviewer reads it:
 *
 *   1. the dial and its two component bars, SIDE BY SIDE — score first, then
 *      the literal counts that produced it;
 *   2. beneath them, the FORMULA strip — the sentence the run recorded plus
 *      the arithmetic it describes, in monospace, so "how is that calculated"
 *      is answered where the number is, not somewhere else on the page;
 *   3. beneath that, the plain context line — the facts that are COUNTED and
 *      deliberately NOT blended into the number;
 *   4. beneath that, CoverageBar (DESIGN_SYSTEM.md item 13, already built —
 *      composed here, never re-implemented).
 *
 * The formula strip is scored-runs-only. `getTrustFormula()` returns nothing
 * for a run that recorded no blend, and the discriminated breakdown has already
 * removed the dial there — a run with no score has no arithmetic to explain,
 * and writing one would be the invented number the unscored path exists to
 * avoid.
 *
 * There are exactly TWO bars because the backend blends exactly two fields
 * (`TrustScore.extraction` and `TrustScore.crossReference`). Live verification
 * and human sign-off are real counts that the backend never folds into the
 * score, so they are reported as a sentence rather than drawn as bars that
 * appear to move the dial and do not. See TrustScoreBreakdown in
 * lib/data/types.ts for the full statement; both shapes are derived by
 * `getTrustBreakdown()` and nothing here recomputes them.
 *
 * The arc is hand-rolled inline SVG — no chart library. Colour never carries
 * meaning alone: the dial prints its percentage in tabular numerals and names
 * its band in words, every bar prints its own percentage and band word, and
 * the SVG itself is aria-hidden.
 *
 * Every number arrives ALREADY NORMALIZED 0–1 (`normalizeConfidence` runs once,
 * at the data-layer boundary). This file renders percentages and NEVER
 * re-normalizes.
 *
 * Degrading honestly: on the degraded run there is NO score — the external
 * check never ran, so there is not enough evidence to blend one — one bar reads
 * HIGHER than it should because the check that would have pulled it down never
 * ran, and the context counts can be zero. All three are rendered as what they
 * are: the absence named in plain type where the dial would be (never an empty
 * arc, a zero, or an error state — ErrorPanel above already carries the
 * failure), `scoreDistortion` on the face of the bar it distorts, and counted
 * zeros with the outstanding work named.
 *
 * Server component — renders props, holds no state.
 */

import { Fragment } from "react";
import CoverageBar from "./CoverageBar";
import { confidenceBand, type ConfidenceBand } from "./ConfidenceMeter";
import { getTrustFormula } from "@/lib/data";
import type {
  CoverageBreakdown,
  ScoredTrustBreakdown,
  TrustComponentCount,
  TrustDistortionNote,
  TrustFormula,
  TrustScoreBreakdown,
  TrustScoreComponent,
  TrustScoreUnavailable,
} from "@/lib/data";

/**
 * Tone per confidence band.
 *
 * The THRESHOLDS are not restated here — `confidenceBand` is imported from
 * ConfidenceMeter so the dial, the bars and every meter in the app cut the
 * scale in the same place. Only the tone classes are local, because
 * ConfidenceMeter's map is module-private and this file must not edit a
 * component another task owns.
 */
const TONE: Record<
  ConfidenceBand,
  { word: string; fill: string; text: string; stroke: string }
> = {
  high: {
    word: "high",
    fill: "bg-accent",
    text: "text-accent",
    stroke: "stroke-accent",
  },
  moderate: {
    word: "moderate",
    fill: "bg-warn",
    text: "text-warn",
    stroke: "stroke-warn",
  },
  low: { word: "low", fill: "bg-alert", text: "text-alert", stroke: "stroke-alert" },
};

// ── Dial geometry ──────────────────────────────────────────────────────────
// SVG user units inside a fixed viewBox — geometry, not design tokens. The
// rendered size comes from the utility class on the <svg>.
const VIEWBOX = 120;
const CENTER = VIEWBOX / 2;
const RADIUS = 48;
const STROKE = 10;
/** Open-bottom gauge: 270° of sweep, starting at the 7-o'clock position. */
const START_ANGLE = -135;
const SWEEP = 270;

export interface TrustScorePanelProps {
  /**
   * From `getTrustBreakdown()` — the parts the score is made of, and the score
   * itself only when the run recorded one.
   */
  breakdown: TrustScoreBreakdown;
  /**
   * From `getCoverage()`. Optional only so the panel can render before a run
   * has findings; when it is present the coverage bar sits beneath the score,
   * which is where the layout expects it.
   */
  coverage?: CoverageBreakdown;
  /**
   * The run this panel is reporting on. Passed straight to `getTrustFormula()`
   * when `formula` is not supplied; omitted, the data layer's own default run
   * answers — the id is never written down in this component.
   */
  reviewId?: string;
  /**
   * From `getTrustFormula()` — the recorded sentence and the arithmetic
   * COMPUTED from the same two component values the bars render, so the strip
   * cannot disagree with them. Optional: a caller that has already resolved it
   * passes it, and anything else lets this component resolve it.
   */
  formula?: TrustFormula;
  /** Names the panel for assistive technology and heads the dial. */
  label?: string;
}

export default function TrustScorePanel({
  breakdown,
  coverage,
  reviewId,
  formula,
  label = "Trust score",
}: TrustScorePanelProps) {
  const { components, context, scoreDistortion } = breakdown;

  // Everything the context section reports that is still open.
  const outstanding = context
    .map((fact) => fact.outstanding)
    .filter((item): item is TrustComponentCount => item !== undefined);
  const nothingCounted = context.every((fact) => fact.value === 0);
  const unavailable = breakdown.unavailable;

  // Scored runs only, and the type says so: an unscored breakdown has no dial
  // above the strip and no blend for the strip to explain.
  const blend =
    breakdown.unavailable === undefined
      ? (formula ?? getTrustFormula(reviewId))
      : undefined;

  return (
    <section
      aria-label={label}
      className="flex flex-col rounded border border-line bg-surface"
    >
      {/* ── The score (or its absence) and the components it is made of ── */}
      <div
        className={
          unavailable
            ? "flex flex-col gap-5 px-5 py-5"
            : "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-6 gap-y-5 px-5 py-5"
        }
      >
        {breakdown.unavailable === undefined ? (
          <TrustScoreDial breakdown={breakdown} label={label} />
        ) : (
          <ScoreUnavailable notice={breakdown.unavailable} />
        )}

        <div className="flex min-w-0 flex-col gap-5">
          {components.map((component) => (
            <ComponentBar
              key={component.id}
              component={component}
              // The note rides the bar it distorts, not the panel at large.
              distortion={
                scoreDistortion?.componentId === component.id
                  ? scoreDistortion
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* ── How the number was reached — the sentence, then the sum ────── */}
      {blend ? (
        <div className="flex flex-col gap-1.5 border-t border-line px-5 py-3.5">
          <span className="text-micro text-ink-3 uppercase">Formula</span>
          <p className="text-caption text-ink-2">{blend.sentence}</p>
          {/* Monospace because it is arithmetic being checked, not prose being
              read — the operands line up under the percentages above. */}
          <p className="tabular font-mono text-caption text-ink">
            {blend.arithmetic}
          </p>
        </div>
      ) : null}

      {/* ── The plain context line — counted, never blended ─────────────── */}
      <div className="flex flex-col gap-1.5 border-t border-line px-5 py-3.5">
        <span className="text-micro text-ink-3 uppercase">
          Counted, not scored
        </span>

        <p className="tabular flex flex-wrap items-center gap-x-2 gap-y-1.5 text-caption text-ink-2">
          {context.map((fact, index) => (
            <Fragment key={fact.id}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-ink-3">
                  ·
                </span>
              ) : null}
              <span>
                {fact.value} {fact.label}
              </span>
              {/* Provider names sit next to their own output, not in a legend. */}
              <ProviderTag provider={fact.provider} />
            </Fragment>
          ))}
        </p>

        {outstanding.length > 0 ? (
          <p className="tabular text-caption text-ink-3">
            Outstanding:{" "}
            {outstanding.map((item) => `${item.value} ${item.unit}`).join(" · ")}
          </p>
        ) : null}

        {nothingCounted ? (
          <p className="text-caption text-ink-3">
            {unavailable
              ? "Nothing here has been counted yet — this run reached no live source and no reviewer."
              : "Nothing here has been counted yet — the score above rests on its two components alone."}
          </p>
        ) : null}

        <p className="text-caption text-ink-3">
          {unavailable
            ? "These are reported, not blended: they are counts, and nothing here stands in for the missing score."
            : "These are reported, not blended: neither figure moves the dial."}
        </p>
      </div>

      {/* ── Coverage — DESIGN_SYSTEM.md item 13, composed not rebuilt ──── */}
      {coverage ? (
        <div className="border-t border-line px-5 py-4">
          <CoverageBar
            breakdown={coverage}
            label="Verification coverage"
            showStatus
          />
        </div>
      ) : null}
    </section>
  );
}

export interface TrustScoreDialProps {
  /**
   * A run that RECORDED A SCORE. The type is the guarantee: `blended` and
   * `blendedRaw` are required on ScoredTrustBreakdown, so this component has no
   * "no score" branch to get wrong and no number to invent.
   */
  breakdown: ScoredTrustBreakdown;
  /** Heads the dial; the panel passes its own label straight through. */
  label?: string;
}

/**
 * The dial: the arc, the percentage, the band word, and the one line that says
 * where the number came from. Only ever rendered for a run that has one.
 */
export function TrustScoreDial({
  breakdown,
  label = "Trust score",
}: TrustScoreDialProps) {
  const { blended, blendedRaw } = breakdown;
  const band = TONE[confidenceBand(blended)];

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative size-28 shrink-0">
        <Arc value={blended} stroke={band.stroke} />
        {/* Held inside the ring, not across it: at full width the longest
            band word ("moderate trust") ran under the arc stroke and its
            first letter disappeared into the same-coloured fill. The inset
            is the stroke plus a hair, so the label wraps within the open
            disc instead of colliding with the arc. */}
        <div className="absolute inset-3 flex flex-col items-center justify-center gap-0.5 text-center">
          <span className="tabular text-display font-semibold text-ink">
            {formatPercent(blended)}
          </span>
          {/* Colour never carries meaning alone. */}
          <span className={`text-micro font-medium uppercase ${band.text}`}>
            {band.word} trust
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <h2 className="text-label font-medium text-ink">{label}</h2>
        <p className="tabular text-caption text-ink-3">
          {blendedRaw} of 100 · blended from the two components beside it
        </p>
      </div>
    </div>
  );
}

/**
 * What stands where the dial would be on a run that produced no score.
 *
 * Typographic and quiet on purpose: this is an honest absence, not a failure.
 * The failure itself is ErrorPanel's, directly above on the same screen, and
 * repeating it in alert tone here would say the number is broken rather than
 * that there is no number to show. Both strings come off the breakdown — the
 * component authors no copy about what a run does or does not know.
 */
function ScoreUnavailable({ notice }: { notice: TrustScoreUnavailable }) {
  return (
    <div className="flex max-w-xl flex-col gap-1.5">
      <h2 className="text-title font-medium text-ink">{notice.headline}</h2>
      <p className="text-body text-ink-2">{notice.reason}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/**
 * One component of the blend: label, percentage, band word, bar, the sentence
 * that says what produced it, and the literal counts it was computed from — so
 * "how is that calculated" is answered without anyone having to ask.
 */
function ComponentBar({
  component,
  distortion,
}: {
  component: TrustScoreComponent;
  distortion?: TrustDistortionNote;
}) {
  const usable = Number.isFinite(component.value);
  const tone = TONE[confidenceBand(usable ? component.value : 0)];
  // Only the WIDTH is clamped — a value outside 0–1 means a raw 0–100 number
  // leaked past lib/data, and the printed percentage has to show it.
  const width = Math.min(Math.max(component.value, 0), 1) * 100;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-label font-medium text-ink">
          {component.label}
        </span>
        {usable ? (
          <span className="flex items-baseline gap-1.5">
            <span className={`tabular text-label font-medium ${tone.text}`}>
              {formatPercent(component.value)}
            </span>
            <span className="text-caption text-ink-3">{tone.word}</span>
          </span>
        ) : (
          <span className="text-caption text-ink-3">not recorded</span>
        )}
      </div>

      {/* Track token is `line`, the same one ConfidenceMeter's bar and the
          dial's own arc track use — `line-soft` is the internal-divider grey
          and against `surface` it drops to 1.05:1 on the dark ground, leaving
          the fill floating with no track behind it. */}
      <span
        aria-hidden="true"
        className="block h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        {usable ? (
          <span
            className={`block h-full rounded-full ${tone.fill}`}
            style={{ width: `${width}%` }}
          />
        ) : null}
      </span>

      <p className="text-caption text-ink-2">{component.caption}</p>

      {component.counts.length > 0 ? (
        <p className="tabular text-caption text-ink-3">
          {component.counts
            .map((count) => `${count.value} ${count.unit}`)
            .join(" · ")}
        </p>
      ) : null}

      {component.origin === "frontend-derived" ? (
        <p className="text-caption text-ink-3">
          Derived in the interface — the backend stores no field for this.
        </p>
      ) : null}

      {distortion ? <DistortionNote note={distortion} /> : null}
    </div>
  );
}

/**
 * The reading a failed stage pushes the WRONG way, on the face of the bar it
 * distorts. A reviewer looking at the higher number has no other way to know
 * it is flattery, so it cannot wait behind a disclosure here.
 *
 * The full argument (`note.detail`) belongs to ErrorPanel, which has the room
 * for it; this is the sentence and the two readings. Both readings come off
 * the note as numbers, so the copy and the bar cannot disagree. Tone is carried
 * by the label text and the 5px dot — the border is a full 1px box, never a
 * coloured left rule.
 */
function DistortionNote({ note }: { note: TrustDistortionNote }) {
  const points = Math.round(
    Math.abs(note.observedValue - note.comparisonValue) * 100,
  );

  return (
    <div className="mt-0.5 flex flex-col gap-1.5 rounded border border-warn-line bg-warn-soft px-3.5 py-3">
      <p className="flex items-start gap-1.5 text-caption font-medium text-warn">
        <span
          aria-hidden="true"
          className="mt-1.5 size-[5px] shrink-0 rounded-full bg-warn"
        />
        <span className="min-w-0">{note.headline}</span>
      </p>
      <p className="tabular text-caption text-ink-2">
        Reads {formatPercent(note.observedValue)} on this run ·{" "}
        {formatPercent(note.comparisonValue)} on {note.comparisonLabel} —{" "}
        {points} points {note.direction === "up" ? "higher" : "lower"} here.
      </p>
    </div>
  );
}

/** Inline attribution chip: 3px radius, 1px line, no colour. */
function ProviderTag({ provider }: { provider: string }) {
  return (
    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
      {provider}
    </span>
  );
}

/**
 * The arc. Two strokes: the full 270° track, then the portion the score fills.
 * Decorative — the value is printed as text beside it, so this is aria-hidden.
 */
function Arc({ value, stroke }: { value: number; stroke: string }) {
  const filled = Math.min(Math.max(value, 0), 1);
  const end = START_ANGLE + SWEEP * filled;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className="size-full"
    >
      <path
        d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
        fill="none"
        strokeLinecap="round"
        strokeWidth={STROKE}
        className="stroke-line"
      />
      {filled > 0 ? (
        <path
          d={arcPath(START_ANGLE, end)}
          fill="none"
          strokeLinecap="round"
          strokeWidth={STROKE}
          className={stroke}
        />
      ) : null}
    </svg>
  );
}

/** Angle in degrees, clockwise from 12 o'clock, to a point on the dial. */
function pointAt(angleDeg: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.sin(radians),
    y: CENTER - RADIUS * Math.cos(radians),
  };
}

/** `M`/`A` path between two dial angles, drawn clockwise. */
function arcPath(fromDeg: number, toDeg: number): string {
  const from = pointAt(fromDeg);
  const to = pointAt(toDeg);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

/** 0–1 in, percentage out. The value is already normalized; never divide again. */
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
