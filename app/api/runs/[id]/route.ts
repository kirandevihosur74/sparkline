import { NextResponse } from "next/server";
import { toPipelineEvent, toPipelineStage } from "@/lib/data/adapt";
import { loadRun } from "@/lib/runs/store";

/**
 * Progress of one live run — what the analyzing screen polls. Stages and
 * events come back in the data layer's PipelineStage / PipelineEvent shapes
 * so the run panel renders them without translation.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/runs/[id]">
) {
  const { id } = await params;
  const run = loadRun(id);
  if (!run) {
    return NextResponse.json({ error: `No run with id ${id}` }, { status: 404 });
  }
  return NextResponse.json(
    {
      id: run.id,
      status: run.status,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      stages: run.stages.map(toPipelineStage),
      events: run.events.map(toPipelineEvent),
      error: run.error,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
