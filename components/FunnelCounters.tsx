"use client";

/**
 * FunnelCounters — DESIGN_SYSTEM.md item 8, the top of the analysis screen.
 *
 * Three counting boxes — one per pipeline stage — joined by a connector line
 * that FILLS as each stage completes. While a stage runs its number counts up;
 * once it is done the number is simply its final value.
 *
 * MOTION IS THE POINT AND ALSO THE LIMIT. Per DESIGN_SYSTEM.md, Motion: the
 * funnel counters count up with `requestAnimationFrame` — not a CSS
 * transition, not `setInterval` — and nothing else on this screen animates.
 * The connector fill is driven off the SAME rAF progress as the number beside
 * it, so the line and the figure can never tell different stories.
 *
 * A COMPLETED RUN NEVER ANIMATES ON FIRST PAINT. `running` is the whole
 * switch: false (a finished run rendered fresh, or a reader who asked for
 * reduced motion) seeds every counter at its settled value, so the first frame
 * is already the final one. There is no "replay the run" animation — a number
 * counting up would claim work is happening that finished minutes ago.
 *
 * TODO(schema-gap: pipeline): `PipelineStage` is a FRONTEND-ONLY view-model
 * (lib/data/types.ts) — the backend has no Run, no Stage, no per-stage timing
 * and no provider attribution, so every value rendered here is fixture-backed.
 * When a real Run entity lands this component keeps its props and the fixtures
 * go away.
 *
 * Border discipline: the 1px --color-line box border never changes colour.
 * Stage state is carried by the label text colour. The connector is not a
 * border — like PipelineRail's per-stage rule it encodes PROGRESS, and uses
 * the same palette (transparent pending, ink running, accent done, alert
 * failed).
 *
 * Shadow discipline: nothing here carries shadow-action — that belongs to the
 * single dominant action on the screen.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PipelineStage, StageState } from "@/lib/data";

/**
 * How long a counter takes to run up, in milliseconds.
 *
 * A PRESENTATION duration, deliberately not the stage's real elapsed time:
 * extraction takes 224 seconds in the fixture and a counter ticking for
 * three and a half minutes is not a counter. Real per-stage timing is
 * `PipelineStage.durationMs`, which PipelineRail reports as a number.
 */
const COUNT_MS = 900;

/**
 * Deterministic grouping — a client component formatting in the viewer's
 * locale would disagree with the server pass and hydrate wrong.
 */
const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/**
 * State word and tone per stage state. Keyed as a total Record so a new
 * StageState fails the build instead of rendering an unlabelled box. Colour
 * never carries meaning alone: every box says its state in words.
 */
const STAGE_STATE: Record<StageState, { word: string; text: string }> = {
  pending: { word: "Not started", text: "text-ink-3" },
  running: { word: "Running", text: "text-ink" },
  done: { word: "Done", text: "text-accent" },
  failed: { word: "Failed", text: "text-alert" },
  skipped: { word: "Skipped", text: "text-ink-3" },
};

/**
 * Connector fill tone, mirroring PipelineRail's progress palette exactly:
 * transparent pending, ink running, accent done, alert failed. `null` means
 * the connector stays an empty track — a stage that never ran has no progress
 * to draw.
 */
const CONNECTOR_FILL: Record<StageState, string | null> = {
  pending: null,
  running: "bg-ink",
  done: "bg-accent",
  failed: "bg-alert",
  skipped: null,
};

/** How full the connector leaving a stage is, before animation is applied. */
function connectorFraction(state: StageState, progress: number): number {
  switch (state) {
    case "done":
    case "failed":
      return 1;
    case "running":
      return progress;
    default:
      return 0;
  }
}

/** The only thing the animation needs off a stage: what it is counting to. */
interface CounterPlan {
  id: string;
  state: StageState;
  /** Undefined when the run recorded no metric for this stage. */
  target?: number;
}

export interface FunnelCountersProps {
  /** The run's stages, in run order. Three today; the count is not assumed. */
  stages: PipelineStage[];
  /**
   * Is the run live? True counts the running stage up; false paints every
   * counter at its final value on the first frame and never animates.
   */
  running: boolean;
}

export default function FunnelCounters({
  stages,
  running,
}: FunnelCountersProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animates = running && !reducedMotion;

  /**
   * `signature` is the CONTENT key for `stages`: a parent re-render that hands
   * back an equal-but-new array must not restart a counter mid-run, which is
   * what depending on the array identity would do.
   */
  const signature = stages
    .map((stage) => `${stage.id}:${stage.state}:${stage.metric?.value ?? "-"}`)
    .join("|");

  const plan = useMemo<CounterPlan[]>(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        state: stage.state,
        target: stage.metric?.value,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on content, not identity (see above).
    [signature],
  );

  /**
   * rAF progress in [0, 1] for the stage that is currently RUNNING, and only
   * for it. Every other counter is derived at render time — a done stage is at
   * 1 by definition, and a run that is not live is at 1 everywhere on its
   * first frame, which is what "never animate on a completed run's first
   * paint" means concretely. Nothing here has to be synced back into state.
   */
  const [counted, setCounted] = useState<Record<string, number>>({});

  /**
   * A mirror of `counted` the animation can read without depending on it.
   * Declared BEFORE the animation effect so it is already current when that
   * effect resumes a counter that was part-way up.
   */
  const countedRef = useRef(counted);
  useEffect(() => {
    countedRef.current = counted;
  });

  useEffect(() => {
    if (!animates) return;

    const counting = plan.filter((stage) => stage.state === "running");
    if (counting.length === 0) return;

    // Resume from wherever the counter had got to, so a re-render mid-run
    // never snaps a number back to zero and counts it up twice.
    const from: Record<string, number> = {};
    for (const stage of counting) {
      from[stage.id] = countedRef.current[stage.id] ?? 0;
    }

    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - startedAt) / COUNT_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      setCounted((prev) => {
        const next = { ...prev };
        for (const stage of counting) {
          next[stage.id] = from[stage.id] + (1 - from[stage.id]) * eased;
        }
        return next;
      });
      if (t < 1) frame = requestAnimationFrame(tick);
    });

    // React 19 StrictMode mounts twice in dev: cancelling here is what keeps
    // the second pass from running a duplicate loop at double speed.
    return () => cancelAnimationFrame(frame);
  }, [plan, animates]);

  // The system says what it does not know, rather than drawing empty boxes.
  if (stages.length === 0) {
    return (
      <p className="text-caption text-ink-3">
        No pipeline stages recorded for this run.
      </p>
    );
  }

  return (
    <div className="flex items-stretch">
      {stages.map((stage, index) => {
        const state = STAGE_STATE[stage.state];
        // Derived, not stored: only a running stage on a live run is mid-count.
        const fraction =
          animates && stage.state === "running"
            ? (counted[stage.id] ?? 0)
            : 1;
        const metric = stage.metric;
        const shown =
          metric === undefined
            ? undefined
            : Math.round(metric.value * fraction);
        const settledText =
          metric === undefined
            ? "count not recorded"
            : `${COUNT_FORMAT.format(metric.value)} ${metric.unit}`;
        const connectorTone = CONNECTOR_FILL[stage.state];

        return (
          <div key={stage.id} className="contents">
            <div className="min-w-0 flex-1 rounded border border-line bg-surface px-4 py-3">
              <p className="flex items-baseline justify-between gap-2 text-micro uppercase">
                <span className="truncate font-medium text-ink">
                  {stage.label}
                </span>
                {/* Provider names sit next to their output — no legend. */}
                <span className="truncate text-ink-3">{stage.provider}</span>
              </p>

              {/* The settled sentence is what assistive tech reads; the
                  counting figure beside it would be announced on every frame. */}
              <span className="sr-only">{settledText}</span>

              <p aria-hidden="true" className="tabular mt-2 flex items-baseline gap-1.5">
                {shown === undefined ? (
                  <span className="text-body text-ink-3">not recorded</span>
                ) : (
                  <>
                    <span className="text-display font-medium text-ink">
                      {COUNT_FORMAT.format(shown)}
                    </span>
                    <span className="truncate text-caption text-ink-3">
                      {metric?.unit}
                    </span>
                  </>
                )}
              </p>

              <p className={`mt-1 text-caption font-medium ${state.text}`}>
                {state.word}
              </p>
            </div>

            {index < stages.length - 1 ? (
              /* The empty track is `line`, the same grey as the 1px box
                 borders it joins, so the hairline reads as continuous in both
                 themes. `line-soft` is the internal-divider grey and against
                 `canvas` it is 1.05:1 in light and 1.29:1 in dark — a track
                 nobody can see is a progress line that only exists once it
                 has filled. */
              <span
                aria-hidden="true"
                className="h-px w-6 shrink-0 self-center overflow-hidden bg-line sm:w-10"
              >
                {connectorTone ? (
                  <span
                    className={`block h-full ${connectorTone}`}
                    style={{
                      width: `${connectorFraction(stage.state, fraction) * 100}%`,
                    }}
                  />
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Does this reader want no motion? Read through useSyncExternalStore so the
 * server pass and the first client pass agree (false on the server, the real
 * value once hydrated) and a mid-session change to the OS setting takes
 * effect without a reload.
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    () => false,
  );
}
