import { after, NextRequest, NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES, SLOT_IDS, type SlotId } from "@/lib/runs/bundle";
import { createRun, executeRun, type UploadedSlot } from "@/lib/runs/execute";
import { listRuns, looksLikePdf } from "@/lib/runs/store";

/**
 * Live runs.
 *
 * POST — record a new run and start the real pipeline (Nutrient DWS
 * extraction, cross-document comparison, SerpApi live check) after the
 * response is sent. Returns { id, status } immediately; poll
 * GET /api/runs/[id] for progress.
 *
 *   - no body: the committed sample bundle.
 *   - multipart/form-data with `docA` and/or `docB` PDF files: those replace
 *     the primary / cross-reference slot; a missing slot keeps the sample.
 *     Files are stored under data/uploads/<run>/ and served back by
 *     /api/documents/<run>/<doc> for the viewer.
 *
 * GET — every recorded run, newest first.
 */
const FIELD_FOR_SLOT: Record<SlotId, string> = { "doc-a": "docA", "doc-b": "docB" };

async function readUploads(request: NextRequest): Promise<UploadedSlot[] | { error: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) return [];

  const form = await request.formData();
  const uploads: UploadedSlot[] = [];
  for (const slot of SLOT_IDS) {
    const value = form.get(FIELD_FOR_SLOT[slot]);
    if (value === null || value === "") continue;
    if (!(value instanceof File)) return { error: `\`${FIELD_FOR_SLOT[slot]}\` must be a file` };
    if (value.size === 0) return { error: `${value.name || FIELD_FOR_SLOT[slot]} is empty` };
    if (value.size > MAX_UPLOAD_BYTES) {
      return { error: `${value.name} is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB` };
    }
    const bytes = Buffer.from(await value.arrayBuffer());
    if (!looksLikePdf(bytes)) return { error: `${value.name} is not a PDF` };
    uploads.push({ slot, fileName: value.name || `${slot}.pdf`, bytes });
  }
  return uploads;
}

export async function POST(request: NextRequest) {
  try {
    const uploads = await readUploads(request);
    if ("error" in uploads) {
      return NextResponse.json({ error: uploads.error }, { status: 400 });
    }
    const run = createRun({ uploads });
    after(async () => {
      try {
        await executeRun(run.id);
      } catch (error) {
        console.error(`run ${run.id} failed:`, error);
      }
    });
    return NextResponse.json(
      { id: run.id, status: run.status, uploaded: uploads.map((u) => u.slot) },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    runs: listRuns().map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      documents: r.bundle.map((d) => ({ id: d.id, fileName: d.fileName, source: d.source })),
      claims: r.result ? Object.values(r.result.claimsByDoc).flat().length : 0,
      flags: r.result?.flags.length ?? 0,
      trustScore: r.result?.trustScore.blended,
    })),
  });
}
