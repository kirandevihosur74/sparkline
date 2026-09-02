import { NextResponse } from "next/server";
import { loadDocumentPdf, loadRun } from "@/lib/runs/store";

/**
 * The PDF behind one document of a stored run — the viewer loads uploaded
 * documents from here (sample documents come from /public). Inline, no
 * caching: the file belongs to one run and is read once per view.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/documents/[reviewId]/[docId]">
) {
  const { reviewId, docId } = await params;
  const pdf = loadDocumentPdf(reviewId, docId);
  if (!pdf) {
    return NextResponse.json({ error: "No document with that id on this run" }, { status: 404 });
  }
  const fileName = loadRun(reviewId)?.bundle.find((d) => d.id === docId)?.fileName ?? `${docId}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "cache-control": "no-store",
    },
  });
}
