import { NextResponse } from "next/server";
import { loadRecordPdf } from "@/lib/runs/store";

/** The signed PDF behind one ledger row. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/records/[reviewId]/[flagId]">
) {
  const { reviewId, flagId } = await params;
  const pdf = loadRecordPdf(reviewId, flagId);
  if (!pdf) {
    return NextResponse.json({ error: "No signed record for this finding" }, { status: 404 });
  }
  const filename = `${reviewId}-${flagId}`.replace(/[^A-Za-z0-9_-]+/g, "-");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
