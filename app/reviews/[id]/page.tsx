/**
 * /reviews/[id] — the analysis screen: screens 2 (analyzing) and 3 (complete)
 * of the design system, one route in two states.
 *
 * Stub. Not built yet, and deliberately not faked: the funnel counters,
 * pipeline rail and reasoning stream all have real fixture data behind them
 * (getStages / getEvents / getTrustBreakdown), so this screen will render live
 * data rather than a mock when it lands. Until then a click from the nav
 * arrives here instead of at a 404.
 */

import StubScreen from "@/components/StubScreen";

export default function ReviewAnalysisPage() {
  return (
    <StubScreen
      title="Analysis"
      detail="Designed to show the run itself — funnel counters per stage, the pipeline rail with its provider names and timings, and the reasoning stream — then collapse to a summary line with the trust score and findings once the run completes."
    />
  );
}
