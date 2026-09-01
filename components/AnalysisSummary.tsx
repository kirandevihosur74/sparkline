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
 *   4. the findings themselves.
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
 * TODO(schema-gap: pipeline): the stages and the failure record rendered here
 * are FIXTURE-ONLY view-models — the backend has no Run entity, so nothing
 * records that a stage failed, what it returned, or which claims it stranded.
 * See the statement of the gap on PipelineStage in lib/data/types.ts.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import ErrorPanel, { type StageFailure } from "./ErrorPanel";
import FindingCard from "./FindingCard";
import PipelineRail from "./PipelineRail";
import TrustScorePanel from "./TrustScoreDial";
import type {
  CoverageBreakdown,
  ExtractedClaim,
  Finding,
  PipelineStage,
  TrustScoreBreakdown,
} from "@/lib/data";

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
  onReplay,
}: AnalysisSummaryProps) {
  const router = useRouter();

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
          <TrustScorePanel breakdown={breakdown} coverage={coverage} />

          {/* ── 4 · the findings ────────────────────────────────────────── */}
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
