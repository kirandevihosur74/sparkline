"use client";

/**
 * NewReviewComposer — the body of screen 1, `/reviews/new`.
 *
 * Two labelled DocumentSlots, a loader for the one bundle that actually runs,
 * and the screen's single primary action pinned in a footer that never
 * scrolls away.
 *
 * Client component for two reasons: whether the slots are filled is local UI
 * state (the sample bundle is loaded on click, not on load), and "Run
 * analysis" is the one place this screen talks to the server — it POSTs
 * /api/runs to start the real pipeline and routes to the run it created.
 * Every value it renders still arrives as a prop from the data layer.
 *
 * Shadow discipline: `shadow-action` appears on exactly one element, the
 * "Run analysis" button, and Tailwind's `disabled:shadow-none` takes it away
 * while the slots are empty (the same pattern DecisionBar uses for Approve).
 * No other element on this screen has a shadow.
 *
 * TODO(schema-gap: Document): there is no upload endpoint and no Document
 * entity — see the marker on components/DocumentSlot.tsx. The consequence is
 * visible in this component's copy rather than hidden behind a file picker
 * that could not work.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import DocumentSlot, { formatFileSize } from "@/components/DocumentSlot";
import type { DocumentMeta, PipelineStage } from "@/lib/data";

/**
 * The two positions a review compares. Slot names and their descriptions are
 * chrome — the documents that fill them are data. Order matches the data
 * layer's slot order (getDocuments returns the memo first).
 */
const SLOTS = [
  {
    key: "primary",
    label: "Primary document",
    role: "The document under review. Every claim in it is extracted first.",
  },
  {
    key: "cross-reference",
    label: "Cross-reference document",
    role: "Checked against the primary, claim by claim, to surface disagreements.",
  },
] as const;

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
   * starts a live run; when it does not, the committed replay is offered
   * instead so the demo never dead-ends.
   */
  liveRunAvailable: boolean;
  /** The committed run's analyzing state — the fallback when no live run can start. */
  replayHref?: string;
}

export default function NewReviewComposer({
  bundle,
  reviewTitle,
  reviewSubtitle,
  stages,
  liveRunAvailable,
  replayHref,
}: NewReviewComposerProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const bundleComplete = bundle.length >= SLOTS.length;
  const filled = loaded ? bundle.slice(0, SLOTS.length) : [];
  const runnable = liveRunAvailable || replayHref !== undefined;
  const canRun = filled.length === SLOTS.length && runnable && !starting;

  const totalPages = filled.reduce((sum, doc) => sum + doc.pageCount, 0);
  const totalSize = formatFileSize(
    filled.reduce((sum, doc) => sum + doc.sizeBytes, 0),
  );

  const run = async () => {
    setError(undefined);
    if (!liveRunAvailable) {
      if (replayHref) router.push(replayHref);
      return;
    }
    setStarting(true);
    try {
      const response = await fetch("/api/runs", { method: "POST" });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.error ?? `The run could not be started (HTTP ${response.status}).`);
      }
      router.push(`/reviews/${encodeURIComponent(body.id)}?state=analyzing`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStarting(false);
    }
  };

  const footerNote = (() => {
    if (starting) return "Recording the run and handing the bundle to Nutrient DWS…";
    if (error) return error;
    if (filled.length !== SLOTS.length) return "Load the sample bundle to enable this.";
    if (!runnable) return "There is no run to open: the demo review is not in the data layer.";
    if (liveRunAvailable) {
      return "Runs the pipeline live: Nutrient DWS reads both documents, Sparkline compares the claims, SerpApi checks what only the public record can settle.";
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
              Sparkline extracts every claim from a primary document, compares
              it against a cross-reference, and checks what disagrees against
              live public sources before routing anything to you.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {SLOTS.map((slot, index) => (
              <DocumentSlot
                key={slot.key}
                label={slot.label}
                role={slot.role}
                document={filled[index]}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SampleBundle
              bundle={bundle}
              bundleComplete={bundleComplete}
              reviewTitle={reviewTitle}
              reviewSubtitle={reviewSubtitle}
              loaded={loaded}
              onLoad={() => setLoaded(true)}
              onClear={() => setLoaded(false)}
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
            {filled.length === SLOTS.length
              ? `${filled.length} documents queued · ${totalPages} pages${
                  totalSize ? ` · ${totalSize}` : ""
                }`
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
             is the inverse of ink and only reads on `bg-ink`. Left on a
             `line-strong` slab the label measured 1.52:1 in light and 1.78:1
             in dark — an unreadable primary action. `line` + `ink-2` keeps
             the button's shape and clears AA in both themes (6.43:1 / 5.07:1),
             the same pair ErrorPanel's disabled retry already uses. */
          className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line disabled:text-ink-2 disabled:shadow-none"
        >
          {starting ? "Starting run…" : "Run analysis"}
        </button>
      </footer>
    </section>
  );
}

/**
 * The loader for the one pair of documents that exists in this build. It names
 * the review the pair produces so the reviewer knows what they are about to
 * open, and counts the bundle from the bundle itself.
 */
function SampleBundle({
  bundle,
  bundleComplete,
  reviewTitle,
  reviewSubtitle,
  loaded,
  onLoad,
  onClear,
}: {
  bundle: DocumentMeta[];
  bundleComplete: boolean;
  reviewTitle?: string;
  reviewSubtitle?: string;
  loaded: boolean;
  onLoad: () => void;
  onClear: () => void;
}) {
  return (
    <section className="flex flex-col rounded border border-line bg-surface px-5 py-4">
      <h2 className="text-micro uppercase text-ink-3">Sample bundle</h2>

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
      </p>

      <div className="mt-auto pt-4">
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
            The slots cannot be filled: the bundle carries{" "}
            {bundle.length === 1 ? "one document" : `${bundle.length} documents`}{" "}
            and a review compares {SLOTS.length}.
          </p>
        )}
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
