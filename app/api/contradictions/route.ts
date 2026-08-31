import { NextRequest, NextResponse } from "next/server";
import { findContradictions } from "@/lib/contradiction";
import type { ExtractedClaim } from "@/lib/types";

/**
 * Beat 1 — POST claims from two documents, get back contradiction flags.
 * Body: JSON { docA: ExtractedClaim[], docB: ExtractedClaim[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      docA?: ExtractedClaim[];
      docB?: ExtractedClaim[];
    };

    if (!Array.isArray(body.docA) || !Array.isArray(body.docB)) {
      return NextResponse.json(
        { error: "Expected JSON body with `docA` and `docB` claim arrays" },
        { status: 400 }
      );
    }

    const flags = findContradictions(body.docA, body.docB);
    return NextResponse.json({ flags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
