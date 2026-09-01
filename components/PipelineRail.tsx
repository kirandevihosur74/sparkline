/**
 * PipelineRail — DESIGN_SYSTEM.md item 7.
 *
 * The stage list of one analysis run: per stage its state, the PROVIDER NAME
 * next to the output that provider produced, and the elapsed time. Screen 2
 * shows it in full while the run is in flight; screen 3 collapses it to a
 * single summary line once the run is over — same component, `collapsed`.
 *
 * Border discipline: the per-stage LEFT RULE is one of the two left rules the
 * design system explicitly allows, because it encodes PROGRESS, not state —
 * transparent while pending, `ink` while running, `accent` once done, `alert`
 * when the stage failed. It stays 1px like every other border in the system;
 * the reading comes from its colour, and the state is spelled out in words
 * beside it as well, so colour never carries the meaning alone.
 *
 * Shadow discipline: nothing here carries `shadow-action`. On the degraded
 * screen the single action shadow belongs to ErrorPanel's primary fix; on the
 * completed screen it belongs to whatever moves the reviewer into the queue.
 *
 * TODO(schema-gap: pipeline): `PipelineStage` is a FIXTURE-ONLY view-model.
 * The backend models only the artifacts a run produces (ExtractedClaim, Flag,
 * TrustScore, ReviewRecord) and nothing about the run itself — there is no
 * Run, no Stage, no per-stage timing and no provider attribution, so every
 * value this component renders comes from lib/data/fixtures.ts. See the full
 * statement of the gap on PipelineStage in lib/data/types.ts.
 *
 * Server component — renders props, holds no state.
 */

import type { PipelineStage, StageState } from "@/lib/data";

/**
 * Progress tone per stage state. Copy and colour are design-system concerns so
 * they live here; the state itself always comes off the stage. Keyed as a total
 * Record, so a new StageState fails the build instead of rendering an unruled,
 * unlabelled row.
 *
 * `rule` is the left progress rule. `skipped` is not one of the four states the
 * design system names — a skipped stage made no progress, so it reads like
 * pending: no rule, neutral text.
 */
const STATE: Record<
  StageState,
  { label: string; rule: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    rule: "border-l-transparent",
    text: "text-ink-3",
    dot: "bg-line-strong",
  },
  running: {
    label: "Running",
    rule: "border-l-ink",
    text: "text-ink",
    dot: "bg-ink",
  },
  done: {
    label: "Done",
    rule: "border-l-accent",
    text: "text-accent",
    dot: "bg-accent",
  },
  failed: {
    label: "Failed",
    rule: "border-l-alert",
    text: "text-alert",
    dot: "bg-alert",
  },
  skipped: {
    label: "Skipped",
    rule: "border-l-transparent",
    text: "text-ink-3",
    dot: "bg-line-strong",
  },
};

/** States that mean the stage is over, whatever the outcome. */
const SETTLED: StageState[] = ["done", "failed", "skipped"];

export interface PipelineRailProps {
  /** The run's stages, in run order. */
  stages: PipelineStage[];
  /**
   * Collapse to a single summary line. Screen 3 sets this once the run is
   * over: the rail has said what it had to say, and the findings below it are
   * what the reviewer came for.
   */
  collapsed?: boolean;
  /** Accessible name for the region, e.g. "Analysis pipeline". */
  label?: string;
}

export default function PipelineRail({
  stages,
  collapsed = false,
  label = "Analysis pipeline",
}: PipelineRailProps) {
  // The system says what it does not know: an empty rail is named, not drawn
  // as a finished run with nothing in it.
  if (stages.length === 0) {
    return (
      <section
        aria-label={label}
        className="rounded border border-line bg-surface px-4 py-3"
      >
        <p className="text-caption text-ink-3">
          No stages were recorded for this run — there is nothing to show about
          how it ran.
        </p>
      </section>
    );
  }

  if (collapsed) {
    return <SummaryLine stages={stages} label={label} />;
  }

  return (
    <section aria-label={label} className="rounded border border-line bg-surface">
      <ol className="flex flex-col">
        {stages.map((stage) => (
          <StageRow key={stage.id} stage={stage} />
        ))}
      </ol>
    </section>
  );
}

/**
 * One stage. The left rule is the progress mark; the state word beside the
 * label is what actually carries the meaning.
 */
function StageRow({ stage }: { stage: PipelineStage }) {
  const tone = STATE[stage.state];
  const metric = metricLabel(stage);

  return (
    <li
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-b border-l border-line-soft px-4 py-3 last:border-b-0 ${tone.rule}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-label font-medium text-ink">{stage.label}</span>
          <span className={`flex items-center gap-1.5 text-micro uppercase ${tone.text}`}>
            {/* The only non-text mark in the system: a 5px status dot. */}
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${tone.dot}`}
            />
            <span className="font-medium">{tone.label}</span>
          </span>
          {/* Machine code sits on the row; the prose belongs to ErrorPanel. */}
          {stage.failure ? (
            <span className="shrink-0 rounded-sm border border-alert-line bg-alert-soft px-1.5 py-0.5 font-mono text-micro text-alert">
              {stage.failure.code}
            </span>
          ) : null}
        </div>

        {/* Provider name next to its output — attribution without a legend. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-2">
          {metric ? (
            <>
              <span className="tabular">{metric}</span>
              <span aria-hidden="true" className="text-ink-3">
                ·
              </span>
            </>
          ) : null}
          <span className="text-ink-3">{stage.provider}</span>
        </p>
      </div>

      <span className="tabular shrink-0 text-caption text-ink-3">
        {elapsedLabel(stage)}
      </span>
    </li>
  );
}

/**
 * The collapsed variant: one line that says how the run went, how much of it
 * finished, how long it took and who did the work. Failures name the
 * CONSEQUENCE before the cause — a run with a failed stage says the stage did
 * not finish before it says which one refused.
 */
function SummaryLine({
  stages,
  label,
}: {
  stages: PipelineStage[];
  label: string;
}) {
  const failed = stages.filter((stage) => stage.state === "failed");
  const done = stages.filter((stage) => stage.state === "done");
  const settled = stages.filter((stage) => SETTLED.includes(stage.state));
  const running = stages.filter((stage) => stage.state === "running");
  const unfinished = stages.length - done.length;

  const tone =
    failed.length > 0
      ? STATE.failed
      : settled.length < stages.length
        ? STATE.running
        : STATE.done;

  // Failures name the CONSEQUENCE before the cause: what the run did not
  // finish comes first, which stage refused comes second.
  const headline =
    failed.length > 0
      ? `${stagesLabel(unfinished)} did not complete — ${listOf(failed.map((stage) => stage.label))} failed`
      : settled.length < stages.length
        ? running.length > 0
          ? `Analysis running — ${listOf(running.map((stage) => stage.label))} in progress`
          : "Analysis queued"
        : "Analysis complete";

  // Providers in run order, each named once however many stages it ran.
  const providers = stages
    .map((stage) => stage.provider)
    .filter((provider, index, all) => all.indexOf(provider) === index);

  return (
    <section
      aria-label={label}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded border border-l border-line px-4 py-2.5 ${tone.rule}`}
    >
      <span className={`flex items-center gap-1.5 ${tone.text}`}>
        <span
          aria-hidden="true"
          className={`size-[5px] shrink-0 rounded-full ${tone.dot}`}
        />
        <span className="text-label font-medium">{headline}</span>
      </span>

      <span className="tabular text-caption text-ink-2">
        {done.length} of {stagesLabel(stages.length)} completed ·{" "}
        {totalElapsedLabel(stages)}
      </span>

      <span className="text-caption text-ink-3">{providers.join(" · ")}</span>
    </section>
  );
}

/**
 * A duration a reader can hold in their head: milliseconds under a second,
 * one decimal of seconds under a minute, then m:ss. Deterministic — no locale
 * is consulted, so the server and client passes always agree.
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "not recorded";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Elapsed time, or what is known instead of it. */
function elapsedLabel(stage: PipelineStage): string {
  if (stage.durationMs !== undefined) return formatDurationMs(stage.durationMs);
  if (stage.state === "pending") return "not started";
  if (stage.state === "running") return "in progress";
  // The system says what it does not know.
  return "duration not recorded";
}

/** Whole-run elapsed time, summed from the stages that recorded one. */
function totalElapsedLabel(stages: PipelineStage[]): string {
  const timed = stages.filter((stage) => stage.durationMs !== undefined);
  if (timed.length === 0) return "no timings recorded";
  const total = timed.reduce((sum, stage) => sum + (stage.durationMs ?? 0), 0);
  const label = formatDurationMs(total);
  // Partial timings are named as partial rather than passed off as the total.
  return timed.length === stages.length ? label : `${label} of timed stages`;
}

/**
 * The stage's counter, e.g. "12 claims". A stage that has not run yet has no
 * counter to be missing, so nothing is rendered; a stage that is OVER without
 * one is named as missing, because that is something the run failed to record.
 */
function metricLabel(stage: PipelineStage): string | undefined {
  if (stage.metric) return `${stage.metric.value} ${stage.metric.unit}`;
  return SETTLED.includes(stage.state) ? "no counter recorded" : undefined;
}

function stagesLabel(count: number): string {
  return `${count} ${count === 1 ? "stage" : "stages"}`;
}

/** "Live check" · "Compare and Live check" · "A, B and C". */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
