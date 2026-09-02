// Create and execute live runs over the sample bundle. Every stage transition
// and reasoning line the pipeline reports is written to the run record as it
// happens, so a page polling the run sees it unfold.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { analyze } from "../analyze";
import type { RunEvent, RunStageUpdate } from "../types";
import { SAMPLE_BUNDLE } from "./bundle";
import { loadRun, newRunId, saveRun, type StoredRun } from "./store";

const INITIAL_STAGES: RunStageUpdate[] = [
  { id: "extract", state: "pending" },
  { id: "compare", state: "pending" },
  { id: "live_check", state: "pending" },
];

/** Record a new run over the sample bundle, status "analyzing". */
export function createRun(): StoredRun {
  const sizes: Record<string, number> = {};
  for (const doc of SAMPLE_BUNDLE) {
    sizes[doc.id] = statSync(path.join(process.cwd(), doc.sourcePath)).size;
  }
  return saveRun({
    id: newRunId(),
    createdAt: new Date().toISOString(),
    status: "analyzing",
    bundle: SAMPLE_BUNDLE,
    sizes,
    stages: INITIAL_STAGES.map((s) => ({ ...s })),
    events: [],
  });
}

/** Run the real pipeline for a recorded run, persisting progress as it goes. */
export async function executeRun(id: string): Promise<StoredRun> {
  const run = loadRun(id);
  if (!run) throw new Error(`No run with id ${id}`);

  const persist = () => saveRun(run);
  const onStage = (update: RunStageUpdate) => {
    const i = run.stages.findIndex((s) => s.id === update.id);
    if (i >= 0) run.stages[i] = { ...run.stages[i], ...update };
    else run.stages.push(update);
    persist();
  };
  const onEvent = (event: RunEvent) => {
    run.events.push(event);
    persist();
  };

  try {
    const docs = run.bundle.map((doc) => ({
      documentId: doc.id,
      fileName: doc.fileName,
      title: doc.title,
      file: readFileSync(path.join(process.cwd(), doc.sourcePath)),
    }));
    run.result = await analyze(docs, { onStage, onEvent });
    run.status = "complete";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run.error = message;
    run.status = "failed";
    // Whatever stage was running is the one that failed; nothing after it ran.
    const running = run.stages.find((s) => s.state === "running") ?? run.stages[0];
    running.state = "failed";
    running.failure = {
      headline: `The run stopped during ${running.id.replace("_", " ")} — the provider returned an error.`,
      detail: message,
      code: (message.match(/\b(4\d\d|5\d\d)\b/)?.[1] && `HTTP ${message.match(/\b(4\d\d|5\d\d)\b/)![1]}`) || "PROVIDER_ERROR",
      affectedClaimIds: [],
    };
    for (const s of run.stages) if (s.state === "pending") s.state = "skipped";
    run.events.push({
      elapsedMs: Date.now() - Date.parse(run.createdAt),
      message: `Run stopped: ${message}`,
    });
  }
  run.completedAt = new Date().toISOString();
  return persist();
}

/** Create and execute in one call — for scripts. */
export async function runNow(): Promise<StoredRun> {
  return executeRun(createRun().id);
}
