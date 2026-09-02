"use client";

/**
 * AnalysisRunPanel — STATE 2 of `/reviews/[id]`: the run in flight.
 *
 * DESIGN_SYSTEM.md screen 2, composed from the three components that were
 * built for it and not re-implemented here: FunnelCounters (item 8) across the
 * top, PipelineRail (item 7) and ReasoningStream (item 9) beneath. This file
 * is layout, headings and honesty copy — every number on it comes off the
 * stages and events it is handed.
 *
 * WHAT THIS SCREEN IS FOR. The funnel says how much came out of each stage,
 * the rail says which provider is doing what and how long it took, and the
 * stream says what the run DECIDED. Together they are the argument that the
 * trust score on the next state is not a number someone typed in.
 *
 * Layout: the page never scrolls (theme.css pins html/body) — this column
 * scrolls inside a min-h-0 flex parent, and the footer is pinned so the one
 * action stays on screen however tall the run gets.
 *
 * Shadow discipline: exactly one element carries `shadow-action` — "Skip to
 * results", which is the only thing to do while the run is running. Nothing
 * else on this state has a shadow.
 *
 * TODO(schema-gap: pipeline): the stages and events rendered here are
 * FIXTURE-ONLY view-models — the backend has no Run entity, so there is no
 * live run to attach to and no partial state to read. See the statement of the
 * gap on PipelineStage in lib/data/types.ts.
 */

import FunnelCounters from "./FunnelCounters";
import PipelineRail from "./PipelineRail";
import ReasoningStream from "./ReasoningStream";
import { getComplianceCopy } from "@/lib/data";
import type { PipelineEvent, PipelineStage } from "@/lib/data";

/** States that mean a stage is over, whatever the outcome. */
const SETTLED: PipelineStage["state"][] = ["done", "failed", "skipped"];

export interface AnalysisRunPanelProps {
  reviewTitle: string;
  reviewSubtitle?: string;
  /** The run as it stands right now — projected by AnalysisScreen's clock. */
  stages: PipelineStage[];
  /** The decisions the run has reached so far, oldest first. */
  events: PipelineEvent[];
  /** Ends the replay and shows the completed run. */
  onSkip: () => void;
}

export default function AnalysisRunPanel({
  reviewTitle,
  reviewSubtitle,
  stages,
  events,
  onSkip,
}: AnalysisRunPanelProps) {
  const settled = stages.filter((stage) => SETTLED.includes(stage.state));

  // What the reader is entitled to expect of a run they are waiting on. Copy
  // lives in lib/data with the rest of the compliance sentences — this file
  // authors none of it.
  const { analysisDuration } = getComplianceCopy();

  /**
   * The same stages, adapted to PipelineRail's own rule about counters: a
   * stage that has not run yet "has no counter to be missing", so the rail
   * renders none. FunnelCounters has the opposite need — its box is a number,
   * and it is handed the zero the run has actually counted so far. One run,
   * two components, each shown what it was built to show.
   */
  const railStages = stages.map((stage) =>
    stage.state === "pending" ? { ...stage, metric: undefined } : stage,
  );

  // Providers named once each, in run order — attribution without a legend.
  const providers = stages
    .map((stage) => stage.provider)
    .filter((provider, index, all) => all.indexOf(provider) === index);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* The page never scrolls; this column does. */}
      <div className="scroll-col flex-1 px-8 py-7">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header>
            <p className="text-micro uppercase text-ink-3">Analyzing</p>
            <h1 className="mt-1.5 text-display font-semibold text-ink">
              {reviewTitle}
            </h1>
            {reviewSubtitle ? (
              <p className="mt-2 max-w-2xl text-body text-ink-2">
                {reviewSubtitle}
              </p>
            ) : null}
            <p className="mt-2 text-caption text-ink-3">
              {providers.length > 0
                ? `Running through ${providers.join(" · ")}.`
                : "No provider was recorded for this run."}
            </p>
          </header>

          {/* DESIGN_SYSTEM.md item 8 — counts up while its stage runs. */}
          <FunnelCounters stages={stages} running />

          <div className="grid gap-4 md:grid-cols-2">
            <section
              aria-label="Pipeline stages"
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-label font-medium text-ink">Pipeline</h2>
                <span className="tabular text-caption text-ink-3">
                  {settled.length} of {stagesLabel(stages.length)} finished
                </span>
              </div>
              {/* DESIGN_SYSTEM.md item 7 — provider names and real timings. */}
              <PipelineRail stages={railStages} label="Analysis pipeline" />
            </section>

            <section aria-label="Reasoning" className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-label font-medium text-ink">Reasoning</h2>
                <span className="tabular text-caption text-ink-3">
                  {decisionsLabel(events.length)}
                </span>
              </div>
              <div className="rounded border border-line bg-surface px-4 py-3.5">
                {/* DESIGN_SYSTEM.md item 9 — max 5 visible, oldest drops. */}
                <ReasoningStream events={events} running />
              </div>
              <p className="text-caption text-ink-3">
                One line per decision the run reached. The five most recent are
                on screen; the rest are in the audit trail.
              </p>
              {/* How long this should take, said before anyone has to wonder. */}
              <p className="tabular text-caption text-ink-3">
                {analysisDuration}
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Pinned: the one action stays visible however tall the run gets. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line bg-subtle px-8 py-3.5">
        <div className="min-w-0">
          <p aria-live="polite" className="tabular text-label text-ink-2">
            {settled.length} of {stagesLabel(stages.length)} complete
          </p>
          <p className="mt-0.5 text-caption text-ink-3">
            This replays a recorded run at demo speed — the elapsed time beside
            each finished stage is the one that stage actually took. The
            providers are not called again.
          </p>
        </div>

        {/* The one shadow-action element on this state. */}
        <button
          type="button"
          onClick={onSkip}
          className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
        >
          Skip to results
        </button>
      </footer>
    </section>
  );
}

/** "1 stage" / "3 stages" — counted off the stages the run actually has. */
function stagesLabel(count: number): string {
  return count === 1 ? "1 stage" : `${count} stages`;
}

/** "1 decision" / "7 decisions" — counted off the events actually revealed. */
function decisionsLabel(count: number): string {
  return count === 1 ? "1 decision" : `${count} decisions`;
}
