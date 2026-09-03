/**
 * EvidenceFaceoff — DESIGN_SYSTEM.md item 4.
 *
 * Three-cell strip: document side · gap · comparison side. Each side carries
 * a source label with a PROVIDER TAG, one large tabular value, and a note; the
 * gap cell carries the delta. Side by side while the strip is wide enough for
 * the comparison to read across, stacked in the same order once it is not —
 * decided by a CONTAINER query on the strip itself, see Strip.
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

import ClampedText from "./ClampedText";
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

/**
 * The bordered shell.
 *
 * TWO LAYOUTS, ONE MEASUREMENT. The strip is a NAMED CONTAINER (`faceoff`) and
 * every responsive decision below is a container query against its own inline
 * size — never a viewport breakpoint. That is not a stylistic preference: the
 * strip's width is set by three states the viewport knows nothing about — the
 * reasoning panel being open, the findings queue being collapsed, and the nav
 * rail being collapsed. A `md:` breakpoint would stack a 900px-wide strip and
 * leave a 400px one side-by-side. The container sees the width that exists.
 *
 * Wide (>= 560px): document · delta · comparison, side by side, because the
 * comparison IS the argument and reading it across is what makes it one.
 *
 * Narrow (< 560px): the same three cells stacked, in the same reading order —
 * the document's claim, the delta, then what it is measured against.
 *
 * 560px IS A MEASURED LINE, not a taste: it is the last width at which the
 * DELTA VALUE still sets on one line in both face-offs the demo run produces.
 * Sweeping strip width in 10px steps, the delta cell's own value ("≠ changed",
 * "Δ $25M · 13.4%") holds one line down to 570px and breaks in two below it —
 * and a hinge that reads "Δ $25M ·" over "13.4%" has stopped being the number
 * the whole comparison is about. The evidence columns are ~206px there, a
 * ~28-character line of serif excerpt, so the two failures arrive together.
 *
 * STACKING IS NOT FREE, which is why the line sits as low as it does. This
 * strip is above the source document in a column whose scarce resource is
 * vertical, and stacked height minus side-by-side height at the same strip
 * width measures:
 *
 *     strip width   570    530    490    450    410
 *     staleness     +57    +15     -1    -40    -81
 *     contradiction +85    +85    +50    +30     -9
 *
 * So side-by-side is the SHORTER form everywhere above ~490px, and it is kept
 * everywhere it is also legible. The 560–490 band is the one place the strip
 * spends height on purpose — up to 85px — because the alternative there is a
 * broken delta and a 25-character evidence column.
 *
 * THE DELTA TRACK IS BOUNDED. It used to be a raw `auto` — content-sized, and
 * therefore giving up nothing: measured at a flat 167px from 1920 all the way
 * down to 1024 while the evidence columns it sits between collapsed to 117px
 * around it, so the least informative cell became the widest one. It is now
 * `minmax(min-content, min(11rem, 26%))`. 11rem/176px clears the widest cell
 * the two face-offs produce (max-content measures 167px and 172px), so there
 * is nothing to gain above it. 26% is the invariant that matters: 26% can
 * never beat the 37% each evidence column gets, whatever a future delta label
 * says, and it is still wide enough to keep the value on one line everywhere
 * the strip stays side by side. The `min-content` floor stops the cap from
 * squeezing the cell below its own longest word.
 *
 * (`min()` cannot take `max-content` — CSS math functions reject intrinsic
 * keywords — so the upper bound is the measured pixel value, not the keyword.)
 */
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
      className="@container/faceoff rounded border border-line bg-surface"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(min-content,min(11rem,26%))_minmax(0,1fr)] items-stretch @max-[560px]/faceoff:grid-cols-1">
        {children}
      </div>
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
  // Stacked, a side is a full-width row, and a row needs less vertical padding
  // than a narrow column does — in this column every pixel a strip takes is a
  // pixel off the source document below it.
  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 py-4 @max-[560px]/faceoff:gap-2.5 @max-[560px]/faceoff:py-3">
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
          /*
           * Clamped ONLY while the cells are narrow, and that qualifier is the
           * whole of the design.
           *
           * Measured: at a 942px strip the clamp hid one line of one excerpt
           * and its control cost a line back, so the strip came out 17px
           * TALLER than with no clamp at all. And stacking does not make
           * excerpts tall — it makes each cell full width, so they need FEWER
           * lines: at a 532px strip nothing was cut at all.
           *
           * The excerpt is only tall in the narrow side-by-side band, roughly
           * 560-700px of strip, where a cell is ~30 characters across and a
           * quoted passage runs to six lines. That is the only place this
           * earns its control, so it is the only place it clamps.
           *
           * Tying the clamp to a container query rather than to state makes
           * the control self-correcting: where the class does not apply,
           * nothing is cut, the measurement reads zero, and no control is
           * drawn. Three lines, not two — this is the evidence itself, and two
           * lines of a quoted passage too often ends mid-clause.
           */
          <ClampedText
            text={`\u201C${excerpt}\u201D`}
            clampClassName="@max-[700px]/faceoff:line-clamp-3"
            className="font-serif text-body break-words text-ink-2"
          />
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
 * The middle cell: what separates the two sides.
 *
 * Tone is carried by LABEL TEXT COLOUR and the 5px status dot — never by a
 * coloured border (DESIGN_SYSTEM.md, borders).
 *
 * It is a column between two columns while the strip is wide and a full-width
 * row between two rows once it stacks — see Strip. It is never a thin divider:
 * it carries the number the whole comparison is about.
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
    <div
      className={[
        // Side by side: a centred column between the two sides.
        // px-4 side by side (the narrower the strip, the more the 40px of
        // padding cost the delta's own words), px-5 stacked to line its text
        // up with the two sides above and below it.
        "flex flex-col items-center justify-center gap-1.5 px-4 py-4 text-center",
        "border-x border-line",
        // Stacked: the hinge of the comparison, laid out ACROSS the strip —
        // "Change · ≠ changed" on the left, the state on the right. The
        // dividers rotate with the layout: a border-x between three columns is
        // a border-y between three rows, or the cell reads as a stray rule.
        "@max-[560px]/faceoff:flex-row @max-[560px]/faceoff:flex-wrap",
        "@max-[560px]/faceoff:items-baseline @max-[560px]/faceoff:justify-between",
        "@max-[560px]/faceoff:gap-x-4 @max-[560px]/faceoff:gap-y-1.5",
        "@max-[560px]/faceoff:border-x-0 @max-[560px]/faceoff:border-y",
        "@max-[560px]/faceoff:px-5 @max-[560px]/faceoff:py-3 @max-[560px]/faceoff:text-left",
      ].join(" ")}
    >
      {/* Caption and delta stay one unit: stacked when the cell is a column,
          on one baseline when it is a row. */}
      <span className="flex flex-col items-center gap-1.5 @max-[560px]/faceoff:flex-row @max-[560px]/faceoff:items-baseline @max-[560px]/faceoff:gap-2.5">
        <span className="text-micro text-ink-3 uppercase">{caption}</span>
        <span className={`tabular text-title font-medium ${text}`}>{delta}</span>
      </span>
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
