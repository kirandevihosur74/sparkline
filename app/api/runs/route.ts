import { after, NextResponse } from "next/server";
import { createRun, executeRun } from "@/lib/runs/execute";
import { listRuns } from "@/lib/runs/store";

/**
 * Live runs over the sample bundle.
 *
 * POST — record a new run and start the real pipeline (Nutrient DWS
 * extraction, cross-document comparison, SerpApi live check) after the
 * response is sent. Returns { id, status } immediately; poll
 * GET /api/runs/[id] for progress.
 *
 * GET — every recorded run, newest first.
 */
export async function POST() {
  try {
    const run = createRun();
    after(async () => {
      try {
        await executeRun(run.id);
      } catch (error) {
        console.error(`run ${run.id} failed:`, error);
      }
    });
    return NextResponse.json({ id: run.id, status: run.status }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    runs: listRuns().map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      claims: r.result ? Object.values(r.result.claimsByDoc).flat().length : 0,
      flags: r.result?.flags.length ?? 0,
      trustScore: r.result?.trustScore.blended,
    })),
  });
}
