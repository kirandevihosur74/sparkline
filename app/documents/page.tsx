/**
 * /documents — the document library. Stub: documents reach the demo through a
 * review, so there is no standalone library screen in the spine.
 */

import StubScreen from "@/components/StubScreen";

export default function DocumentsPage() {
  return (
    <StubScreen
      title="Documents"
      detail="Designed to hold every uploaded document with its parse state, page count and average extraction confidence, plus the claims found in each."
    />
  );
}
