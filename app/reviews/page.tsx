/**
 * /reviews — the review index. Stub: the demo spine enters a review directly
 * (AppNav links straight at the demo run), so the list itself is unbuilt.
 */

import StubScreen from "@/components/StubScreen";

export default function ReviewsIndexPage() {
  return (
    <StubScreen
      title="Reviews"
      detail="Designed to list every review in the workspace — status, document count, flag count and trust score per row."
      action={{ href: "/reviews/new", label: "Start a new review →" }}
    />
  );
}
