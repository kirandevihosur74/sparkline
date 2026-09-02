/**
 * AuditLedger — screen 6 of DESIGN_SYSTEM.md: the signed record of every human
 * decision in one run.
 *
 * One row per signature, in the order the data layer returns them (oldest
 * first). This component never re-sorts and never filters — a ledger that
 * reorders itself is not a ledger.
 *
 * Columns: when it was signed · who signed it · the claim it settles · the
 * decision (and, on a rejection, the reason and the reviewer's own words) ·
 * the evidence behind it · the record hash.
 *
 * HONESTY, which is most of this screen:
 *   - `contentHash` is a FIXTURE-ONLY placeholder. The backend ReviewRecord
 *     carries no hash — the digest lives inside the DWS signature and is never
 *     surfaced — so the column is labelled as a placeholder, the
 *     "fixture-sha256:" prefix is rendered rather than trimmed away, and the
 *     footnotes say it out loud. Nothing here has been verified against a
 *     document.
 *   - `signedDocumentUrl` is a recorded path, not a link: POST /api/sign
 *     returns 501 and stores nothing, so no signed PDF exists to open. When
 *     the field is absent the row says so instead of leaving a blank cell.
 *   - `reason` and `note` are the same schema gap: ReviewRecord records THAT a
 *     reviewer rejected something, never why.
 *
 * Border discipline: 1px --color-line around the panel, --color-line-soft
 * between rows, and no coloured border anywhere — the decision is carried by
 * label text colour plus a 5px dot, exactly as FindingCard carries a verdict.
 *
 * Scroll discipline: the ledger box is the scroll column (`.scroll-col` on a
 * min-h-0 flex child); the page itself never scrolls.
 *
 * Shadow discipline: exactly ONE element on this screen carries shadow-action —
 * the header link into the review, which is the only thing a reader of the
 * ledger can act on. Nothing else on the screen has a shadow.
 *
 * Server component — it renders props and holds no state.
 */

import Link from "next/link";
import type {
  AuditRecord,
  CoverageBreakdown,
  FlagStatus,
  RejectReason,
} from "@/lib/data";
import { formatUtcParts } from "@/lib/format";

/**
 * Who produces the signature. DESIGN_SYSTEM.md: "Nutrient DWS" attributes
 * extraction AND signing, because the API does that work — so the provider
 * name sits next to its output, here the record column.
 *
 * TODO(schema-gap: provider attribution on findings): only PipelineStage
 * carries a `provider` field (lib/data/types.ts). ReviewRecord names the
 * reviewer and the signed document but never who produced the signature, so
 * this is a frontend constant — the same one DecisionBar declares. Read it off
 * the record once the backend attributes signatures.
 */
const SIGNING_PROVIDER = "Nutrient DWS";

/**
 * Decision display copy and tone, keyed as a total Record over the signable
 * statuses so a new one fails the build rather than rendering an unlabelled
 * dot. Colour never carries meaning alone: every row also says the word.
 */
const DECISION: Record<
  Exclude<FlagStatus, "open">,
  { label: string; text: string; dot: string }
> = {
  approved: { label: "Approved", text: "text-accent", dot: "bg-accent" },
  rejected: { label: "Rejected", text: "text-alert", dot: "bg-alert" },
};

/**
 * Rejection reasons. Copy is a design-system concern so it lives here; the
 * codes are the `RejectReason` union from lib/data. Duplicated from
 * DecisionBar deliberately — that map is module-private there and this screen
 * must not edit a component another agent owns.
 */
const REJECT_REASON: Record<RejectReason, string> = {
  not_a_conflict: "Not a conflict",
  extraction_error: "Extraction error",
  immaterial: "Immaterial",
  resolved_elsewhere: "Resolved elsewhere",
};

/**
 * Deterministic UTC rendering, split into date and time so the two stack in a
 * narrow column. UTC is what DecisionBar's confirmation strip shows, so the
 * ledger and the decision that produced it never read differently.
 */
function formatSignedAt(
  iso: string,
): { date: string; time: string } | undefined {
  return formatUtcParts(iso);
}

/** Normalized field names arrive as `expansion_install_cost`. */
function humanizeField(field: string): string {
  return field.replace(/_/g, " ");
}

function findingsLabel(count: number): string {
  return `${count} ${count === 1 ? "finding" : "findings"}`;
}

export interface AuditLedgerProps {
  /** Signed decisions in data-layer order (oldest first). Never re-sorted. */
  records: AuditRecord[];
  /** Title of the run these signatures belong to — names the ledger. */
  reviewTitle?: string;
  /**
   * The run's own metadata line, e.g. its size and counterparty. Two runs of
   * the same bundle share a title, so this is what says which one is on
   * screen. Absent when the data layer records none.
   */
  reviewSubtitle?: string;
  /**
   * Coverage of the SAME run, derived by getCoverage(). Supplies what is still
   * unsigned, so an empty ledger can say what is outstanding rather than
   * implying the run is finished.
   */
  coverage: CoverageBreakdown;
  /** Where open findings are decided. Absent → the screen offers no action. */
  reviewHref?: string;
}

export default function AuditLedger({
  records,
  reviewTitle,
  reviewSubtitle,
  coverage,
  reviewHref,
}: AuditLedgerProps) {
  // Derived on every render from the rows below, so the header cannot drift
  // from the ledger it summarizes.
  const approved = records.filter((r) => r.decision === "approved").length;
  const rejected = records.length - approved;

  // Findings the run reports as resolved but for which no signature exists.
  // Zero in both fixture runs; rendered only when the two genuinely disagree,
  // because a decision with no record is exactly what an audit trail is for.
  const unsigned = coverage.approved + coverage.rejected - records.length;

  return (
    <section
      aria-label="Audit trail"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-5"
    >
      <header className="shrink-0 rounded border border-line bg-surface px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-micro uppercase text-ink-3">Signed record</p>
            <h1 className="mt-1.5 text-display font-semibold text-ink">
              Audit trail
            </h1>
            <p className="mt-2 text-body text-ink-2">
              {reviewTitle
                ? `Every decision signed in ${reviewTitle}, in the order it was signed.`
                : "Every decision signed in this run, in the order it was signed."}
            </p>
            {reviewSubtitle ? (
              <p className="mt-1 text-caption text-ink-3">{reviewSubtitle}</p>
            ) : null}
          </div>

          {/* The one shadow-action element on this screen. */}
          {reviewHref ? (
            <Link
              href={reviewHref}
              className="shrink-0 rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
            >
              {coverage.open > 0
                ? `Review ${findingsLabel(coverage.open)} still open →`
                : "Open the review →"}
            </Link>
          ) : null}
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line-soft pt-3">
          <Fact term="Signed decisions">{records.length}</Fact>
          <Fact term="Approved">{approved}</Fact>
          <Fact term="Rejected">{rejected}</Fact>
          <Fact term="Still open">{findingsLabel(coverage.open)}</Fact>
        </dl>

        {unsigned > 0 ? (
          /* The system says what it does not know. */
          <p className="mt-2 text-caption text-ink-3">
            {findingsLabel(unsigned)} in this run are marked resolved but have
            no signature on this ledger, so this trail is not the whole story.
          </p>
        ) : null}
      </header>

      {records.length === 0 ? (
        <EmptyLedger open={coverage.open} />
      ) : (
        <div className="scroll-col min-w-0 flex-1 overflow-x-auto rounded border border-line bg-surface">
          {/* border-separate, not collapse: a collapsed border on a sticky
              header cell scrolls away with the rows underneath it. */}
          <table className="w-full border-separate border-spacing-0 text-left">
            <caption className="sr-only">
              Signed decisions: when each was signed, who signed it, the claim
              it settles, the decision, the evidence behind it, and the
              placeholder record hash.
            </caption>

            <thead>
              <tr>
                <HeadCell>Signed</HeadCell>
                <HeadCell>Reviewer</HeadCell>
                <HeadCell>Claim</HeadCell>
                <HeadCell>Decision</HeadCell>
                <HeadCell>Evidence</HeadCell>
                {/* Labelled honestly: this is not a verified digest. */}
                <HeadCell>Record hash (placeholder)</HeadCell>
              </tr>
            </thead>

            {records.map((record, index) => (
              <LedgerRows
                key={`${record.flagId}-${record.signedAt}`}
                record={record}
                divided={index > 0}
              />
            ))}
          </table>

          <Footnotes />
        </div>
      )}
    </section>
  );
}

/** Column count — the note row spans the whole ledger, so it is read once. */
const COLUMNS = 6;

/**
 * One record: the ledger row, plus — when the reviewer wrote one — a full-width
 * note row beneath it. The note is why the ledger exists, so it is given the
 * width to be read rather than clipped into a cell.
 */
function LedgerRows({
  record,
  divided,
}: {
  record: AuditRecord;
  divided: boolean;
}) {
  const decision = DECISION[record.decision];
  const signedAt = formatSignedAt(record.signedAt);
  const reason = record.reason ? REJECT_REASON[record.reason] : undefined;

  // The row group's divider sits on its top edge, so the first group does not
  // double up on the header's own border.
  const rule = divided ? "border-t border-line-soft" : "";

  return (
    <tbody>
      <tr>
        <Cell className={`${rule} tabular whitespace-nowrap`}>
          {signedAt ? (
            <>
              <span className="block text-ink">{signedAt.date}</span>
              <span className="block text-caption text-ink-3">
                {signedAt.time}
              </span>
            </>
          ) : (
            /* The system says what it does not know. */
            <span className="text-ink-3">Signing time not recorded</span>
          )}
        </Cell>

        <Cell className={`${rule} whitespace-nowrap`}>
          <span className="text-ink">{record.reviewer}</span>
        </Cell>

        <Cell className={rule}>
          <span className="block font-medium text-ink">
            {humanizeField(record.claimField)}
          </span>
          <span className="tabular mt-0.5 block text-caption text-ink-2">
            {record.claimValue}
          </span>
        </Cell>

        <Cell className={`${rule} whitespace-nowrap`}>
          <span className="flex items-center gap-1.5">
            {/* The only non-text mark in the system: a 5px status dot. */}
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${decision.dot}`}
            />
            <span className={`font-medium ${decision.text}`}>
              {decision.label}
            </span>
          </span>
          {record.decision === "rejected" ? (
            <span className="mt-0.5 block text-caption text-ink-3">
              {/* Rejections without a reason are the schema gap, not a blank. */}
              {reason ?? "Reason not recorded"}
            </span>
          ) : null}
        </Cell>

        <Cell className={rule}>
          <span className="text-ink-2">{record.evidenceSummary}</span>
        </Cell>

        <Cell className={rule}>
          <Hash value={record.contentHash} />
          <span className="mt-1 block text-caption text-ink-3">
            {record.signedDocumentUrl ? (
              <>
                <span className="text-ink-3">Record path </span>
                <span className="font-mono break-all">
                  {record.signedDocumentUrl}
                </span>
              </>
            ) : (
              "No signed record path recorded"
            )}
          </span>
        </Cell>
      </tr>

      {record.note ? (
        <tr>
          <td colSpan={COLUMNS} className="px-4 pb-3.5 align-top">
            <p className="text-micro uppercase text-ink-3">
              Reviewer&rsquo;s note
            </p>
            <p className="mt-1 text-body text-ink-2">{record.note}</p>
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}

/**
 * The hash, rendered so it cannot be mistaken for a digest: the
 * "fixture-sha256:" qualifier stays on screen in muted text, ahead of the value
 * it disqualifies.
 */
function Hash({ value }: { value: string }) {
  const separator = value.indexOf(":");

  if (separator < 0) {
    return (
      <span className="tabular block font-mono text-caption break-all text-ink">
        {value}
      </span>
    );
  }

  return (
    <span className="tabular block font-mono text-caption break-all">
      <span className="text-ink-3">{value.slice(0, separator + 1)}</span>
      <span className="text-ink">{value.slice(separator + 1)}</span>
    </span>
  );
}

function HeadCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="sticky top-0 z-10 border-b border-line bg-subtle px-4 py-2.5 text-left text-micro font-medium uppercase text-ink-3"
    >
      {children}
    </th>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-body ${className}`}>{children}</td>
  );
}

function Fact({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-micro uppercase text-ink-3">{term}</dt>
      <dd className="tabular mt-0.5 text-body text-ink">{children}</dd>
    </div>
  );
}

/**
 * An empty ledger names the consequence (nothing can be audited) before the
 * cause (nothing has been signed), says what is outstanding, and describes the
 * row that would appear — rather than rendering a bare header that reads as
 * "clean".
 */
function EmptyLedger({ open }: { open: number }) {
  return (
    <div className="scroll-col min-w-0 flex-1 rounded border border-line bg-surface">
      <div className="px-5 py-5">
        <p className="text-micro uppercase text-ink-3">Empty ledger</p>

        <h2 className="mt-1.5 text-title font-medium text-ink">
          Nothing in this run has been signed
        </h2>

        <p className="mt-2 max-w-prose text-body text-ink-2">
          There is nothing to audit here: no finding in this run has been
          approved or rejected, so no signature exists to record.{" "}
          {open > 0
            ? `${findingsLabel(open)} are still waiting on a human decision.`
            : "This run produced no findings to decide."}
        </p>

        <p className="mt-2 max-w-prose text-body text-ink-2">
          A signed decision arrives here as one row: when it was signed, who
          signed it, the claim it settles, the decision — with the reason and
          the reviewer&rsquo;s own words on a rejection — the evidence behind
          it, and the record hash.
        </p>
      </div>

      <Footnotes />
    </div>
  );
}

/**
 * What this ledger cannot stand behind, stated once at the foot of the panel
 * rather than repeated in every row.
 *
 * TODO(schema-gap: ReviewRecord): all three notes are the same gap — the
 * backend record carries no hash, the sign route (POST /api/sign, 501) stores
 * and serves no signed PDF, and neither the structured rejection reason nor
 * the reviewer's note survives it. Delete a note the day the field lands; do
 * not soften one before then.
 */
function Footnotes() {
  return (
    <div className="border-t border-line bg-subtle px-4 py-3">
      <ul className="flex flex-col gap-1.5">
        <li className="text-caption text-ink-3">
          The record hash is a placeholder, not a verified digest — every value
          is fixture-generated and carries a{" "}
          <span className="font-mono">fixture-sha256:</span> prefix that says
          so. The real digest sits inside the {SIGNING_PROVIDER} signature, and
          the sign route does not return it.
        </li>
        <li className="text-caption text-ink-3">
          No signed PDF can be opened from this ledger: the sign route stores
          and serves nothing yet, so a record path is text rather than a link.
        </li>
        <li className="text-caption text-ink-3">
          Rejection reasons and reviewer notes are fixture-only. The signed
          record keeps that a finding was rejected, but not why — so on a real
          backend today, a rejected row could not explain itself.
        </li>
      </ul>
    </div>
  );
}
