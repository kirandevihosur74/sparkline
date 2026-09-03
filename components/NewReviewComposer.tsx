"use client";

/**
 * NewReviewComposer — the body of screen 1, `/reviews/new`.
 *
 * Two labelled DocumentSlots, each a real dropzone: pick or drop a PDF and it
 * is sent with the run. The committed sample bundle is offered beside them
 * as the quick path — it fills whichever slots are still empty, so a reviewer
 * can check their own memo against the sample engineering report.
 *
 * "Run analysis" is the one place this screen talks to the server: it POSTs
 * /api/runs (multipart when a file was picked) and routes to the run it
 * created. Every value it renders still arrives as a prop from the data
 * layer, except the preview card for a picked file, which is read off the
 * file itself and says what the run has not counted yet.
 *
 * Shadow discipline: `shadow-action` appears on exactly one element, the
 * "Run analysis" button, and Tailwind's `disabled:shadow-none` takes it away
 * while a slot is empty (the same pattern DecisionBar uses for Approve).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import DocumentSlot, { formatFileSize } from "@/components/DocumentSlot";
import type { DocumentMeta, PipelineStage } from "@/lib/data";

type SlotId = "doc-a" | "doc-b";

/**
 * The two positions a review compares. Slot names and their descriptions are
 * chrome — the documents that fill them are data. Order matches the data
 * layer's slot order (getDocuments returns the memo first).
 */
const SLOTS: ReadonlyArray<{ id: SlotId; field: string; label: string; role: string }> = [
  {
    id: "doc-a",
    field: "docA",
    label: "Primary document",
    role: "The document under review. Every claim in it is extracted first.",
  },
  {
    id: "doc-b",
    field: "docB",
    label: "Cross-reference document",
    role: "Checked against the primary, claim by claim, to surface disagreements.",
  },
];

export interface NewReviewComposerProps {
  /**
   * The committed sample pair, in slot order, straight from getDocuments().
   * Fewer documents than slots is a real state, not an error: the loader
   * disables itself and says the bundle is short rather than half-filling.
   */
  bundle: DocumentMeta[];
  /** Name of the review the bundle produces. Undefined when it is missing. */
  reviewTitle?: string;
  /** Its metadata line, shown under the title on the loader. */
  reviewSubtitle?: string;
  /**
   * Stages of that run, used only for their labels and provider attribution —
   * provider names appear next to the work they do, before it is done.
   */
  stages: PipelineStage[];
  /**
   * Whether the server has both provider keys. When it does, "Run analysis"
   * starts a live run; when it does not, the committed replay is offered for
   * the sample bundle so the demo never dead-ends (uploads need a live run).
   */
  liveRunAvailable: boolean;
  /** The committed run's analyzing state — the fallback when no live run can start. */
  replayHref?: string;
  /** Largest upload the server accepts, in bytes. */
  maxUploadBytes: number;
}

/** What a picked file looks like in a slot before the run has read it. */
function previewOf(file: File, id: SlotId): DocumentMeta {
  return {
    id,
    title: file.name.replace(/\.[Pp][Dd][Ff]$/, "").replace(/[_-]+/g, " ").trim() || "Untitled document",
    author: "Uploaded from your computer",
    docType: "document",
    datedAt: "",
    pageCount: 0,
    fileName: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date(file.lastModified || Date.now()).toISOString(),
    claimCount: 0,
  };
}

export default function NewReviewComposer({
  bundle,
  reviewTitle,
  reviewSubtitle,
  stages,
  liveRunAvailable,
  replayHref,
  maxUploadBytes,
}: NewReviewComposerProps) {
  const router = useRouter();
  const [picked, setPicked] = useState<Partial<Record<SlotId, File>>>({});
  const [useSample, setUseSample] = useState<Record<SlotId, boolean>>({
    "doc-a": false,
    "doc-b": false,
  });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const bundleComplete = bundle.length >= SLOTS.length;

  /** What each slot shows: the picked file, else the sample document, else nothing. */
  const slotDocs = SLOTS.map((slot, index) => {
    const file = picked[slot.id];
    if (file) return previewOf(file, slot.id);
    if (useSample[slot.id]) return bundle[index];
    return undefined;
  });
  const filled = slotDocs.filter((doc): doc is DocumentMeta => doc !== undefined);
  const pickedCount = Object.values(picked).filter(Boolean).length;
  const allFilled = filled.length === SLOTS.length;
  const anySampleLoaded = SLOTS.some((slot) => useSample[slot.id]);

  // Uploads need the live pipeline; the sample bundle can fall back to replay.
  const runnable = liveRunAvailable || (pickedCount === 0 && replayHref !== undefined);
  const canRun = allFilled && runnable && !starting;

  const knownPages = filled.reduce((sum, doc) => sum + doc.pageCount, 0);
  const uncounted = filled.some((doc) => doc.pageCount === 0);
  const totalSize = formatFileSize(filled.reduce((sum, doc) => sum + doc.sizeBytes, 0));

  const loadSample = () =>
    setUseSample({
      "doc-a": !picked["doc-a"],
      "doc-b": !picked["doc-b"],
    });
  const clearAll = () => {
    setPicked({});
    setUseSample({ "doc-a": false, "doc-b": false });
    setError(undefined);
  };

  const run = async () => {
    setError(undefined);
    if (!liveRunAvailable) {
      if (replayHref) router.push(replayHref);
      return;
    }
    setStarting(true);
    try {
      let body: FormData | undefined;
      if (pickedCount > 0) {
        body = new FormData();
        for (const slot of SLOTS) {
          const file = picked[slot.id];
          if (file) body.append(slot.field, file, file.name);
        }
      }
      const response = await fetch("/api/runs", { method: "POST", body });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error ?? `The run could not be started (HTTP ${response.status}).`);
      }
      router.push(`/reviews/${encodeURIComponent(result.id)}?state=analyzing`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStarting(false);
    }
  };

  const footerNote = (() => {
    if (starting) {
      return pickedCount > 0
        ? "Uploading and handing the documents to Nutrient DWS…"
        : "Recording the run and handing the bundle to Nutrient DWS…";
    }
    if (error) return error;
    if (!allFilled) {
      return pickedCount > 0
        ? "Fill the other slot — upload a second PDF, or load the sample bundle into it."
        : "Upload two PDFs, or load the sample bundle.";
    }
    if (!runnable) {
      return pickedCount > 0
        ? "Uploads need both provider keys on the server. Load the sample bundle to open the recorded run instead."
        : "There is no run to open: the demo review is not in the data layer.";
    }
    if (liveRunAvailable) {
      return pickedCount > 0
        ? "Runs the pipeline live on your files: Nutrient DWS reads both documents, Sparkline compares the claims, SerpApi checks what only the public record can settle."
        : "Runs the pipeline live: Nutrient DWS reads both documents, Sparkline compares the claims, SerpApi checks what only the public record can settle.";
    }
    return "Opens the committed run: provider keys are not configured on this server, so this build replays a recorded analysis.";
  })();

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* The page never scrolls; this column does. */}
      <div className="scroll-col flex-1 px-8 py-7">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header>
            <p className="text-micro uppercase text-ink-3">New review</p>
            <h1 className="mt-1.5 text-display font-semibold text-ink">
              Cross-check two documents
            </h1>
            <p className="mt-2 max-w-2xl text-body text-ink-2">
              Upload the two documents you want checked against each other and
              against the public record, or load the sample bundle. Sparkline
              extracts every claim, compares them, and routes anything doubtful
              to you.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {SLOTS.map((slot, index) => (
              <DocumentSlot
                key={slot.id}
                label={slot.label}
                role={slot.role}
                document={slotDocs[index]}
                maxBytes={maxUploadBytes}
                onPick={(file) => {
                  setError(undefined);
                  setPicked((current) => ({ ...current, [slot.id]: file }));
                }}
                onClear={() => {
                  setPicked((current) => {
                    const next = { ...current };
                    delete next[slot.id];
                    return next;
                  });
                  setUseSample((current) => ({ ...current, [slot.id]: false }));
                }}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SampleBundle
              bundle={bundle}
              bundleComplete={bundleComplete}
              reviewTitle={reviewTitle}
              reviewSubtitle={reviewSubtitle}
              loaded={anySampleLoaded}
              pickedCount={pickedCount}
              onLoad={loadSample}
              onClear={clearAll}
            />
            <RunOutline stages={stages} />
          </div>
        </div>
      </div>

      {/* Pinned: the primary action stays visible however long the column
          above it grows. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line bg-subtle px-8 py-3.5">
        <div className="min-w-0">
          <p aria-live="polite" className="tabular text-label text-ink-2">
            {allFilled
              ? `${filled.length} documents queued${
                  uncounted
                    ? knownPages > 0
                      ? ` · ${knownPages} pages + pages counted at run`
                      : " · pages counted at run"
                    : ` · ${knownPages} pages`
                }${totalSize ? ` · ${totalSize}` : ""}${
                  pickedCount > 0 ? ` · ${pickedCount} uploaded` : ""
                }`
              : filled.length === 1
                ? "One slot filled."
                : "Both slots are empty."}
          </p>
          <p
            aria-live="polite"
            className={`mt-0.5 text-caption ${error ? "text-alert" : "text-ink-3"}`}
          >
            {footerNote}
          </p>
        </div>

        {/* The one shadow-action element on this screen. */}
        <button
          type="button"
          disabled={!canRun}
          onClick={run}
          /* Disabled is a COLOUR PAIR, not just a background swap: `text-surface`
             is the inverse of ink and only reads on `bg-ink`. `line` + `ink-2`
             keeps the button's shape and clears AA in both themes, the same pair
             ErrorPanel's disabled retry uses. */
          className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line disabled:text-ink-2 disabled:shadow-none"
        >
          {starting ? "Starting run…" : "Run analysis"}
        </button>
      </footer>
    </section>
  );
}

/**
 * The committed pair of documents, offered beside the upload slots. Loading it
 * fills the slots that are still empty, so a reviewer's own upload is kept.
 */
function SampleBundle({
  bundle,
  bundleComplete,
  reviewTitle,
  reviewSubtitle,
  loaded,
  pickedCount,
  onLoad,
  onClear,
}: {
  bundle: DocumentMeta[];
  bundleComplete: boolean;
  reviewTitle?: string;
  reviewSubtitle?: string;
  loaded: boolean;
  pickedCount: number;
  onLoad: () => void;
  onClear: () => void;
}) {
  return (
    <section className="flex flex-col rounded border border-line bg-surface px-5 py-4">
      <h2 className="text-micro uppercase text-ink-3">Or use the sample bundle</h2>

      {reviewTitle ? (
        <p className="mt-1.5 text-title font-medium text-ink">{reviewTitle}</p>
      ) : (
        <p className="mt-1.5 text-title font-medium text-ink-3">
          Unnamed — no review is attached to this bundle
        </p>
      )}

      {reviewSubtitle ? (
        <p className="mt-1 text-caption text-ink-3">{reviewSubtitle}</p>
      ) : null}

      <p className="tabular mt-3 text-caption text-ink-3">
        {bundle.length === 0
          ? "No documents are committed with this build."
          : `${bundle.length} committed ${
              bundle.length === 1 ? "document" : "documents"
            } · ${bundle.map((doc) => doc.fileName).join(", ")}`}
        {pickedCount > 0 && !loaded
          ? " · fills only the slot you have not uploaded to"
          : ""}
      </p>

      <div className="mt-auto flex items-center gap-3 pt-4">
        {bundleComplete ? (
          <button
            type="button"
            onClick={loaded ? onClear : onLoad}
            className="rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-ink hover:border-line-strong focus-visible:shadow-selected focus-visible:outline-none"
          >
            {loaded ? "Clear both slots" : "Load sample bundle"}
          </button>
        ) : (
          /* Consequence before cause: the button is gone, and why. */
          <p className="text-caption text-ink-3">
            The slots cannot be filled from the bundle: it carries{" "}
            {bundle.length === 1 ? "one document" : `${bundle.length} documents`}{" "}
            and a review compares {SLOTS.length}.
          </p>
        )}
        {pickedCount > 0 && !loaded ? (
          <button
            type="button"
            onClick={onClear}
            className="text-label font-medium text-ink-2 underline underline-offset-4 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            Clear uploads
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** What the run will do, stage by stage, with the provider that does it. */
function RunOutline({ stages }: { stages: PipelineStage[] }) {
  return (
    <section className="flex flex-col rounded border border-line bg-surface px-5 py-4">
      <h2 className="text-micro uppercase text-ink-3">What the run does</h2>

      {stages.length === 0 ? (
        <p className="mt-3 text-caption text-ink-3">
          The stages of this run are not recorded, so there is nothing to
          preview here.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className="flex items-baseline justify-between gap-3 border-t border-line-soft py-2 first:border-t-0 first:pt-0"
            >
              <span className="text-body text-ink-2">{stage.label}</span>
              {/* Provider names sit next to their own output. */}
              <span className="shrink-0 text-caption text-ink-3">
                {stage.provider}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
