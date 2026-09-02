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
import ViewerEmbed, { type ViewerHandle } from "./ViewerEmbed";
import { useRef, useState } from "react";
import type {
  AuditRecord,
  ClaimFinding,
  ClaimSource,
  ClaimVerdict,
  DocumentMeta,
  Finding,
  DecisionSignature,
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
  /**
   * The pending-state signature line for THIS run, derived in lib/data. Passed
   * through rather than defaulted inside DecisionBar, because DecisionBar's
   * default resolves against the demo run and would name the demo's signer on
   * every other run.
   */
  signature?: DecisionSignature;
  /** The signed decision for this finding, once one exists. */
  record?: AuditRecord;
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
  signature,
  record,
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

        {/* NOT keyed by finding: two findings can cite the same file, and
            remounting would restart the viewer's WASM to show a document that
            is already on screen. The pane resets its own tab selection when
            the finding changes and moves the page instead. */}
        <DocumentPane
          findingId={finding.id}
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
        signature={signature}
        record={record}
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
 * The toolbar DESIGN_SYSTEM.md item 5 asks for, wrapped around ViewerEmbed:
 * filename, provider, page position, and "Jump to claim". The tab strip
 * appears only when a finding cites two documents (a contradiction), so the
 * reviewer can read both sides of the disagreement in their own pages.
 *
 * TODO(schema-gap: Document): DocumentMeta names a `fileName` but the backend
 * persists NO addressable URL for an uploaded document — the upload route
 * streams bytes to DWS and keeps nothing. Until a canonical Document carries
 * its own URL, the served copy is resolved by document id below.
 *
 * ── WHAT "JUMP TO CLAIM" ACTUALLY DOES ──────────────────────────────────────
 *
 * It moves the mounted viewer to `ClaimSource.page` through
 * `ViewerHandle.jumpToPage` — a `setViewState` call on the live instance, so
 * it is immediate and costs no WASM restart. Being a real `<button>`, Enter
 * and Space fire it once it has focus; there is no separate key handler here,
 * and no screen-level Enter binding, because binding Enter would swallow it
 * from the Approve and Reject buttons that need it. See the REFUSED BINDINGS
 * note in lib/data/fixtures.ts: it can be un-refused now that the page prop
 * exists, and that is a change to the shortcut list, not to this file.
 *
 * The button is disabled — never hidden, and never a no-op — in the three
 * cases where there is nowhere to go, each of which the copy already accounts
 * for:
 *   · no document mounted yet (`visiblePage` is null); the viewer itself says
 *     "Loading document…",
 *   · the claim's page is already the visible page; the line to its left reads
 *     "Claim on page 2 of 2 · showing page 2", which is the reason,
 *   · the run recorded a page this file does not have; the note below the row
 *     says so outright.
 *
 * The page position is read back OUT of the viewer rather than assumed: the
 * reviewer can scroll the document by hand, and a toolbar that kept claiming
 * "showing page 2" while page 1 was on screen would be the pane lying about
 * the evidence.
 *
 * TODO(schema-gap: claim anchors): DESIGN_SYSTEM.md item 5 also lists
 * `highlightClaimId`, and it is deliberately not a prop yet — nothing in this
 * build can draw it. `ClaimSource` carries a page and a text `excerpt` but no
 * rects, no text offsets and no annotation id, so the viewer could only guess
 * at the location by re-searching the excerpt string. A prop that took an id
 * and highlighted nothing is the dead control this project keeps refusing.
 * Add it when ClaimSource grows a bounding box.
 */
function DocumentPane({
  findingId,
  sources,
  documents,
}: {
  findingId: string;
  sources: PaneSource[];
  documents: DocumentMeta[];
}) {
  const [activeKey, setActiveKey] = useState(sources[0]?.key);
  /* The pane opens on the finding's own primary source. This used to be a
     `key` on the element, which threw the viewer away with the tab selection;
     resetting the one piece of state that is actually stale lets two findings
     in the same file share one loaded document. */
  const [shownFindingId, setShownFindingId] = useState(findingId);
  if (shownFindingId !== findingId) {
    setShownFindingId(findingId);
    setActiveKey(sources[0]?.key);
  }

  /** Where the viewer actually is. Null until a document is mounted. */
  const [visiblePage, setVisiblePage] = useState<number | null>(null);
  const viewerRef = useRef<ViewerHandle>(null);

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
  const pageCount = doc?.pageCount;
  const claimPage = active.source.page;
  /* A page the file does not have is a page the viewer cannot reach. When the
     document's length is unknown, we do not pretend to know either. */
  const claimPageExists =
    pageCount === undefined || (claimPage >= 1 && claimPage <= pageCount);
  const canJump =
    visiblePage !== null && claimPageExists && visiblePage !== claimPage;

  const claimPosition = pageCount
    ? `Claim on page ${claimPage} of ${pageCount}`
    : `Claim on page ${claimPage}`;

  return (
    <section aria-label="Source document" className="flex flex-col gap-3">
      <div className="rounded border border-line bg-surface px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-label font-medium text-ink">
              {doc?.fileName ?? active.source.documentId}
            </span>
            <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
              {PROVIDER_VIEWER}
            </span>
            <span className="tabular text-caption text-ink-3">
              {visiblePage === null
                ? claimPosition
                : `${claimPosition} · showing page ${visiblePage}`}
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canJump}
              onClick={() => viewerRef.current?.jumpToPage(claimPage)}
              aria-label={`Jump to the claim on page ${claimPage}`}
              /* A stable hook, not a value on screen — the same seam
                 ReviewWorkspace already uses to reach the reject control
                 (`[role="group"] button[aria-expanded]`). A screen-level Enter
                 binding can click this without importing anything from here
                 and without matching on copy, and it inherits `disabled` for
                 free: when there is nowhere to go the key does nothing, which
                 is the honest outcome. */
              data-jump-to-claim=""
              className="rounded border border-line bg-surface px-2.5 py-1 text-caption font-medium text-ink hover:bg-subtle focus-visible:shadow-selected focus-visible:outline-none disabled:text-ink-3 disabled:hover:bg-surface"
            >
              Jump to claim
            </button>

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
        </div>

        {/* The system says what it does not know — and what it cannot reach. */}
        {claimPageExists ? null : (
          <p className="mt-2 text-caption text-ink-3">
            There is nowhere to jump: the run recorded this claim on page{" "}
            {claimPage}, and this file has {pageCount}.
          </p>
        )}
      </div>

      <ViewerEmbed
        ref={viewerRef}
        documentUrl={documentUrl(active.source.documentId)}
        page={claimPage}
        onVisiblePageChange={setVisiblePage}
      />
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
