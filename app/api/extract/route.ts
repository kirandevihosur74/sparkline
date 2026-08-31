import { NextRequest, NextResponse } from "next/server";
import { extractClaims } from "@/lib/nutrient";

/**
 * Beat 1 — POST a document, get back extracted claims with confidence.
 * Body: multipart/form-data with `file` (PDF) and `documentId`.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const documentId = formData.get("documentId");

    if (!(file instanceof File) || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "Expected multipart form with `file` and `documentId`" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const claims = await extractClaims(buffer, documentId);
    return NextResponse.json({ claims });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
