/**
 * AuditLedger — screen 6 of DESIGN_SYSTEM.md: the signed record of every human
 * decision in one run.
 *
 * One row per signature, in the order the data layer returns them: decisions
 * oldest first, each countersignature immediately after the decision it
 * endorses. That is NOT the same as strict signing order — an endorsement can
 * be signed after a later decision — which is why the header says what the
 * order actually is rather than claiming chronology. This component never
 * re-sorts and never filters: a ledger that reorders itself is not a ledger.
 *
 * Columns: when it was signed · the actor who signed it and in what capacity ·
 * the claim it settles · the decision (and, on a rejection, the reason and the
 * reviewer's own words) · the evidence behind it · the record hash.
 *
 * COUNTERSIGNATURES. A row carrying `countersigns` endorses a decision another
 * actor already took; it settles nothing of its own. It is rendered as part of
 * the decision it endorses — no rule between the two, tightened top padding,
 * the repeated claim muted, and the endorsement clause plus the endorsed
 * signing time in the decision cell — so a four-eyes approval reads as one
 * finding signed twice rather than as two closed findings. Every count that
 * means "findings decided" (approved, rejected, unsigned) filters these rows
 * out, exactly as buildTrustBreakdown does in lib/data/fixtures.ts.
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
 *   - `actorId`, `countersigns` and the retention footer are frontend-only.
 *     ReviewRecord carries one free `reviewer` string — no actor entity, no
 *     role, no way to say that one signature endorses another — and nothing
 *     in this build retains, freezes or exports a record. The actor cell
 *     therefore renders an unresolved signer as unattributed rather than
 *     guessing initials, and the retention line states workspace POLICY, not
 *     something this run did. See TODO(schema-gap: ...) markers below.
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
import { getComplianceCopy, getRecordActor } from "@/lib/data";
import type {
  Actor,
  ActorRole,
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
 * The actor square's tint, keyed as a total Record over ActorRole so a new
 * role fails the build rather than rendering untinted.
 *
 * The tint keys off the ROLE — who the signer is — and never off the decision,
 * so it can never be read as a second state colour: an Approver's square looks
 * the same whether the row it sits on endorses an approval or a rejection. The
 * word is always beside it, per "colour never carries meaning alone".
 *
 * `canvas` rather than `subtle` for the neutral roles: measured against the
 * `surface` the ledger is drawn on, `subtle` is one step away and `canvas` is
 * two — in BOTH themes. `canvas` is therefore the neutral that separates
 * either way. No value is quoted here on purpose: theme.css owns values, and
 * a hex in this comment would pin the reasoning to one theme (it did — it
 * named the light `subtle` and stopped being true the day dark landed).
 *
 * The tint is only a tint. What makes the square read as a square is the 1px
 * `line` edge on it in ActorCell; see the note there.
 */
const ROLE_TINT: Record<ActorRole, string> = {
  Reviewer: "bg-canvas text-ink-2",
  "Pipeline owner": "bg-canvas text-ink-2",
  Approver: "bg-accent-soft text-accent",
};

/** An unresolved signer: tinted like a neutral role, but with nothing to show. */
const UNATTRIBUTED_TINT = "bg-canvas text-ink-3";

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

function decisionsLabel(count: number): string {
  return `${count} ${count === 1 ? "decision" : "decisions"}`;
}

function reviewersLabel(count: number): string {
  return `${count} ${count === 1 ? "reviewer" : "reviewers"}`;
}

/** What the summary line says when nothing on this run has been signed. */
const NO_DECISIONS_SIGNED = "No decisions signed";

/**
 * The ledger's summary line: "4 decisions · 2 reviewers".
 *
 * Both halves are counted off the rows below, never typed in — a fifth row
 * changes the line with no copy edit. This mirrors getLedgerSummary() in
 * lib/data/fixtures.ts (same counts, same zero-state sentence, the design
 * system's "·" joiner in place of its "across"); it cannot CALL that accessor
 * because the accessor is keyed by review id and this component is handed
 * records, and letting it default to the demo run would print one run's
 * ledger under another run's heading — the exact failure the audit page
 * refuses at the top.
 */
function summaryLine(records: AuditRecord[]): string {
  if (records.length === 0) return NO_DECISIONS_SIGNED;

  // Distinct signers, resolved actor first and the free `reviewer` string as
  // the fallback identity, so an unattributed row is still counted as someone.
  const signers = new Set(
    records.map((record) => getRecordActor(record)?.id ?? record.reviewer),
  );

  return `${decisionsLabel(records.length)} · ${reviewersLabel(signers.size)}`;
}

/**
 * Rows that DECIDED something. A countersignature endorses a decision that has
 * already resolved its finding, so counting it as a decision would report one
 * four-eyes approval as two closed findings.
 */
function decisionRows(records: AuditRecord[]): AuditRecord[] {
  return records.filter((record) => record.countersigns === undefined);
}

export interface AuditLedgerProps {
  /** Signed decisions in data-layer order (see the note above). Never re-sorted. */
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
  // from the ledger it summarizes. Approved/rejected count DECISIONS, not
  // rows: a countersignature endorses a decision already counted here.
  const decisions = decisionRows(records);
  const approved = decisions.filter((r) => r.decision === "approved").length;
  const rejected = decisions.length - approved;
  const countersigned = records.length - decisions.length;

  const summary = summaryLine(records);

  // Findings the run reports as resolved but for which no signature exists.
  // Zero in both fixture runs; rendered only when the two genuinely disagree,
  // because a decision with no record is exactly what an audit trail is for.
  const unsigned = coverage.approved + coverage.rejected - decisions.length;

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
              {/* NOT "in the order it was signed": a countersignature is
                  rendered against the decision it endorses, which puts it
                  ahead of decisions signed before it. The line describes the
                  order the rows are actually in. */}
              {reviewTitle
                ? `Every decision signed in ${reviewTitle}, each countersignature directly beneath the decision it endorses.`
                : "Every decision signed in this run, each countersignature directly beneath the decision it endorses."}
            </p>
            {reviewSubtitle ? (
              <p className="mt-1 text-caption text-ink-3">{reviewSubtitle}</p>
            ) : null}
            {/* Counted off the rows below — "4 decisions · 2 reviewers". */}
            <p className="tabular mt-1 text-caption text-ink-3">{summary}</p>
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

        {/* The row total moved to the summary line above, so nothing here
            repeats it: these four decompose it — decided, then endorsed. */}
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line-soft pt-3">
          <Fact term="Approved">{approved}</Fact>
          <Fact term="Rejected">{rejected}</Fact>
          <Fact term="Countersigned">{countersigned}</Fact>
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
              Signed decisions: when each was signed, the actor who signed it
              and in what capacity, the claim it settles, the decision — or, on
              a countersignature, the decision it endorses — the evidence behind
              it, and the placeholder record hash.
            </caption>

            <thead>
              <tr>
                <HeadCell>Signed</HeadCell>
                <HeadCell>Actor</HeadCell>
                <HeadCell>Claim</HeadCell>
                <HeadCell>Decision</HeadCell>
                <HeadCell>Evidence</HeadCell>
                {/* Labelled honestly: this is not a verified digest. */}
                <HeadCell>Record hash (placeholder)</HeadCell>
              </tr>
            </thead>

            {records.map((record, index) => {
              const previous = records[index - 1];

              // A countersignature belongs to the decision it endorses when
              // that decision is the row directly above it — same finding,
              // signed at the instant this row says it endorses. Only then is
              // the divider dropped, because a countersignature separated from
              // its decision must NOT read as attached to whatever precedes it.
              const endorsesRowAbove =
                record.countersigns !== undefined &&
                previous !== undefined &&
                previous.countersigns === undefined &&
                previous.flagId === record.flagId &&
                previous.signedAt === record.countersigns.decidedAt;

              return (
                <LedgerRows
                  key={`${record.flagId}-${record.signedAt}`}
                  record={record}
                  divided={index > 0 && !endorsesRowAbove}
                  grouped={endorsesRowAbove}
                />
              );
            })}
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
 *
 * `grouped` marks a countersignature sitting directly under the decision it
 * endorses: no rule above it and a tightened top edge, so the pair reads as one
 * finding signed twice.
 */
function LedgerRows({
  record,
  divided,
  grouped = false,
}: {
  record: AuditRecord;
  divided: boolean;
  grouped?: boolean;
}) {
  const decision = DECISION[record.decision];
  const signedAt = formatSignedAt(record.signedAt);
  const reason = record.reason ? REJECT_REASON[record.reason] : undefined;
  const countersigns = record.countersigns;

  // When this row endorses another, the instant it endorses — printed so the
  // reader can match it against the Signed column of the row above.
  const endorsedAt = countersigns
    ? formatSignedAt(countersigns.decidedAt)
    : undefined;

  // The row group's divider sits on its top edge, so the first group does not
  // double up on the header's own border.
  const rule = divided ? "border-t border-line-soft" : "";

  return (
    <tbody>
      <tr>
        <Cell tight={grouped} className={`${rule} tabular whitespace-nowrap`}>
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

        <Cell tight={grouped} className={`${rule} whitespace-nowrap`}>
          <ActorCell record={record} />
        </Cell>

        <Cell tight={grouped} className={rule}>
          {/* A countersignature repeats its decision's claim rather than
              raising a new one, so the repeat is muted: same words, no second
              claim asserted. */}
          <span
            className={
              countersigns ? "block text-ink-2" : "block font-medium text-ink"
            }
          >
            {humanizeField(record.claimField)}
          </span>
          <span className="tabular mt-0.5 block text-caption text-ink-2">
            {record.claimValue}
          </span>
        </Cell>

        <Cell
          tight={grouped}
          className={`${rule} ${countersigns ? "" : "whitespace-nowrap"}`}
        >
          {countersigns ? (
            <>
              <span className="flex items-start gap-1.5">
                {/* Same dot, same tone as the decision above: this row carries
                    no verdict of its own, it endorses that one. */}
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-[5px] shrink-0 rounded-full ${decision.dot}`}
                />
                <span className={`font-medium ${decision.text}`}>
                  {countersigns.label}
                </span>
              </span>
              <span className="tabular mt-0.5 block text-caption text-ink-3">
                {endorsedAt
                  ? `Endorses the decision signed ${endorsedAt.date}, ${endorsedAt.time}`
                  : /* The system says what it does not know. */
                    "Signing time of the endorsed decision not recorded"}
              </span>
            </>
          ) : (
            <>
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
            </>
          )}
        </Cell>

        <Cell tight={grouped} className={rule}>
          <span className="text-ink-2">{record.evidenceSummary}</span>
        </Cell>

        <Cell tight={grouped} className={rule}>
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
 * Who signed the row, and in what capacity: a tinted square of initials, the
 * name, and the role beneath it.
 *
 * The square is a typographic mark, never a photo and never an icon — the
 * design system allows no image here, and initials are a dense byline rather
 * than identity (Actor.initials in lib/data/types.ts says exactly that).
 *
 * TODO(schema-gap: ReviewRecord): the actor and the role are frontend-only.
 * The backend persists one free `reviewer` string, so getRecordActor() matches
 * it against the workspace roster and returns undefined when nobody matches.
 * An unmatched row is rendered UNATTRIBUTED — an empty square and a stated
 * gap — because initials derived from an arbitrary display name would be an
 * invented identity on an audit trail, which is the one place that cannot
 * happen. Read `actorId` off the record once ReviewRecord carries one.
 */
function ActorCell({ record }: { record: AuditRecord }) {
  const actor: Actor | undefined = getRecordActor(record);
  const tint = actor ? ROLE_TINT[actor.role] : UNATTRIBUTED_TINT;

  return (
    <span className="flex items-start gap-2.5">
      {/* The 1px `line` edge, not the fill, is what makes this read as a
          square. A `-soft` tint is a pale wash in light and a deep one in
          dark (theme.css: "a deep tint of its own hue rather than a pale
          one"), so it carries hue at close to the surface's own lightness —
          `accent-soft` on `surface` is 1.15:1 in light and 1.03:1 in dark,
          which is a fill with no edge. Bordering the square in the house's
          standard `line` gives it a shape that holds in either theme and
          leaves the tint doing only what it is for: saying which role
          signed. Same border on every role, so the edge states nothing. */}
      <span
        aria-hidden="true"
        className={`grid size-7 shrink-0 place-items-center rounded border border-line text-micro font-medium ${tint}`}
      >
        {actor?.initials}
      </span>
      <span className="min-w-0">
        <span className="block text-ink">{actor?.name ?? record.reviewer}</span>
        <span className="mt-0.5 block text-micro text-ink-3">
          {/* The system says what it does not know. */}
          {actor?.role ?? "Role not recorded"}
        </span>
      </span>
    </span>
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

/**
 * `tight` pulls the row's top edge in. It is used only on a countersignature
 * that sits under the decision it endorses: with no rule between them, the
 * closed gap is what makes the pair read as one block. The vertical padding is
 * chosen here rather than appended to `className`, because two utilities
 * setting padding-top would resolve by stylesheet order, not by class order.
 */
function Cell({
  children,
  className = "",
  tight = false,
}: {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <td
      className={`px-4 ${tight ? "pt-1 pb-3" : "py-3"} align-top text-body ${className}`}
    >
      {children}
    </td>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
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
          A signed decision arrives here as one row: when it was signed, the
          actor who signed it and in what capacity, the claim it settles, the
          decision — with the reason and the reviewer&rsquo;s own words on a
          rejection — the evidence behind it, and the record hash. Where a
          decision needs a second signature, the countersignature follows in the
          row directly beneath it, against the same claim.
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
 *
 * Beneath them, the retention line: workspace POLICY, read verbatim from
 * getComplianceCopy(). It is set apart by a rule and labelled as policy
 * precisely because this build implements none of it — it states what the
 * system does with a signed record, not what happened to these records, and
 * the note directly above it already says no signed PDF exists to retain.
 * TODO(schema-gap: retention): nothing in lib/types.ts models retention,
 * immutability or export; the sentence is fixture copy.
 */
function Footnotes() {
  const { auditRetention } = getComplianceCopy();

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

      <p className="mt-3 border-t border-line-soft pt-2.5 text-caption text-ink-3">
        <span className="text-micro uppercase text-ink-3">
          Retention policy
        </span>
        <span className="mt-0.5 block">{auditRetention}</span>
      </p>
    </div>
  );
}
