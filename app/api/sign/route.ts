import { NextRequest, NextResponse } from "next/server";
import {
  isRejectReason,
  SignError,
  signDecision,
  withdrawDecision,
} from "@/lib/runs/records";
import type { SignErrorResponse } from "@/lib/data/types";

/**
 * Beat 3 — a human approved/rejected a finding; create a signed, auditable
 * record with Nutrient DWS.
 *
 * POST body: JSON { reviewId, flagId, decision: "approved" | "rejected",
 *                   reason?, note?, reviewer? }
 * Returns { record: AuditRecord } — signedDocumentUrl serves the signed PDF,
 * contentHash is the SHA-256 of its bytes, and `timings` is what each step of
 * the chain actually cost, measured server-side (lib/types.ts SigningTimings).
 *
 * On failure returns { error, step? } (SignErrorResponse): `step` names which
 * link of the chain broke — "convert" | "sign" | "hash" | "store" — as a
 * field of its own, so the UI never has to read it out of the message. It is
 * absent when nothing had started: a 400 bad request, or a 404 for a review
 * or finding that does not exist.
 *
 * DELETE ?reviewId=&flagId= — withdraw a decision (undo): removes the ledger
 * row and the signed PDF behind it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
    const flagId = typeof body.flagId === "string" ? body.flagId : "";
    const decision = body.decision;

    if (!reviewId || !flagId || (decision !== "approved" && decision !== "rejected")) {
      return NextResponse.json(
        { error: "Expected JSON body with `reviewId`, `flagId`, `decision` (approved | rejected)" },
        { status: 400 }
      );
    }
    if (body.reason !== undefined && !isRejectReason(body.reason)) {
      return NextResponse.json({ error: "Unknown rejection `reason`" }, { status: 400 });
    }

    const record = await signDecision({
      reviewId,
      flagId,
      decision,
      reason: isRejectReason(body.reason) ? body.reason : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
      reviewer: typeof body.reviewer === "string" ? body.reviewer : undefined,
    });
    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof SignError) {
      // Status mapping is unchanged: a DWS failure is still 500, a missing
      // review still 404. `step` only ADDS attribution where there is one.
      const body: SignErrorResponse = {
        error: error.message,
        ...(error.step ? { step: error.step } : {}),
      };
      return NextResponse.json(body, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const reviewId = request.nextUrl.searchParams.get("reviewId") ?? "";
    const flagId = request.nextUrl.searchParams.get("flagId") ?? "";
    if (!reviewId || !flagId) {
      return NextResponse.json(
        { error: "Expected `reviewId` and `flagId` query parameters" },
        { status: 400 }
      );
    }
    withdrawDecision(reviewId, flagId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
