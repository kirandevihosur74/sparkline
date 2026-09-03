// Create and execute live runs. A run analyzes two documents in slot order:
// the committed sample bundle by default, with an uploaded PDF replacing
// either slot. Every stage transition and reasoning line the pipeline reports
// is written to the run record as it happens, so a page polling the run sees
// it unfold.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { analyze } from "../analyze";
import type { RunEvent, RunStageUpdate } from "../types";
import {
  SAMPLE_BUNDLE,
  SAMPLE_REVIEW,
  SLOT_IDS,
  titleFromFileName,
  type BundleDocument,
  type SlotId,
} from "./bundle";
import { loadRun, newRunId, saveRun, saveUpload, type StoredRun } from "./store";

const INITIAL_STAGES: RunStageUpdate[] = [
  { id: "extract", state: "pending" },
  { id: "compare", state: "pending" },
  { id: "live_check", state: "pending" },
];

export interface UploadedSlot {
  slot: SlotId;
  fileName: string;
  bytes: Buffer;
}

export interface CreateRunOptions {
  /** PDFs replacing slots; a slot with no upload keeps the sample document. */
  uploads?: UploadedSlot[];
}

/** Record a new run, status "analyzing". Uploads are stored under data/uploads/<run>/. */
export function createRun(options: CreateRunOptions = {}): StoredRun {
  const id = newRunId();
  const uploads = new Map((options.uploads ?? []).map((u) => [u.slot, u]));

  const bundle: BundleDocument[] = SLOT_IDS.map((slot) => {
    const upload = uploads.get(slot);
    if (!upload) return SAMPLE_BUNDLE.find((d) => d.id === slot)!;
    return {
      id: slot,
      title: titleFromFileName(upload.fileName),
      author: "Uploaded document",
      docType: "document",
      // Sniffed from the text layer once the run reads it; empty until then.
      datedAt: "",
      fileName: upload.fileName,
      sourcePath: saveUpload(id, slot, upload.bytes),
      source: "upload",
    };
  });

  const sizes: Record<string, number> = {};
  for (const doc of bundle) {
    sizes[doc.id] = statSync(path.join(process.cwd(), doc.sourcePath)).size;
  }

  const uploaded = bundle.some((d) => d.source === "upload");
  return saveRun({
    id,
    createdAt: new Date().toISOString(),
    status: "analyzing",
    title: uploaded ? `${bundle[0].title} vs ${bundle[1].title}` : SAMPLE_REVIEW.title,
    subtitle: uploaded
      ? `${bundle.filter((d) => d.source === "upload").length === 2 ? "Uploaded bundle" : "Uploaded document with the sample"} · live run`
      : `${SAMPLE_REVIEW.subtitle} · live run`,
    bundle,
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
    // A document that printed no date on the bundle record gets the one the
    // text layer carries; the sample's authored dates are left alone.
    for (const doc of run.bundle) {
      const sniffed = run.result.dates?.[doc.id];
      if (!doc.datedAt && sniffed) doc.datedAt = sniffed;
    }
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
export async function runNow(options: CreateRunOptions = {}): Promise<StoredRun> {
  return executeRun(createRun(options).id);
}
