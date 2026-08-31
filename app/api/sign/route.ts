import { NextRequest, NextResponse } from "next/server";
import { signRecord } from "@/lib/nutrient";
import type { ReviewRecord } from "@/lib/types";

/**
 * Beat 3 — a human approved/rejected a flag; create a signed, auditable record.
 * Body: JSON { flagId: string, reviewer: string, decision: "approved" | "rejected" }
 * Returns { record: ReviewRecord }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ReviewRecord>;

    if (!body.flagId || !body.reviewer || !body.decision) {
      return NextResponse.json(
        { error: "Expected JSON body with `flagId`, `reviewer`, `decision`" },
        { status: 400 }
      );
    }

    // TODO(beat-3): render the review decision into a small PDF record
    // (flag details + decision + timestamp), then sign it:
    //   const signedPdf = await signRecord(recordPdfBuffer);
    // Store/serve the signed PDF and return its URL in the ReviewRecord.
    void signRecord;
    return NextResponse.json(
      { error: "sign not implemented — Day 3 task (plan §6)" },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
