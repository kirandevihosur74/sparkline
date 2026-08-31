import { NextRequest, NextResponse } from "next/server";
import { checkClaimStaleness } from "@/lib/serpapi";
import type { ExtractedClaim } from "@/lib/types";

/**
 * Beat 2 — POST a claim, check it against live public data via SerpApi.
 * Body: JSON { claim: ExtractedClaim }
 * Returns { flag: StalenessFlag | null } — null means the claim still holds.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { claim?: ExtractedClaim };

    if (!body.claim) {
      return NextResponse.json(
        { error: "Expected JSON body with `claim`" },
        { status: 400 }
      );
    }

    const flag = await checkClaimStaleness(body.claim);
    return NextResponse.json({ flag });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
