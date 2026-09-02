/**
 * /reviews — the review index. Stub: the demo spine enters a review directly
 * (AppNav links straight at the demo run), so the list itself is unbuilt.
 *
 * The workspace scale strip sits ABOVE the stub rather than inside it. The
 * strip is true of the workspace whether or not this screen lists it, and the
 * stub underneath still says plainly that the list is designed and not built —
 * the two are separate admissions and neither cancels the other.
 *
 * Layout: the root layout's <main> is the flex column, so the strip is a
 * shrink-0 header row and StubScreen keeps its own flex-1 `.scroll-col`. The
 * page still never scrolls.
 */

import StubScreen from "@/components/StubScreen";
import WorkspaceScaleStrip from "@/components/WorkspaceScaleStrip";

export default function ReviewsIndexPage() {
  return (
    <>
      <WorkspaceScaleStrip />

      <StubScreen
        title="Reviews"
        detail="Designed to list every review in the workspace — status, document count, flag count and trust score per row."
        action={{ href: "/reviews/new", label: "Start a new review →" }}
      />
    </>
  );
}
