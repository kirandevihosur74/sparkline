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

import ClaimStrip, { ClaimBoxKey } from "./ClaimStrip";
import ClaimBoxOverlay from "./ClaimBoxOverlay";
import ConfidenceMeter from "./ConfidenceMeter";
import DecisionBar from "./DecisionBar";
import EvidenceFaceoff from "./EvidenceFaceoff";
import QueryTracePanel from "./QueryTracePanel";
import ViewerEmbed, { type ViewerHandle } from "./ViewerEmbed";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDocumentPage } from "@/lib/data";
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

/**
 * The two views of the claim's page, in the order the pane offers them.
 *
 * Named for what each one IS, so neither over-claims: the first is the page's
 * text with the extracted claims marked, the second is the file. Offered only
 * where both exist — see DocumentPane.
 */
const PAGE_VIEWS: readonly { label: string; sourcePdf: boolean }[] = [
  { label: "Marked text", sourcePdf: false },
  { label: "Source PDF", sourcePdf: true },
];

/** The route segments the review id sits between: /reviews/{id}/review. */
const REVIEWS_SEGMENT = "reviews";
const REVIEW_SEGMENT = "review";

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
  /**
   * Opens a finding — the same state change clicking its queue card makes.
   *
   * The claim boxes drawn over the page are navigation, not decoration:
   * clicking the box around "one of the largest residential solar installers"
   * selects that finding. Selection lives in ReviewWorkspace and belongs
   * there; this is the queue's own `setSelectedId` reaching the page.
   *
   * Absent ⇒ nothing on this screen can change the selection, so no box is
   * rendered as a button and none takes a pointer cursor. The boxes still
   * draw — they are what the run read — but a control that looks live and
   * does nothing is the dead control this project keeps refusing.
   */
  onSelectFinding?: (findingId: string) => void;
  /**
   * Whether the page shows every claim Nutrient DWS extracted, or only the
   * ones that produced findings.
   *
   * LIFTED OUT OF DocumentPane, where it used to live, because two things
   * outside this column now read it: the keyboard layer binds a key to it, and
   * a key whose state lives three components down cannot be bound without
   * reaching for a ref. One piece of state, one owner, two readers.
   */
  showAllClaims: boolean;
  onShowAllClaimsChange: (showAll: boolean) => void;
  /**
   * Reports which page is ON SCREEN — not which page the claim is on.
   *
   * The side panel's Extraction tab serialises "the claims on this page", and
   * the claim strip counts the same page. In the marked-text view those are
   * the claim's page and never diverge; in the source PDF the reader can
   * scroll, and the two would drift apart if the panel resolved the page for
   * itself. So the pane — the only thing that knows where the viewer actually
   * is — reports it, and the panel renders what the strip counts.
   */
  onPageContextChange?: (context: PageContext) => void;
  /**
   * True while the side panel is open.
   *
   * The panel's Reasoning tab renders the query trace, and so does this
   * column. Two copies of one trace on screen at once ask the reviewer which
   * is the evidence, so the inline copy stands down while the panel holds it.
   * Closing the panel gives it back — the trace is never nowhere.
   */
  panelOpen?: boolean;
}

/** The document and page currently on screen in the pane. */
export interface PageContext {
  documentId: string;
  page: number;
}

export default function ReviewDetail({
  finding,
  documents,
  trace,
  reviewer,
  signature,
  record,
  signing,
  signError,
  onApprove,
  onReject,
  onUndo,
  onNext,
  onSelectFinding,
  showAllClaims,
  onShowAllClaimsChange,
  onPageContextChange,
  panelOpen = false,
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
          verdict={finding.verdict}
          sources={sourcesOf(finding)}
          documents={documents}
          onSelectFinding={onSelectFinding}
          showAll={showAllClaims}
          onShowAllChange={onShowAllClaimsChange}
          onPageContextChange={onPageContextChange}
        />

        {/*
         * The SerpApi transparency beat belongs to the findings a live check
         * produced. TODO(schema-gap: StalenessFlag) — the trace is fixture-only;
         * the backend discards the result list and the accept/reject reasons.
         * See QueryTracePanel and lib/data/types.ts.
         */}
        {finding.verdict === "stale" && !panelOpen ? (
          <QueryTracePanel trace={trace} findingLabel={finding.label} />
        ) : null}
      </div>

      {/* Pinned: the decision never leaves the screen. */}
      <DecisionBar
        finding={finding}
        reviewer={reviewer}
        signature={signature}
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
 * ── TWO VIEWS OF ONE PAGE, AND WHY THE BOXES ARE IN THE FIRST ───────────────
 *
 * The pane shows the claim's page one of two ways, and the reviewer switches
 * between them:
 *
 *   · MARKED TEXT (the default where this build has transcribed the page) —
 *     ClaimBoxOverlay: the page's own words with a box drawn around every run
 *     Nutrient DWS read a claim out of. Each box IS the text it wraps, so it
 *     needs no coordinates and invents none.
 *   · SOURCE PDF — ViewerEmbed, the real file rendered by the Nutrient viewer,
 *     unchanged, one click away and still the thing a reviewer signs against.
 *
 * The boxes are deliberately NOT drawn on top of the viewer. Nothing in this
 * build has a rect to draw them at (TODO(schema-gap: claim anchors) below),
 * and the viewer renders inside a shadow root with its own scroll container
 * and zoom, so a layer in our DOM could only chase its geometry across the
 * shadow boundary and would drift at exactly the zoom levels a reviewer uses
 * to read a figure. See the note at the top of ClaimBoxOverlay.
 *
 * Only one of the two is mounted at a time: two renditions of one page stacked
 * would ask which is the evidence. Switching back to the PDF costs a WASM
 * reload, which is the price of not having two documents on screen, and the
 * viewer reports `null` as it unmounts — which is why the toolbar's position
 * line drops "showing page N" and "Jump to claim" disables itself in the text
 * view. Nothing there needs a special case: with the marked text on screen the
 * claim's page IS the page on screen, so there is nowhere to jump.
 *
 * TODO(schema-gap: claim anchors): DESIGN_SYSTEM.md item 5 lists
 * `highlightClaimId` as a VIEWER prop, and it is still deliberately not one —
 * nothing in this build can draw a highlight inside the PDF. `ClaimSource`
 * carries a page and a text `excerpt` but no rects, no text offsets and no
 * annotation id, and DWS's own bboxes are dropped in three places in
 * lib/nutrient.ts (TODO(schema-gap: bbox), lib/data/types.ts). What ships
 * instead is the marked-text view, whose boxes are ordered text runs from the
 * fixture rather than coordinates. Give the viewer a `highlightClaimId` when
 * ClaimSource grows `{ page, x, y, width, height }` in a named unit — and not
 * before.
 */
function DocumentPane({
  findingId,
  verdict,
  sources,
  documents,
  onSelectFinding,
  showAll,
  onShowAllChange,
  onPageContextChange,
}: {
  findingId: string;
  /** Tints the claim strip below the toolbar, in both of its states. */
  verdict: ClaimVerdict;
  sources: PaneSource[];
  documents: DocumentMeta[];
  /** Opens the finding a box belongs to. See ReviewDetailProps. */
  onSelectFinding?: (findingId: string) => void;
  /** Controlled by ReviewWorkspace so a key can reach it. See ReviewDetailProps. */
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
  /** Reports the page on screen upward. See ReviewDetailProps. */
  onPageContextChange?: (context: PageContext) => void;
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
  /* `showAll` — show every claim Nutrient DWS extracted from the page, or only
     the ones that produced findings — is a PROP now, owned by ReviewWorkspace.
     It was never ClaimStrip's, because the overlay drawn over the page reads
     the same one piece of state (the strip says how many claims there are; the
     boxes are them), and it is no longer this pane's either: the keyboard
     layer binds a key to it, and that layer lives at the top of the screen. */
  /* Which of the two views of the page is mounted. Sticky across findings on
     purpose: a reviewer who opened the source PDF is reading the file, and
     having it swapped back out from under them at the next finding would be
     the pane deciding what they are reading. */
  const [sourcePdf, setSourcePdf] = useState(false);
  const viewerRef = useRef<ViewerHandle>(null);
  /* Which run is on screen, from the route — the same three-segment match
     FindingsQueue and ContextBar make, and for the same reason: this column is
     not passed the review id. NO FALLBACK to the demo run: a page transcribed
     for Wrenfield is not another run's page, and drawing it under another
     run's findings would be the pane showing evidence that is not this
     review's. */
  const reviewId = reviewIdInPath(usePathname());

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

  /* The claim's page as marked text, when this build has transcribed it.
     Undefined is a first-class answer — "this page has no transcription" is a
     different fact from "this page is blank" — and it is also what a live run
     gets, because the live registry is server-side and this client cannot
     resolve its documents. Either way the pane falls back to the PDF, which is
     the file itself and always correct. */
  const facsimile =
    reviewId === undefined
      ? undefined
      : getDocumentPage(active.source.documentId, claimPage, reviewId);
  /* Text is the default WHERE IT EXISTS: it is the only view that can show
     which words each claim was read from. */
  const markedText = facsimile !== undefined && !sourcePdf;

  /* The page the claim strip and the key describe: the one ON SCREEN, which is
     not the same page in the two views. The marked text always draws the
     claim's page; the PDF is scrollable, so there it is the page the viewer
     reports and only the claim's page until it has reported one. Reading the
     viewer's last position in the text view would let the strip count a page
     the reader is not looking at. */
  const stripPage = markedText ? claimPage : (visiblePage ?? claimPage);

  const claimPosition = pageCount
    ? `Claim on page ${claimPage} of ${pageCount}`
    : `Claim on page ${claimPage}`;

  return (
    <section aria-label="Source document" className="flex flex-col gap-3">
      {/* Renders nothing; reports the page on screen upward. See below. */}
      <PageContextReporter
        documentId={active.source.documentId}
        page={stripPage}
        onChange={onPageContextChange}
      />
      <div className="rounded border border-line bg-surface px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-label font-medium text-ink">
              {doc?.fileName ?? active.source.documentId}
            </span>
            {/* The provider of what is ACTUALLY on screen. The marked text is
                the extraction's output, read by Nutrient DWS; the PDF is the
                client-side viewer's. Leaving "Nutrient" against a page the
                viewer is not rendering would attribute the wrong work to the
                wrong product. */}
            <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
              {markedText ? PROVIDER_EXTRACTION : PROVIDER_VIEWER}
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

            {/* Only where there are two views to switch between. A page this
                build has not transcribed has one, and offering the choice
                would be offering a view that does not exist. */}
            {facsimile ? (
              <div
                aria-label="Page view"
                role="group"
                className="flex shrink-0 gap-px overflow-hidden rounded border border-line"
              >
                {PAGE_VIEWS.map((view) => {
                  const selected = view.sourcePdf === sourcePdf;
                  return (
                    <button
                      key={view.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSourcePdf(view.sourcePdf)}
                      className={`px-2.5 py-1 text-caption ${
                        selected
                          ? "bg-subtle font-medium text-ink"
                          : "bg-surface text-ink-3 hover:text-ink-2"
                      } focus-visible:shadow-selected focus-visible:outline-none`}
                    >
                      {view.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

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

      {/* What the run extracted from the page ON SCREEN, and — where the boxes
          are drawn — the control that reveals the claims which produced no
          finding. Its counts are per page and its copy says so; a page the run
          extracted nothing from gets the sentence saying that, not another
          page's numbers. */}
      <ClaimStrip
        documentId={active.source.documentId}
        page={stripPage}
        reviewId={reviewId}
        selectedFindingId={findingId}
        verdict={verdict}
        boxesShown={markedText}
        showAll={showAll}
        onShowAllChange={onShowAllChange}
      />

      {markedText && facsimile ? (
        <>
          {/* The boxes. Selection is the finding on screen, so the box around
              its claim is the heavier one, and clicking any other box moves
              the whole screen to that finding. */}
          <ClaimBoxOverlay
            page={facsimile}
            selectedFindingId={findingId}
            showAllClaims={showAll}
            onSelectFinding={onSelectFinding}
          />
          {/* What this is, in the data layer's own words: a text rendition
              with the claims marked, not a render of the page. The provider
              is named next to its output inside that sentence. */}
          <p className="text-caption text-ink-3">
            {facsimile.label} · {facsimile.provenance}
          </p>
        </>
      ) : (
        <ViewerEmbed
          ref={viewerRef}
          documentUrl={documentUrl(active.source.documentId)}
          page={claimPage}
          onVisiblePageChange={setVisiblePage}
        />
      )}

      {/* The key names the four box colours — the fourth only while show-all
          is drawing grey boxes to name, and none of them on the source PDF,
          which draws no boxes at all. A key is a promise about what is on the
          page. */}
      {markedText ? (
        <ClaimBoxKey
          documentId={active.source.documentId}
          page={stripPage}
          reviewId={reviewId}
          showAll={showAll}
        />
      ) : null}
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
/**
 * Reports the document and page on screen to whoever owns the side panel.
 *
 * A COMPONENT rather than an effect inside DocumentPane, and not by choice:
 * the pane returns early when a finding records no source location, and
 * `stripPage` is only knowable after that point. A hook cannot live below a
 * conditional return, and hoisting the page maths above it would mean
 * computing the whole view — active tab, facsimile, viewer position — for a
 * finding that has no page at all. So the report is mounted where the answer
 * exists, and renders nothing.
 *
 * The effect runs on the VALUES, not on the callback, and the parent guards
 * for equality, so a pane that re-renders without moving reports nothing.
 */
function PageContextReporter({
  documentId,
  page,
  onChange,
}: {
  documentId: string;
  page: number;
  onChange?: (context: PageContext) => void;
}) {
  useEffect(() => {
    onChange?.({ documentId, page });
  }, [documentId, page, onChange]);
  return null;
}

function documentUrl(documentId: string): string {
  return `/${documentId}.pdf`;
}

/**
 * The review id in `/reviews/{id}/review`, or undefined on any other path.
 *
 * Duplicated from FindingsQueue and ContextBar, where the same three-segment
 * match is module-private, and deliberately so: all three answer "which review
 * is on screen" from the route because none of them is passed it, and a shared
 * helper would be a data-layer function that reads a URL. Matching on segments
 * rather than a prefix keeps `/reviews/{id}` and `/reviews/{id}/audit` out.
 */
function reviewIdInPath(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 3 &&
    segments[0] === REVIEWS_SEGMENT &&
    segments[2] === REVIEW_SEGMENT
    ? segments[1]
    : undefined;
}
