"use client";

/**
 * ReasoningStream — DESIGN_SYSTEM.md item 9, the running commentary beneath
 * the funnel on the analysis screen.
 *
 * A log of what the run DECIDED, not of what it did: one line per decision,
 * with the verdict it reached rendered inline as a pill. At most FIVE lines
 * are visible; a new line fades up at the bottom and the oldest drops off the
 * top, so the panel never grows and the page never scrolls (theme.css pins
 * html/body — see DESIGN_SYSTEM.md, Layout rules).
 *
 * MOTION, AND ITS LIMIT. Per DESIGN_SYSTEM.md, Motion: reasoning-stream lines
 * fade up, max 5 visible, oldest drops. Nothing else here moves — no ticker,
 * no cursor, no auto-scroll. When the run is live, events are revealed one at
 * a time on a timer; when it is not, the last five are on screen from the
 * first frame with no entrance animation at all. A finished run replaying
 * itself would claim work is happening that finished minutes ago.
 *
 * `PipelineEvent.message` is PLAIN TEXT by contract (lib/data/types.ts) — it
 * is rendered as a text node, so nothing here has to sanitize or trust it.
 * Emphasis is the row's styling concern, never the message's content.
 *
 * TODO(schema-gap: pipeline): `PipelineEvent` is a FRONTEND-ONLY view-model —
 * the backend has no run entity and no event stream at all, so every line here
 * is fixture-backed. When a real Run lands this component keeps its props and
 * the fixtures go away.
 *
 * Shadow discipline: nothing here carries shadow-action — that belongs to the
 * single dominant action on the screen.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ClaimVerdict, PipelineEvent } from "@/lib/data";

/** DESIGN_SYSTEM.md item 9: max 5 visible lines. */
const MAX_VISIBLE = 5;

/** How long one revealed line holds the bottom of the log before the next. */
const REVEAL_MS = 1_100;

/**
 * Verdict copy and tone — the SAME ClaimVerdict semantics FindingCard renders
 * in the queue, so a verdict named here and a verdict named there are visibly
 * the same thing. Keyed as a total Record so a new ClaimVerdict fails the
 * build instead of rendering an unlabelled pill.
 *
 * Colour never carries meaning alone: every pill is also a word. The pill's
 * 1px border is always --color-line (never a coloured border); the soft fill
 * is the same tint the resolved finding cards and the decision confirmation
 * strip use.
 */
const VERDICT: Record<
  ClaimVerdict,
  { label: string; text: string; dot: string; soft: string }
> = {
  conflicting: {
    label: "Conflicting",
    text: "text-alert",
    dot: "bg-alert",
    soft: "bg-alert-soft",
  },
  stale: {
    label: "Stale",
    text: "text-warn",
    dot: "bg-warn",
    soft: "bg-warn-soft",
  },
  corroborated: {
    label: "Corroborated",
    text: "text-accent",
    dot: "bg-accent",
    soft: "bg-accent-soft",
  },
  consistent: {
    label: "Consistent",
    text: "text-accent",
    dot: "bg-accent",
    soft: "bg-accent-soft",
  },
  review_required: {
    label: "Review required",
    text: "text-ink",
    dot: "bg-ink",
    soft: "bg-subtle",
  },
  unverified: {
    label: "Unverified",
    text: "text-ink-3",
    dot: "bg-line-strong",
    soft: "bg-subtle",
  },
};

export interface ReasoningStreamProps {
  /** The run's events, oldest first — the order the data layer returns. */
  events: PipelineEvent[];
  /**
   * Is the run live? True reveals events one at a time as they arrive; false
   * shows the last five immediately and animates nothing.
   */
  running: boolean;
}

export default function ReasoningStream({
  events,
  running,
}: ReasoningStreamProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animates = running && !reducedMotion;
  const total = events.length;

  /**
   * How many events, counting from the oldest, the timer has revealed. Only
   * the live path ever touches it: `visibleCount` below derives what is
   * actually on screen, so a finished run is fully revealed on its first frame
   * without any state to sync.
   */
  const [revealed, setRevealed] = useState(1);

  /**
   * A live run holds at least the first line and never runs past the last one;
   * a finished run (or a reader who asked for reduced motion) is simply all of
   * it, mid-reveal or not.
   */
  const visibleCount = animates ? Math.min(Math.max(revealed, 1), total) : total;

  // One pending timeout at a time, self-terminating at the last event. The
  // cleanup is what keeps React 19's StrictMode double-mount in dev from
  // running two timers and revealing at double speed.
  useEffect(() => {
    if (!animates || visibleCount >= total) return;
    const timer = setTimeout(() => setRevealed(visibleCount + 1), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [animates, visibleCount, total]);

  // The system says what it does not know, rather than showing an empty box
  // that reads as "the run decided nothing".
  if (total === 0) {
    return (
      <p className="text-caption text-ink-3">
        No reasoning was recorded for this run.
      </p>
    );
  }

  const start = Math.max(0, visibleCount - MAX_VISIBLE);
  const visible = events.slice(start, visibleCount);

  return (
    <ol
      // role="log" announces additions politely — a reader who cannot see the
      // lines fade up still hears each decision once, as it lands.
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col gap-2"
    >
      {visible.map((event, index) => (
        <StreamLine
          // Index within the FULL list: stable as the window slides, so only
          // the genuinely new line mounts and fades up.
          key={start + index}
          event={event}
          // Only the newest line enters; the four above it are already there.
          enters={animates && start + index === visibleCount - 1}
        />
      ))}
    </ol>
  );
}

function StreamLine({
  event,
  enters,
}: {
  event: PipelineEvent;
  enters: boolean;
}) {
  // A line that does not enter is rendered settled from its first frame.
  const [entered, setEntered] = useState(!enters);

  useEffect(() => {
    if (entered) return;
    // Two frames: the first commits the "before" styles, the second flips them
    // so the transition has something to run from.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [entered]);

  const verdict = event.verdict ? VERDICT[event.verdict] : undefined;

  return (
    <li
      className={`flex gap-3 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      <span className="tabular w-8 shrink-0 pt-px text-caption text-ink-3">
        {event.timestamp}
      </span>
      <p className="min-w-0 text-body text-ink-2">
        {event.message}
        {verdict ? (
          <>
            {" "}
            <span
              className={`ml-0.5 inline-flex items-baseline gap-1 rounded-sm border border-line px-1.5 py-0.5 align-baseline text-micro uppercase ${verdict.soft}`}
            >
              {/* The only non-text mark in the system: a 5px status dot. */}
              <span
                aria-hidden="true"
                className={`size-[5px] shrink-0 translate-y-px self-center rounded-full ${verdict.dot}`}
              />
              <span className={`font-medium ${verdict.text}`}>
                {verdict.label}
              </span>
            </span>
          </>
        ) : null}
      </p>
    </li>
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
