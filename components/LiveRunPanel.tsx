"use client";

/**
 * LiveRunPanel — screen 2 for a run that is happening RIGHT NOW.
 *
 * AnalysisScreen replays a recorded run against a client clock. A live run
 * has no recording yet: its stages and reasoning lines arrive as the pipeline
 * writes them, so this panel polls GET /api/runs/[id] and hands whatever the
 * run has reported so far to the same AnalysisRunPanel the replay uses. The
 * pacing here is the provider's own — nothing is compressed or invented.
 *
 * When the run settles (complete or failed) the page is reloaded so the server
 * renders the finished run through the data layer, exactly as it renders a
 * committed one. "Skip to results" does the same reload early; a run that is
 * still going simply lands back here.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnalysisRunPanel from "./AnalysisRunPanel";
import type { PipelineEvent, PipelineStage } from "@/lib/data";

const POLL_MS = 1_200;

interface RunProgress {
  status: "analyzing" | "complete" | "failed";
  stages: PipelineStage[];
  events: PipelineEvent[];
  error?: string;
}

export interface LiveRunPanelProps {
  reviewId: string;
  reviewTitle: string;
  reviewSubtitle?: string;
  /** What the run had reported when the page was rendered. */
  initialStages: PipelineStage[];
  initialEvents: PipelineEvent[];
}

export default function LiveRunPanel({
  reviewId,
  reviewTitle,
  reviewSubtitle,
  initialStages,
  initialEvents,
}: LiveRunPanelProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<RunProgress>({
    status: "analyzing",
    stages: initialStages,
    events: initialEvents,
  });
  const settled = useRef(false);

  const finish = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    // Drop the ?state param and re-render on the server with the finished run.
    router.replace(`/reviews/${encodeURIComponent(reviewId)}`);
    router.refresh();
  }, [router, reviewId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/runs/${encodeURIComponent(reviewId)}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const next = (await response.json()) as RunProgress;
          if (cancelled) return;
          setProgress(next);
          if (next.status !== "analyzing") {
            finish();
            return;
          }
        }
      } catch {
        // A missed poll is not a failed run; try again on the next tick.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reviewId, finish]);

  return (
    <AnalysisRunPanel
      reviewTitle={reviewTitle}
      reviewSubtitle={reviewSubtitle}
      stages={progress.stages}
      events={progress.events}
      onSkip={finish}
    />
  );
}
