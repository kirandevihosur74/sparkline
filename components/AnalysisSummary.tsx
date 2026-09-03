"use client";

/**
 * AnalysisSummary — STATE 3 of `/reviews/[id]`: the run, over.
 *
 * DESIGN_SYSTEM.md screen 3. The pipeline COLLAPSES — PipelineRail's own
 * `collapsed` variant, one line saying how the run went — and the findings
 * take the screen. Reading order is the argument this product makes:
 *
 *   1. the collapsed rail — how the run went, and whether it finished;
 *   2. ErrorPanel, when a stage failed, standing IN PLACE of the results that
 *      stage never produced, so the failure is read before the score it bent;
 *   3. TrustScorePanel — the score FIRST, then the literal counts that produced
 *      it, then the coverage bar it composes beneath them. On a run that
 *      recorded no score there is NO DIAL: the panel names the absence and the
 *      two component bars carry what the run does know;
 *   4. WHAT CHANGED since the run this one re-ran — new, resolved, changed,
 *      unchanged — read straight off the derived diff;
 *   5. the findings themselves.
 *
 * Score first, then the counts, then the findings. A number the reviewer has to
 * take on faith is exactly what this screen exists to avoid — and a number the
 * components beneath it do not add up to would be the same fault twice.
 *
 * Every component here already exists and is composed, never rebuilt:
 * PipelineRail (item 7), ErrorPanel (item 14), TrustScorePanel (which itself
 * composes CoverageBar, item 13) and FindingCard (item 3).
 *
 * Shadow discipline: exactly one element carries `shadow-action` — "Open
 * findings queue", the way into the review screen. ErrorPanel is therefore
 * passed `dominant={false}`: its own primary fix cannot start anything in this
 * build (there is no Run to re-run), and an inert button must not wear the
 * screen's one action shadow. "Replay analysis" is a secondary control and has
 * no shadow.
 *
 * WHEN THIS RUN LAST FINISHED, AND WHAT MOVED SINCE THE ONE BEFORE IT.
 *
 * Both come from `getRunHistory()`, resolved from the route id — this screen
 * titles itself, so ContextBar deliberately does NOT put ProjectBar (and its
 * "Last analyzed" line) above it; widening that rule would make every
 * workspace page claim a project. See the note in ContextBar.tsx.
 *
 * The instant is ABSOLUTE UTC through `formatUtc`, never "N minutes ago": the
 * fixtures are fixed in time, so an elapsed figure would be false, and one
 * computed at render differs between the server pass and the client pass.
 *
 * The change line is `RunDiff`, every count of which is COUNTED by comparing
 * the two runs' finding sets on each call — nothing in the strip is authored
 * here, including the sentence, which the data layer assembles from those same
 * counts. A run with no predecessor gets NO strip of numbers: "0 new · 0
 * resolved" would report a comparison nobody ran, so it says that instead. A
 * run the fixture registry does not hold (a live run, whose history exists
 * only on the server that produced it) gets nothing at all, rather than the
 * demo run's history under its name.
 *
 * TODO(schema-gap: pipeline): the stages and the failure record rendered here
 * are FIXTURE-ONLY view-models — the backend has no Run entity, so nothing
 * records that a stage failed, what it returned, or which claims it stranded.
 * See the statement of the gap on PipelineStage in lib/data/types.ts.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ErrorPanel, { type StageFailure } from "./ErrorPanel";
import FindingCard from "./FindingCard";
import PipelineRail from "./PipelineRail";
import TrustScorePanel from "./TrustScoreDial";
import { getRunHistory } from "@/lib/data";
import type {
  CoverageBreakdown,
  ExtractedClaim,
  Finding,
  PipelineStage,
  RunHistory,
  TrustFormula,
  TrustScoreBreakdown,
} from "@/lib/data";
import { formatUtc } from "@/lib/format";

export interface AnalysisSummaryProps {
  reviewTitle: string;
  reviewSubtitle?: string;
  /** Claims extracted — the denominator behind the findings count. */
  claimCount: number;
  /** The recorded run, in run order. Rendered collapsed. */
  stages: PipelineStage[];
  /** Queue order, flags first by materiality — never re-sorted here. */
  findings: Finding[];
  /** Derived from those same findings, so the counts cannot drift. */
  coverage: CoverageBreakdown;
  /**
   * The two components, and the dial only when this run recorded a score —
   * `TrustScoreBreakdown` is discriminated, so a run without one cannot
   * accidentally render a dial.
   */
  breakdown: TrustScoreBreakdown;
  /** Resolves the claim ids a failed stage stranded, for ErrorPanel. */
  claims: ExtractedClaim[];
  /** From `getTrustFormula(reviewId)`, resolved on the server — see AnalysisScreen. */
  formula?: TrustFormula;
  /** This run's review workspace. */
  reviewHref: string;
  /** Puts the run back into its analyzing state. */
  onReplay: () => void;
}

export default function AnalysisSummary({
  reviewTitle,
  reviewSubtitle,
  claimCount,
  stages,
  findings,
  coverage,
  breakdown,
  claims,
  reviewHref,
  formula,
  onReplay,
}: AnalysisSummaryProps) {
  const router = useRouter();
  // The run's own history, resolved from the route this screen is mounted on.
  // Every value below it is read off `lib/data`, never off this component.
  const history = runHistoryForPath(usePathname());
  const lastAnalyzed = lastAnalyzedLine(history);
  const diff = history?.diff;

  const failedStages = stages.filter((stage) => stage.state === "failed");
  // A stage can be recorded as failed without a failure record; the panel
  // needs the record, and the screen says so rather than rendering nothing.
  const reported = failedStages
    .map((stage) =>
      stage.failure === undefined ? undefined : { stage, failure: stage.failure },
    )
    .filter(
      (item): item is { stage: PipelineStage; failure: StageFailure } =>
        item !== undefined,
    );
  const unreported = failedStages.length - reported.length;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* The page never scrolls; this column does. */}
      <div className="scroll-col flex-1 px-8 py-7">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header>
            <p className="text-micro uppercase text-ink-3">
              {failedStages.length === 0
                ? "Analysis complete"
                : `Analysis complete · ${stagesLabel(failedStages.length)} failed`}
            </p>
            <h1 className="mt-1.5 text-display font-semibold text-ink">
              {reviewTitle}
            </h1>
            {reviewSubtitle ? (
              <p className="mt-2 max-w-2xl text-body text-ink-2">
                {reviewSubtitle}
              </p>
            ) : null}
            {/* WHEN, absolutely. This screen titles itself, so it carries its
                own last-analyzed line rather than borrowing ProjectBar — see
                the note in ContextBar.tsx. */}
            {lastAnalyzed !== undefined && history !== undefined ? (
              <p className="tabular mt-2 text-caption text-ink-3">
                {lastAnalyzed} · {history.text}
              </p>
            ) : null}
          </header>

          {/* ── 1 · the pipeline, collapsed to what it has left to say ──── */}
          <PipelineRail stages={stages} collapsed label="Analysis pipeline" />

          {/* ── 2 · what a failed stage did not produce ─────────────────── */}
          {reported.map(({ stage, failure }) => (
            <section
              key={stage.id}
              aria-label={`${stage.label} — failed`}
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-label font-medium text-ink">
                  {stage.label}
                </h2>
                <span className="text-caption text-ink-3">
                  No results — {stage.provider} did not complete this stage
                </span>
              </div>
              <ErrorPanel
                failure={failure}
                affectedClaims={claims}
                stageLabel={stage.label}
                provider={stage.provider}
                /* The screen's one action shadow belongs to the review queue,
                   and re-running cannot be wired up against fixtures. */
                dominant={false}
              />
            </section>
          ))}

          {unreported > 0 ? (
            /* The system says what it does not know. */
            <p className="text-caption text-ink-3">
              {stagesLabel(unreported)} failed without recording what went
              wrong — there is nothing to show about the cause.
            </p>
          ) : null}

          {/* ── 3 · the score, then the counts that produced it ─────────── */}
          <TrustScorePanel breakdown={breakdown} coverage={coverage} formula={formula} />

          {/* ── 4 · what moved since the run this one re-ran ─────────────
              Its own bordered strip, so the trust layout above it — dial,
              its two bars, the context line, the coverage bar — is untouched.
              No shadow: this screen's one action shadow is the footer link. */}
          {history !== undefined ? (
            <section
              aria-label="Change since the previous run"
              className="rounded border border-line bg-subtle px-4 py-3"
            >
              {diff === undefined ? (
                /* The system says what it does not know. A first run has
                   nothing to be compared against, and "0 new · 0 resolved"
                   would report a comparison that never happened. */
                <p className="text-body text-ink-3">{NO_PREVIOUS_RUN}</p>
              ) : (
                <>
                  <p className="tabular text-label text-ink-2">
                    {history.previous !== undefined ? (
                      <span className="text-ink-3">
                        {COMPARED_WITH} {history.previous.label} —{" "}
                      </span>
                    ) : null}
                    <span className="font-medium text-ink">{diff.text}</span>
                  </p>
                  {/* The arithmetic a reader can run themselves, and the one
                      word in that line that could be misread: resolved between
                      runs is not signed off by anybody. */}
                  <p className="tabular mt-1.5 text-caption text-ink-3">
                    {findingsLabel(diff.currentFindingCount)} this run,{" "}
                    {diff.previousFindingCount} on the previous one.{" "}
                    {RESOLVED_MEANS}
                  </p>
                </>
              )}
            </section>
          ) : null}

          {/* ── 5 · the findings ────────────────────────────────────────── */}
          <section aria-label="Findings" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-title font-medium text-ink">Findings</h2>
              <p className="tabular text-caption text-ink-3">
                {findingsLabel(coverage.total)} from {claimsLabel(claimCount)} ·{" "}
                {coverage.open} open · {coverage.approved} approved ·{" "}
                {coverage.rejected} rejected
              </p>
            </div>

            {findings.length === 0 ? (
              /* The system says what it does not know. */
              <p className="text-body text-ink-3">
                There is nothing to review: this run produced no findings.
              </p>
            ) : (
              <>
                <ul className="grid gap-2 md:grid-cols-2">
                  {findings.map((finding) => (
                    <li key={finding.id} className="min-w-0">
                      <FindingCard
                        finding={finding}
                        onSelect={() => router.push(reviewHref)}
                      />
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-ink-3">
                  Opening a finding takes you to the review queue, where its
                  evidence, its source document and the decision live.
                </p>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Pinned: the way into the review never scrolls off. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line bg-subtle px-8 py-3.5">
        <div className="min-w-0">
          <p className="tabular text-label text-ink-2">
            {/* The footer repeats the panel's own reading — including its
                absence. It never fills the gap with a number of its own. */}
            {breakdown.unavailable === undefined
              ? `Trust score ${breakdown.blendedRaw} of 100`
              : breakdown.unavailable.headline}{" "}
            · {coverage.open} of {findingsLabel(coverage.total)} still open
          </p>
          <p className="mt-0.5 text-caption text-ink-3">
            This build replays a recorded run — Nutrient DWS and SerpApi are not
            called again.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-ink hover:bg-subtle focus-visible:shadow-selected focus-visible:outline-none"
          >
            Replay analysis
          </button>

          {/* The one shadow-action element on this state. */}
          <Link
            href={reviewHref}
            className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
          >
            Open findings queue
          </Link>
        </div>
      </footer>
    </section>
  );
}

/**
 * `/reviews/{id}` — the route this screen is mounted on, and the only place
 * the run's id is available to it. Anything else on that shape (an extra
 * segment) is a different screen and gets nothing.
 */
const REVIEWS_SEGMENT = "reviews";

/** The lead-in to the diff: "Compared with Run 1 of 2 — 1 new · …". */
const COMPARED_WITH = "Compared with";

/**
 * Said in place of the numbers, never alongside them: a run with no
 * predecessor has not been compared with anything.
 */
const NO_PREVIOUS_RUN =
  "This is the only recorded run of this bundle \u2014 there is no previous run to compare it against.";

/**
 * The distinction the count above cannot carry on its own. A finding resolved
 * between runs was decided by NOBODY: the re-run simply stopped reporting it.
 * A signed decision is a different event, with a name on it, and lives in the
 * ledger. See ResolvedFinding in lib/data/types.ts.
 */
const RESOLVED_MEANS =
  "\u201cResolved\u201d means this run no longer reports the finding \u2014 not that a reviewer signed it.";

/**
 * The run history behind the review this screen is showing, or undefined.
 *
 * Undefined covers two honest cases and invents nothing for either: a path
 * that is not a run's own route, and an id the fixture registry holds no run
 * for — a live run, whose history exists only on the server that produced it.
 * Serving the demo run's history under another id is the failure the data
 * layer exists to prevent, so there is deliberately no fallback id here.
 */
function runHistoryForPath(pathname: string): RunHistory | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== REVIEWS_SEGMENT) return undefined;
  return getRunHistory(decodeSegment(segments[1]));
}

/** A path segment as the data layer spells it; left alone if it is malformed. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * "Last analyzed 31 Aug 2026, 04:47 UTC" — ABSOLUTE, through formatUtc, and
 * never an elapsed time: the fixtures are fixed in time, so "6 days ago" would
 * be false, and one computed at render would differ between the server pass
 * and the client pass.
 *
 * When the run recorded no completion instant, `lastAnalyzedLabel` carries the
 * say-so copy INSTEAD of a label, so this never returns a prefix with nothing
 * after it.
 */
function lastAnalyzedLine(history: RunHistory | undefined): string | undefined {
  if (history === undefined) return undefined;
  const at =
    history.lastAnalyzedAt === undefined
      ? undefined
      : formatUtc(history.lastAnalyzedAt);
  return at === undefined
    ? history.lastAnalyzedLabel
    : `${history.lastAnalyzedLabel} ${at}`;
}

/** "1 stage" / "3 stages" — counted off the stages the run actually has. */
function stagesLabel(count: number): string {
  return count === 1 ? "1 stage" : `${count} stages`;
}

/**
 * "1 finding" / "11 findings". A finding is one verification OUTCOME, not one
 * claim — a cross-document contradiction consumes two claims to produce one —
 * so these are never labelled claims. See CoverageBreakdown in
 * lib/data/types.ts.
 */
function findingsLabel(count: number): string {
  return count === 1 ? "1 finding" : `${count} findings`;
}

/** "1 claim" / "12 claims" — the bundle the findings were drawn from. */
function claimsLabel(count: number): string {
  return count === 1 ? "1 claim" : `${count} claims`;
}
