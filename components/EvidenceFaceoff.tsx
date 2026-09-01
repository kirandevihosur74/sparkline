/**
 * EvidenceFaceoff — DESIGN_SYSTEM.md item 4.
 *
 * Three-column strip: document side · gap · comparison side. Each side carries
 * a source label with a PROVIDER TAG, one large tabular value, and a note; the
 * gap column carries the delta.
 *
 * Both sides come off ONE finding — never off two separately-passed props:
 *
 *   ContradictionFinding → values  finding.flag.claimA / finding.flag.claimB
 *                          places  finding.sourceA    / finding.sourceB
 *                          gap     finding.deltaLabel
 *   StalenessFinding     → values  finding.flag.claim.value / finding.flag.liveValue
 *                          places  finding.source     / finding.flag.liveSourceUrl
 *                          gap     the changed-marker below
 *
 * `ClaimSource` is NOT a side: it is a documentId / page / excerpt LOCATION.
 *
 * Server component — renders props, holds no state.
 */

import type {
  ContradictionFinding,
  DocumentMeta,
  StalenessFinding,
} from "@/lib/data";

/**
 * Provider attribution.
 *
 * TODO(schema-gap: provider attribution on findings): only PipelineStage
 * carries a `provider` field (lib/data/types.ts). Flag / ExtractedClaim /
 * Finding record WHAT was produced but never WHO produced it, so the tag next
 * to each value is a frontend constant here. When the backend attributes
 * claims and live values to their producer, read the provider off the finding
 * and delete these constants — do not reconcile the two.
 */
const PROVIDER_EXTRACTION = "Nutrient DWS"; // extraction (and signing) — the API does that work
const PROVIDER_LIVE = "SerpApi"; // live public-record lookup

/**
 * The gap marker for a staleness face-off.
 *
 * TODO(schema-gap: StalenessFlag): ContradictionFinding carries a computed
 * `deltaLabel`; StalenessFlag has no counterpart — the backend stores the
 * document value and the live value but nothing describing the change between
 * them. This marker is frontend-only until StalenessFlag grows a delta.
 */
const STALENESS_DELTA_LABEL = "≠ changed";

type FaceoffFinding = ContradictionFinding | StalenessFinding;

export interface EvidenceFaceoffProps {
  finding: FaceoffFinding;
  /**
   * Documents of the enclosing review, used to name each side's source.
   * Optional: without it a side falls back to its `documentId`, which is real
   * data, rather than to an invented title. Callers pass
   * `getDocuments(reviewId)` — see TODO(schema-gap: Document) on DocumentMeta.
   */
  documents?: DocumentMeta[];
}

/**
 * Faces off the two sides of a finding. Branches on `verdict`: a
 * contradiction faces document against document, a staleness finding faces the
 * document against live data.
 */
export default function EvidenceFaceoff({
  finding,
  documents,
}: EvidenceFaceoffProps) {
  return finding.verdict === "stale" ? (
    <StalenessFaceoff finding={finding} documents={documents} />
  ) : (
    <ContradictionFaceoff finding={finding} documents={documents} />
  );
}

/** Beat 1 — two documents disagree about the same field. */
export function ContradictionFaceoff({
  finding,
  documents,
}: {
  finding: ContradictionFinding;
  documents?: DocumentMeta[];
}) {
  const { flag, sourceA, sourceB } = finding;

  return (
    <Strip label={finding.label}>
      <Side
        sourceName={documentName(sourceA.documentId, documents)}
        provider={PROVIDER_EXTRACTION}
        place={pageLabel(sourceA.page)}
        value={flag.claimA.value}
        confidence={flag.claimA.confidence}
        confidenceLabel="extraction confidence"
        excerpt={sourceA.excerpt}
      />

      <Gap
        caption="Difference"
        delta={finding.deltaLabel}
        stateLabel="Documents disagree"
        tone="alert"
      />

      <Side
        sourceName={documentName(sourceB.documentId, documents)}
        provider={PROVIDER_EXTRACTION}
        place={pageLabel(sourceB.page)}
        value={flag.claimB.value}
        confidence={flag.claimB.confidence}
        confidenceLabel="extraction confidence"
        excerpt={sourceB.excerpt}
      />
    </Strip>
  );
}

/** Beat 2 — the document says X, live public data says Y. */
export function StalenessFaceoff({
  finding,
  documents,
}: {
  finding: StalenessFinding;
  documents?: DocumentMeta[];
}) {
  const { flag, source } = finding;
  const liveHost = hostOf(flag.liveSourceUrl);

  return (
    <Strip label={finding.label}>
      <Side
        sourceName={documentName(source.documentId, documents)}
        provider={PROVIDER_EXTRACTION}
        place={pageLabel(source.page)}
        value={flag.claim.value}
        confidence={flag.claim.confidence}
        confidenceLabel="extraction confidence"
        excerpt={source.excerpt}
      />

      <Gap
        caption="Change"
        delta={STALENESS_DELTA_LABEL}
        stateLabel="Live data disagrees"
        tone="warn"
      />

      <Side
        sourceName={liveHost ?? "Live public record"}
        provider={PROVIDER_LIVE}
        place={flag.query}
        value={flag.liveValue}
        confidence={flag.confidence}
        confidenceLabel="match confidence"
        note={
          flag.liveSourceUrl ? (
            <a
              href={flag.liveSourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all text-ink-2 underline underline-offset-2 hover:text-ink"
            >
              {flag.liveSourceUrl}
            </a>
          ) : (
            // The system says what it does not know.
            <span className="text-ink-3">
              No source URL was recorded for this live value.
            </span>
          )
        }
      />
    </Strip>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** The bordered three-column shell. Dividers are the standard 1px line. */
function Strip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={`Evidence face-off: ${label}`}
      className="grid grid-cols-[1fr_auto_1fr] items-stretch rounded border border-line bg-surface"
    >
      {children}
    </section>
  );
}

function Side({
  sourceName,
  provider,
  place,
  value,
  confidence,
  confidenceLabel,
  excerpt,
  note,
}: {
  sourceName: string;
  provider: string;
  /** Where the value came from: a page position, or the query that found it. */
  place: string;
  value: string;
  /** Already normalized 0–1 — rendered as a percentage, never re-normalized. */
  confidence: number;
  confidenceLabel: string;
  /** Verbatim document excerpt. Serif — evidence reads as a document. */
  excerpt?: string;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-label font-medium text-ink">
            {sourceName}
          </span>
          <ProviderTag provider={provider} />
        </div>
        <span className="text-caption text-ink-3">{place}</span>
      </div>

      <p className="tabular text-value font-medium break-words text-ink">
        {value}
      </p>

      <div className="flex min-w-0 flex-col gap-2">
        <span className="tabular text-caption text-ink-3">
          {formatPercent(confidence)} {confidenceLabel}
        </span>
        {excerpt ? (
          <p className="font-serif text-body break-words text-ink-2">
            &ldquo;{excerpt}&rdquo;
          </p>
        ) : note ? (
          <p className="text-body break-words text-ink-2">{note}</p>
        ) : (
          // The system says what it does not know.
          <p className="text-body text-ink-3">
            No excerpt was captured at this location.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The provider tag — attribution sits next to the output it belongs to, so no
 * legend is needed. Inline chip: 3px radius, 1px line, no colour.
 */
function ProviderTag({ provider }: { provider: string }) {
  return (
    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
      {provider}
    </span>
  );
}

/**
 * The middle column: what separates the two sides.
 *
 * Tone is carried by LABEL TEXT COLOUR and the 5px status dot — never by a
 * coloured border (DESIGN_SYSTEM.md, borders).
 */
function Gap({
  caption,
  delta,
  stateLabel,
  tone,
}: {
  caption: string;
  delta: string;
  stateLabel: string;
  tone: "alert" | "warn";
}) {
  const text = tone === "alert" ? "text-alert" : "text-warn";
  const dot = tone === "alert" ? "bg-alert" : "bg-warn";

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 border-x border-line px-5 py-4 text-center">
      <span className="text-micro text-ink-3 uppercase">
        {caption}
      </span>
      <span className={`tabular text-title font-medium ${text}`}>{delta}</span>
      <span className={`flex items-center gap-1.5 text-caption ${text}`}>
        {/* The only non-text mark in the system: a 5px status dot. */}
        <span aria-hidden className={`size-[5px] shrink-0 rounded-full ${dot}`} />
        {stateLabel}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Confidence arrives normalized 0–1. Render it; never re-normalize it. */
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function pageLabel(page: number): string {
  return `Page ${page}`;
}

/** Names the side's document, falling back to the id rather than inventing one. */
function documentName(
  documentId: string,
  documents: DocumentMeta[] | undefined,
): string {
  return documents?.find((doc) => doc.id === documentId)?.title ?? documentId;
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
