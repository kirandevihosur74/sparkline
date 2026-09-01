"use client";

/**
 * NewReviewComposer — the body of screen 1, `/reviews/new`.
 *
 * Two labelled DocumentSlots, a loader for the one bundle that actually runs,
 * and the screen's single primary action pinned in a footer that never
 * scrolls away.
 *
 * Client component for one reason: whether the slots are filled is local UI
 * state (the sample bundle is loaded on click, not on load) and there is no
 * server to hold it. Every value it renders still arrives as a prop from the
 * data layer — the component reads nothing and fetches nothing.
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
 *
 * TODO(schema-gap: pipeline): the backend has no Run entity, so "Run analysis"
 * cannot start anything — it opens the committed fixture run instead. The
 * footer says so; when a Run exists, this button POSTs and routes to the run
 * it created.
 */

import { useState } from "react";
import Link from "next/link";
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
   * Where the primary action goes. Undefined when the demo review is not in
   * the data layer, which disables the action instead of routing to a 404.
   */
  runHref?: string;
}

export default function NewReviewComposer({
  bundle,
  reviewTitle,
  reviewSubtitle,
  stages,
  runHref,
}: NewReviewComposerProps) {
  const [loaded, setLoaded] = useState(false);

  const bundleComplete = bundle.length >= SLOTS.length;
  const filled = loaded ? bundle.slice(0, SLOTS.length) : [];
  const canRun = filled.length === SLOTS.length && runHref !== undefined;

  const totalPages = filled.reduce((sum, doc) => sum + doc.pageCount, 0);
  const totalSize = formatFileSize(
    filled.reduce((sum, doc) => sum + doc.sizeBytes, 0),
  );

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
          <p className="mt-0.5 text-caption text-ink-3">
            {canRun
              ? "Opens the committed run: this build replays a recorded analysis rather than calling the providers again."
              : runHref === undefined
                ? "There is no run to open: the demo review is not in the data layer."
                : "Load the sample bundle to enable this."}
          </p>
        </div>

        {canRun ? (
          /* The one shadow-action element on this screen. */
          <Link
            href={runHref}
            className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
          >
            Run analysis
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line-strong disabled:shadow-none"
          >
            Run analysis
          </button>
        )}
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
