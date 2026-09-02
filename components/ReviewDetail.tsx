"use client";

/**
 * ReviewDetail — the RIGHT column of the review screen (screens 4 and 5).
 *
 * Reading order down the column: what was found (header), the evidence for it
 * (face-off, or the single-source panel for a claim-level verdict), the source
 * document itself, and — for a staleness finding — the live query that produced
 * the disagreement. The decision sits UNDERNEATH all of it, pinned.
 *
 * Scroll discipline (DESIGN_SYSTEM.md layout rules): the column is a min-h-0
 * flex column; the evidence stack carries `.scroll-col` and DecisionBar is
 * `shrink-0`, so Approve is on screen however long the document is. The page
 * itself never scrolls.
 *
 * Shadow discipline: the ONLY shadow-action on this screen lives inside
 * DecisionBar — "Approve finding" while the finding is open, "Next finding →"
 * once it is resolved. Nothing in this file carries it.
 *
 * Client component: the document pane owns which side of a contradiction is
 * on screen, and the decision callbacks are handed down from ReviewWorkspace.
 */

import ConfidenceMeter from "./ConfidenceMeter";
import DecisionBar from "./DecisionBar";
import EvidenceFaceoff from "./EvidenceFaceoff";
import QueryTracePanel from "./QueryTracePanel";
import ViewerEmbed from "./ViewerEmbed";
import { useState } from "react";
import type {
  AuditRecord,
  ClaimFinding,
  ClaimSource,
  ClaimVerdict,
  DocumentMeta,
  Finding,
  QueryTrace,
  RejectReason,
} from "@/lib/data";

/**
 * Verdict display copy and tone.
 *
 * Duplicated from FindingCard deliberately: that map is module-private there
 * and this screen must not edit a component another agent owns. It is keyed as
 * a total Record so a new ClaimVerdict fails the build rather than rendering an
 * unlabelled dot — and the label always comes off the finding, never off a
 * literal in the markup.
 */
const VERDICT: Record<
  ClaimVerdict,
  { label: string; text: string; dot: string }
> = {
  conflicting: { label: "Conflicting", text: "text-alert", dot: "bg-alert" },
  stale: { label: "Stale", text: "text-warn", dot: "bg-warn" },
  corroborated: { label: "Corroborated", text: "text-accent", dot: "bg-accent" },
  consistent: { label: "Consistent", text: "text-accent", dot: "bg-accent" },
  review_required: { label: "Review required", text: "text-ink", dot: "bg-ink" },
  unverified: { label: "Unverified", text: "text-ink-3", dot: "bg-line-strong" },
};

/**
 * Provider attribution, next to the output it belongs to.
 *
 * DESIGN_SYSTEM.md copy conventions: "Nutrient DWS" attributes extraction and
 * signing because the API does that work; the viewer is client-side WASM, so
 * its attribution is "Nutrient".
 *
 * TODO(schema-gap: provider attribution on findings): only PipelineStage
 * carries a `provider` field (lib/data/types.ts) — claims and documents record
 * WHAT was produced but never WHO produced it, so these are frontend
 * constants. Read the provider off the finding once the backend attributes it.
 */
const PROVIDER_EXTRACTION = "Nutrient DWS";
const PROVIDER_VIEWER = "Nutrient";

/** What each verdict's headline confidence measures. */
const CONFIDENCE_CAPTION: Record<ClaimVerdict, string> = {
  conflicting: "contradiction confidence",
  stale: "match confidence",
  corroborated: "extraction confidence",
  consistent: "extraction confidence",
  review_required: "extraction confidence",
  unverified: "extraction confidence",
};

export interface ReviewDetailProps {
  /** The selected finding, with this session's status already applied. */
  finding: Finding;
  /** Documents of the enclosing review — names each evidence side and tab. */
  documents: DocumentMeta[];
  /** The live-verification trace for this finding, when one was recorded. */
  trace?: QueryTrace;
  /** Who is signing — from the data layer, never a literal. */
  reviewer: string;
  /** The signed decision for this finding, once one exists. */
  record?: AuditRecord;
  /** True while Nutrient DWS is signing this finding's record. */
  signing?: boolean;
  /** Why the last signature attempt failed, if it did. */
  signError?: string;
  onApprove: (findingId: string) => void;
  onReject: (findingId: string, reason: RejectReason) => void;
  onUndo: (findingId: string) => void;
  /**
   * Advances to the next open finding. Absent when there is no next open
   * finding — DecisionBar then disables the button rather than pretending
   * there is somewhere to go.
   */
  onNext?: (findingId: string) => void;
}

export default function ReviewDetail({
  finding,
  documents,
  trace,
  reviewer,
  record,
  signing,
  signError,
  onApprove,
  onReject,
  onUndo,
  onNext,
}: ReviewDetailProps) {
  const verdict = VERDICT[finding.verdict];

  return (
    <section
      aria-label={`Finding detail — ${finding.label}`}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div className="scroll-col flex flex-1 flex-col gap-4 p-5">
        <header className="rounded border border-line bg-surface px-5 py-4">
          <span className="flex items-center gap-1.5 text-micro uppercase">
            {/* The only non-text mark in the system: a 5px status dot. */}
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${verdict.dot}`}
            />
            <span className={`font-medium ${verdict.text}`}>{verdict.label}</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-3">{finding.materiality} materiality</span>
          </span>

          <h1 className="mt-1.5 text-display font-semibold text-ink">
            {finding.label}
          </h1>

          {finding.summary ? (
            <p className="mt-2 text-body text-ink-2">{finding.summary}</p>
          ) : (
            /* The system says what it does not know. */
            <p className="mt-2 text-body text-ink-3">
              No summary was written for this finding — the evidence below is
              the whole of what the run recorded.
            </p>
          )}

          <div className="mt-3">
            <ConfidenceMeter
              value={headlineConfidence(finding)}
              caption={CONFIDENCE_CAPTION[finding.verdict]}
            />
          </div>
        </header>

        {finding.verdict === "conflicting" || finding.verdict === "stale" ? (
          <EvidenceFaceoff finding={finding} documents={documents} />
        ) : (
          <ClaimEvidence finding={finding} documents={documents} />
        )}

        {/* Remounts per finding so the pane always opens on the finding's own
            primary source rather than on whichever tab was last chosen. */}
        <DocumentPane
          key={finding.id}
          sources={sourcesOf(finding)}
          documents={documents}
        />

        {/*
         * The SerpApi transparency beat belongs to the findings a live check
         * produced. TODO(schema-gap: StalenessFlag) — the trace is fixture-only;
         * the backend discards the result list and the accept/reject reasons.
         * See QueryTracePanel and lib/data/types.ts.
         */}
        {finding.verdict === "stale" ? (
          <QueryTracePanel trace={trace} findingLabel={finding.label} />
        ) : null}
      </div>

      {/* Pinned: the decision never leaves the screen. */}
      <DecisionBar
        finding={finding}
        reviewer={reviewer}
        record={record}
        signing={signing}
        signError={signError}
        onApprove={onApprove}
        onReject={onReject}
        onUndo={onUndo}
        onNext={onNext}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Evidence for a claim-level verdict
// ---------------------------------------------------------------------------

/**
 * EvidenceFaceoff faces two sides off against each other, so it takes only the
 * two findings that HAVE two sides (contradiction, staleness). A ClaimFinding
 * has one source and a verdict rationale — showing it in a face-off would
 * invent an opposing side that does not exist, so it gets this single-source
 * panel instead.
 */
function ClaimEvidence({
  finding,
  documents,
}: {
  finding: ClaimFinding;
  documents: DocumentMeta[];
}) {
  const { source, claim } = finding;

  return (
    <section
      aria-label={`Evidence: ${finding.label}`}
      className="rounded border border-line bg-surface px-5 py-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate text-label font-medium text-ink">
          {documentName(source.documentId, documents)}
        </span>
        <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
          {PROVIDER_EXTRACTION}
        </span>
      </div>
      <span className="mt-1.5 block text-caption text-ink-3">
        Page {source.page} · {claim.field}
      </span>

      <p className="tabular mt-3 text-value font-medium break-words text-ink">
        {claim.value}
      </p>

      <div className="mt-3">
        <ConfidenceMeter value={claim.confidence} caption="extraction confidence" />
      </div>

      {source.excerpt ? (
        /* A quoted excerpt — one of the two places serif is allowed. */
        <p className="mt-3 font-serif text-body break-words text-ink-2">
          &ldquo;{source.excerpt}&rdquo;
        </p>
      ) : (
        <p className="mt-3 text-body text-ink-3">
          No excerpt was captured at this location.
        </p>
      )}

      {finding.note ? (
        <p className="mt-3 border-t border-line-soft pt-3 text-body text-ink-2">
          {finding.note}
        </p>
      ) : (
        <p className="mt-3 border-t border-line-soft pt-3 text-body text-ink-3">
          No rationale was recorded for this verdict.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Document pane — DESIGN_SYSTEM.md item 5
// ---------------------------------------------------------------------------

/** One selectable source behind the viewer: a document plus the claim's page. */
interface PaneSource {
  /** Stable identity for the two sides of a contradiction. The strip LABELS
   *  each side with its document's own name, never with an invented "Side A". */
  key: string;
  source: ClaimSource;
}

/**
 * The toolbar DESIGN_SYSTEM.md item 5 asks for, wrapped around the shipped
 * ViewerEmbed: filename, provider, and the page the claim sits on. The tab
 * strip appears only when a finding cites two documents (a contradiction), so
 * the reviewer can read both sides of the disagreement in their own pages.
 *
 * TODO(schema-gap: Document): DocumentMeta names a `fileName` but the backend
 * persists NO addressable URL for an uploaded document — the upload route
 * streams bytes to DWS and keeps nothing. Until a canonical Document carries
 * its own URL, the served copy is resolved by document id below.
 *
 * The viewer cannot yet be scrolled to the claim: ViewerEmbed takes only
 * `documentUrl`, with no `page` / `highlightClaimId` props, so the pane STATES
 * the page instead of offering a "Jump to claim" control that would do nothing.
 */
function DocumentPane({
  sources,
  documents,
}: {
  sources: PaneSource[];
  documents: DocumentMeta[];
}) {
  const [activeKey, setActiveKey] = useState(sources[0]?.key);
  const active = sources.find((s) => s.key === activeKey) ?? sources[0];

  if (!active) {
    return (
      <section className="rounded border border-line bg-surface px-5 py-4">
        <p className="text-body text-ink-3">
          There is no page to show for this finding: no source location was
          recorded against it.
        </p>
      </section>
    );
  }

  const doc = documents.find((d) => d.id === active.source.documentId);

  return (
    <section aria-label="Source document" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded border border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-label font-medium text-ink">
            {doc?.fileName ?? active.source.documentId}
          </span>
          <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
            {PROVIDER_VIEWER}
          </span>
          <span className="tabular text-caption text-ink-3">
            {doc
              ? `Claim on page ${active.source.page} of ${doc.pageCount}`
              : `Claim on page ${active.source.page}`}
          </span>
        </div>

        {sources.length > 1 ? (
          <div
            aria-label="Source document"
            role="group"
            className="flex shrink-0 gap-px overflow-hidden rounded border border-line"
          >
            {sources.map((paneSource) => {
              const selected = paneSource.key === active.key;
              return (
                <button
                  key={paneSource.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveKey(paneSource.key)}
                  className={`px-2.5 py-1 text-caption ${
                    selected
                      ? "bg-subtle font-medium text-ink"
                      : "bg-surface text-ink-3 hover:text-ink-2"
                  } focus-visible:shadow-selected focus-visible:outline-none`}
                >
                  {documentName(paneSource.source.documentId, documents)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <ViewerEmbed documentUrl={documentUrl(active.source.documentId)} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Derivation helpers — every value below comes off the finding
// ---------------------------------------------------------------------------

/**
 * The confidence the header leads with, read off the union member that owns
 * it: a flag's own confidence for the two flag findings, the claim's
 * extraction confidence for everything else. Already normalized 0–1 by
 * lib/data — rendered as a percentage, never re-normalized.
 */
function headlineConfidence(finding: Finding): number {
  switch (finding.verdict) {
    case "conflicting":
      return finding.flag.confidence;
    case "stale":
      return finding.flag.confidence;
    default:
      return finding.claim.confidence;
  }
}

/** The source locations behind a finding, in the order they are read. */
function sourcesOf(finding: Finding): PaneSource[] {
  switch (finding.verdict) {
    case "conflicting":
      return [
        { key: "a", source: finding.sourceA },
        { key: "b", source: finding.sourceB },
      ];
    case "stale":
      return [{ key: "document", source: finding.source }];
    default:
      return [{ key: "document", source: finding.source }];
  }
}

/** Names a document, falling back to its id rather than inventing a title. */
function documentName(
  documentId: string,
  documents: DocumentMeta[],
): string {
  return documents.find((doc) => doc.id === documentId)?.title ?? documentId;
}

/** See TODO(schema-gap: Document) on DocumentPane. */
function documentUrl(documentId: string): string {
  return `/${documentId}.pdf`;
}
