import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";

// Orchestrator — runs the full pipeline over the demo diligence room and
// returns everything the UI needs in one call (AnalysisResult in lib/types.ts).
//
// POST with multipart form-data (fields docA, docB as PDF files) analyzes
// uploaded documents; POST with no body (or GET) analyzes the bundled demo
// documents in documents/.

const DEMO_DOCS = [
  { documentId: "doc-a", file: "documents/doc-a.pdf" },
  { documentId: "doc-b", file: "documents/doc-b.pdf" },
];

async function runDemoAnalysis() {
  const docs = await Promise.all(
    DEMO_DOCS.map(async (d) => ({
      documentId: d.documentId,
      file: await readFile(path.join(process.cwd(), d.file)),
    }))
  );
  return analyze(docs);
}

export async function GET() {
  try {
    return NextResponse.json(await runDemoAnalysis());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const docA = formData.get("docA");
      const docB = formData.get("docB");
      if (docA instanceof File && docB instanceof File) {
        const result = await analyze([
          { documentId: "doc-a", file: Buffer.from(await docA.arrayBuffer()) },
          { documentId: "doc-b", file: Buffer.from(await docB.arrayBuffer()) },
        ]);
        return NextResponse.json(result);
      }
      return NextResponse.json(
        { error: "Expected multipart form with `docA` and `docB` PDF files" },
        { status: 400 }
      );
    }
    return NextResponse.json(await runDemoAnalysis());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
