"use client";

/**
 * AnalysisScreen — the state machine behind `/reviews/[id]`, DESIGN_SYSTEM.md
 * screens 2 (analyzing) and 3 (complete). ONE route, two states, one component
 * deciding which of them is on screen.
 *
 * WHY THERE IS A CLOCK HERE AT ALL. The fixtures are static: `getStages()` and
 * `getEvents()` describe a run that already finished, so nothing about them
 * unfolds on its own. Screen 2 is the run unfolding. This component therefore
 * REPLAYS the recorded run against a client-side clock — it never invents a
 * stage, an event, a count or a duration, it only decides WHEN each recorded
 * value is allowed on screen. Everything rendered is fixture data; the only
 * thing this file authors is the pacing.
 *
 * The pacing is compressed and says so. The real run took 3:52; a demo nobody
 * can watch is not a demo. The elapsed times PipelineRail prints beside each
 * settled stage are the REAL recorded ones (`PipelineStage.durationMs`) — only
 * the wall-clock between them is scaled, and the footer of the analyzing state
 * says that in words so the compression is never mistaken for the timings.
 *
 * The run ADVANCES TO COMPLETE ON ITS OWN. That is the point of screen 2: it
 * is a state the run leaves, not a page you sit on. "Skip to results" is the
 * one action while it runs; "Replay analysis" on the complete state puts it
 * back. Arriving with `?state=analyzing` starts in the run; a plain visit shows
 * the completed run, because that is what the data layer actually holds.
 *
 * TODO(schema-gap: pipeline): `PipelineStage` and `PipelineEvent` are
 * FRONTEND-ONLY view-models (lib/data/types.ts) — the backend has no Run
 * entity, no stages, no per-stage timing, no provider attribution and no event
 * stream, so this replay has nothing live to subscribe to. When a real Run
 * lands, the clock below is replaced by that stream and this component keeps
 * its shape.
 *
 * TODO(schema-gap: pipeline): a run in flight has no recorded partial state
 * either — the backend stores only the finished artifacts. `projectStage()`
 * below therefore DERIVES what a stage looked like before it settled (no
 * duration yet, no failure yet, nothing counted yet) rather than reading it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import AnalysisRunPanel from "./AnalysisRunPanel";
import AnalysisSummary from "./AnalysisSummary";
import type {
  CoverageBreakdown,
  ExtractedClaim,
  Finding,
  PipelineEvent,
  PipelineStage,
  TrustScoreBreakdown,
} from "@/lib/data";

/** The two states of this route. */
export type AnalysisPhase = "analyzing" | "complete";

// ---------------------------------------------------------------------------
// Pacing constants — PRESENTATION ONLY.
//
// None of these are data. They are the same kind of value as FunnelCounters'
// COUNT_MS: how long a thing is on screen, not what it says.
// ---------------------------------------------------------------------------

/**
 * How long each reasoning line holds the bottom of the stream.
 *
 * This is a FLOOR set by ReasoningStream, not a free choice: that component
 * owns its own reveal and steps one line at a time on an internal timer. Handing
 * it lines faster than it can reveal them would leave the stream narrating the
 * middle of the run while the rail had already finished it. Keeping this step
 * at or above the stream's cadence keeps the two clocks in lockstep.
 */
const EVENT_STEP_MS = 1_150;

/** The shortest a stage may hold the screen — below this it cannot be read. */
const MIN_STAGE_MS = 1_400;

/**
 * A beat after the last stage settles and the last line lands, so the finished
 * run is on screen as a finished run before the state changes under the
 * reader. Without it the final stage would go from "running" straight to the
 * summary and never be seen done.
 */
const TAIL_MS = 800;

// ---------------------------------------------------------------------------
// The replay timeline
// ---------------------------------------------------------------------------

/** When one stage owns the screen, in replay milliseconds. */
interface StageSlot {
  startMs: number;
  endMs: number;
}

interface Timeline {
  /** One slot per stage, in run order — same index as `stages`. */
  slots: StageSlot[];
  /** When each event is revealed, in run order — same index as `events`. */
  eventTimes: number[];
  /** When the run is over. */
  runMs: number;
  /**
   * Every instant at which something on screen changes, ascending and unique.
   * The clock steps between these rather than ticking every frame: each stage
   * boundary and each revealed line is a discrete change, and a render per
   * frame would buy nothing but work. (The counting numbers DO animate per
   * frame — that is FunnelCounters' own requestAnimationFrame, per
   * DESIGN_SYSTEM.md Motion, and it is the only thing here that needs one.)
   */
  marks: number[];
}

/**
 * Lay the recorded run out on a watchable clock.
 *
 * Stage slots are proportional to the REAL recorded durations, so extraction
 * still visibly dominates the run the way it actually did — but every stage is
 * floored at `MIN_STAGE_MS` first, because a compare stage that really took
 * 2.1s of a 3:52 run would otherwise flash past in a single frame and the
 * reviewer would never see it run.
 */
function buildTimeline(
  stages: PipelineStage[],
  events: PipelineEvent[],
): Timeline {
  const eventTimes = events.map((_, index) => index * EVENT_STEP_MS);
  const streamMs = events.length === 0 ? 0 : eventTimes[events.length - 1];

  const flooredMs = stages.length * MIN_STAGE_MS;
  // The run works for as long as the slower of its two obligations takes:
  // showing every stage, and letting the stream finish narrating. Neither may
  // be cut off. Then it holds the finished run for a beat.
  const contentMs = Math.max(streamMs, flooredMs);
  const runMs = contentMs + TAIL_MS;

  const recordedMs = stages.reduce(
    (sum, stage) => sum + (stage.durationMs ?? 0),
    0,
  );
  const spareMs = Math.max(contentMs - flooredMs, 0);

  let cursor = 0;
  const slots = stages.map((stage) => {
    // A run that recorded no durations at all splits the time evenly rather
    // than collapsing every stage onto the same instant.
    const share =
      recordedMs > 0
        ? (stage.durationMs ?? 0) / recordedMs
        : 1 / stages.length;
    const startMs = cursor;
    const endMs = Math.min(startMs + MIN_STAGE_MS + spareMs * share, contentMs);
    cursor = endMs;
    return { startMs, endMs };
  });

  const marks = Array.from(
    new Set([
      0,
      ...slots.flatMap((slot) => [slot.startMs, slot.endMs]),
      ...eventTimes,
      runMs,
    ]),
  ).sort((a, b) => a - b);

  return { slots, eventTimes, runMs, marks };
}

/**
 * What a stage looked like at `elapsed`.
 *
 * A settled stage is returned UNTOUCHED — its recorded state, its recorded
 * duration, its recorded failure. Only the part of the run that has not
 * happened yet is derived, and it is derived by SUBTRACTION: a stage that has
 * not finished has no elapsed time to report, a stage that has not returned has
 * not returned a failure, and a stage that has not started has counted nothing.
 * Nothing is invented — the target each counter runs up to is the stage's own
 * recorded metric.
 */
function projectStage(
  stage: PipelineStage,
  slot: StageSlot | undefined,
  elapsed: number,
): PipelineStage {
  if (slot === undefined || elapsed >= slot.endMs) return stage;

  const started = elapsed >= slot.startMs;

  return {
    ...stage,
    state: started ? "running" : "pending",
    // PipelineRail prints "in progress" / "not started" instead — the run has
    // not measured this stage yet, and it says so rather than showing the
    // figure it is going to end up with.
    durationMs: undefined,
    // A failure is what a stage RETURNED. Nothing has returned yet.
    failure: undefined,
    // The count SO FAR. Zero is this stage's real progress before it starts,
    // not a placeholder; once it is running the counter runs up to the metric
    // the stage actually recorded.
    metric:
      started || stage.metric === undefined
        ? stage.metric
        : { ...stage.metric, value: 0 },
  };
}

export interface AnalysisScreenProps {
  /** The run's own name and metadata line, from `getReview()`. */
  reviewTitle: string;
  reviewSubtitle?: string;
  /** Claims extracted, for the findings-versus-claims count on the summary. */
  claimCount: number;
  /** From `getStages()` — the recorded run, in run order. */
  stages: PipelineStage[];
  /** From `getEvents()` — the recorded reasoning, oldest first. */
  events: PipelineEvent[];
  /** From `getFindings()` — queue order, flags first by materiality. */
  findings: Finding[];
  /** From `getCoverage()` — derived from those same findings. */
  coverage: CoverageBreakdown;
  /** From `getTrustBreakdown()` — the dial and the parts it is made of. */
  breakdown: TrustScoreBreakdown;
  /** From `getClaims()` — resolves the ids a failed stage stranded. */
  claims: ExtractedClaim[];
  /** Where the primary action goes: this run's review workspace. */
  reviewHref: string;
  /**
   * Which state to open in. `analyzing` when the URL asked for the run
   * (`?state=analyzing`), `complete` on a plain visit — a plain visit shows
   * what the data layer actually holds, which is a finished run.
   */
  initialPhase: AnalysisPhase;
}

export default function AnalysisScreen({
  reviewTitle,
  reviewSubtitle,
  claimCount,
  stages,
  events,
  findings,
  coverage,
  breakdown,
  claims,
  reviewHref,
  initialPhase,
}: AnalysisScreenProps) {
  const timeline = useMemo(
    () => buildTimeline(stages, events),
    [stages, events],
  );

  const [phase, setPhase] = useState<AnalysisPhase>(initialPhase);
  /** Which mark the clock is standing on. Only meaningful while analyzing. */
  const [markIndex, setMarkIndex] = useState(0);

  const { marks } = timeline;
  const lastMark = marks.length - 1;
  const elapsed =
    phase === "analyzing" ? (marks[markIndex] ?? 0) : timeline.runMs;

  // The clock. One pending timeout at a time, stepping mark to mark, and the
  // run ENDS ITSELF at the last one: screen 2 is a state the run leaves, not a
  // page you sit on. The state change happens in the timeout rather than in
  // the effect body, so a completed run settles in one render instead of
  // cascading. The cleanup is what keeps React 19's StrictMode double-mount in
  // dev from running two clocks at double speed.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const next = markIndex + 1;
    // A run with nothing to show (no stages, no events) has a single mark and
    // completes immediately rather than hanging on an empty screen.
    const wait = next <= lastMark ? marks[next] - marks[markIndex] : 0;
    const timer = setTimeout(() => {
      if (next >= lastMark) setPhase("complete");
      else setMarkIndex(next);
    }, wait);
    return () => clearTimeout(timer);
  }, [phase, markIndex, lastMark, marks]);

  const replay = useCallback(() => {
    setMarkIndex(0);
    setPhase("analyzing");
  }, []);

  const skip = useCallback(() => setPhase("complete"), []);

  const running = phase === "analyzing";

  // The recorded stages as they stood at `elapsed`. Untouched once settled.
  const shownStages = useMemo(
    () =>
      running
        ? stages.map((stage, index) =>
            projectStage(stage, timeline.slots[index], elapsed),
          )
        : stages,
    [running, stages, timeline, elapsed],
  );

  // Recorded events, up to the ones the clock has reached. ReasoningStream
  // reveals the newest of them itself — this only decides what it may have.
  const shownEvents = useMemo(() => {
    if (!running) return events;
    const revealed = timeline.eventTimes.filter(
      (time) => time <= elapsed,
    ).length;
    return events.slice(0, revealed);
  }, [running, events, timeline, elapsed]);

  if (running) {
    return (
      <AnalysisRunPanel
        reviewTitle={reviewTitle}
        reviewSubtitle={reviewSubtitle}
        stages={shownStages}
        events={shownEvents}
        onSkip={skip}
      />
    );
  }

  return (
    <AnalysisSummary
      reviewTitle={reviewTitle}
      reviewSubtitle={reviewSubtitle}
      claimCount={claimCount}
      stages={stages}
      findings={findings}
      coverage={coverage}
      breakdown={breakdown}
      claims={claims}
      reviewHref={reviewHref}
      onReplay={replay}
    />
  );
}
