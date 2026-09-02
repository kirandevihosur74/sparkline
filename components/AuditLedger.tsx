/**
 * AuditLedger — screen 6 of DESIGN_SYSTEM.md: the signed record of every human
 * decision in one run, and the analysis runs that produced what was decided.
 *
 * One row per entry, in the order the data layer returns them — this component
 * never re-sorts and never filters: a ledger that reorders itself is not a
 * ledger. It does not claim an order either, because the two accessors that
 * feed it use different ones: getAuditRecords() groups a countersignature with
 * the decision it endorses, getLedgerEntries() puts every row on one timeline
 * (a run by the instant it finished, a decision by the instant it was signed),
 * and an endorsement signed after a later decision then lands after it. The
 * header sentence is chosen from what was actually drawn, and a
 * countersignature is joined to its decision only while it is the row directly
 * beneath it.
 *
 * Columns: when it happened · the actor behind it and in what capacity · the
 * claim it settles · the decision (and, on a rejection, the reason and the
 * reviewer's own words) · the evidence behind it · the record hash.
 *
 * ANALYSIS RUNS ARE NOT DECISIONS, and this is the one screen where confusing
 * the two would be a lie. `getLedgerEntries()` returns a union
 * (LedgerEntry = DecisionLedgerEntry | RunLedgerEntry) precisely so that a
 * pipeline event cannot be written as a fake ReviewRecord — see
 * TODO(schema-gap: run history) point 3 in lib/data/types.ts. A run row here:
 *
 *   - carries NO 5px dot and NO decision word. The dot and the accent/alert
 *     label are the marks of a signed verdict; a run has none, and their
 *     absence is the first thing that separates the two kinds of row.
 *   - sits on `canvas`, the ground the whole app floats on, instead of the
 *     panel's `surface`. Chrome, not record. It is a neutral token, not a
 *     state colour, and it is NOT a coloured left border — the design system
 *     forbids that, and there are no icons in this system to reach for
 *     instead. (`subtle` was the obvious pick and is wrong: measured against
 *     `surface` it is one step away in light and invisible, exactly as
 *     ROLE_TINT below already records.)
 *   - spans the claim / decision / evidence columns as one cell, because it
 *     settles no claim and takes no decision. A run cannot occupy those
 *     columns without appearing to answer them.
 *   - says "No record hash" in the hash column in plain text — never in the
 *     mono face that column uses for a digest, and never blank. A run signs
 *     nothing, so there is nothing to hash, and the row states that rather
 *     than leaving a hole a reader has to interpret.
 *
 * Counts follow the same line. "4 decisions · 2 reviewers" counts SIGNED ROWS
 * and nothing else; runs are counted in their own sentence beneath it, exactly
 * as LedgerSummary splits `decisionCount` from `runCount`. Folding a run into
 * the decision count would credit K. Shah with a decision he never took —
 * a Pipeline owner executes runs and signs nothing (ActorRole).
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
 *   - `contentHash` on a REAL signature is the SHA-256 of the signed PDF
 *     bytes ("sha256:" prefix) that POST /api/sign returned. On the committed
 *     fixture rows it is still a placeholder, and the "fixture-sha256:" prefix
 *     is rendered rather than trimmed away so the two can never be confused.
 *   - `signedDocumentUrl` is a link when the app serves the PDF
 *     (/api/records/…) and a recorded path otherwise. When the field is absent
 *     the row says so instead of leaving a blank cell.
 *   - `reason` and `note` travel with the signed record; a rejection without
 *     either is shown as such, never invented.
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
  LedgerEntry,
  RejectReason,
  RunLedgerEntry,
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
 * A run row's own copy — everything a run says that the data layer does not
 * already say for it.
 *
 * The run itself supplies its label ("Analysis run"), why it happened
 * (`summary`), what it produced (`outcomeText`) and why it carries no
 * signature (`unsignedNote`); those are read off RunLedgerEntry and never
 * re-worded here. What is left is the framing this screen owns: the word for
 * the KIND of row, the word for which instant the timestamp is, and the stated
 * absence in the hash column.
 */
const SYSTEM_EVENT = "System event";
/** Which instant the row is stamped with — AnalysisRun records both. */
const RUN_COMPLETED = "Run completed";
const RUN_STARTED = "Run started, no completion recorded";
/** The system says what it does not know. */
const RUN_INSTANT_UNRECORDED = "Run time not recorded";
/**
 * The hash column on a run row. Plain text, never the mono face the column
 * uses for a digest: a run has no signature to hash, and a blank cell would
 * leave the reader to decide whether the hash is missing or the signature is.
 */
const NO_RECORD_HASH = "No record hash";
/** Role line when the record or the run names nobody. */
const ROLE_UNRECORDED = "Role not recorded";
/** What the run sentence says when the ledger holds no run at all. */
const NO_RUNS_RECORDED = "No analysis runs recorded";
/**
 * The clause that keeps the two counts apart in one reading. It is on the run
 * sentence rather than the decision sentence because the decision count is the
 * one that must not move: it means today exactly what it meant before a run
 * ever reached this ledger.
 */
const RUNS_NOT_DECISIONS =
  "counted apart from the decisions above — a run signs nothing";

/**
 * How the header describes the countersignatures below it. Which clause is
 * true depends on the ORDER the rows arrived in, so the component picks
 * between them from what it actually drew: a countersignature reads as beneath
 * its decision only while nothing sits between the two, and a ledger ordered
 * by instant puts a later decision there whenever the endorsement was signed
 * after it. The row itself names the decision it endorses either way.
 */
const COUNTERSIGNATURES_BENEATH =
  ", each countersignature directly beneath the decision it endorses";
const COUNTERSIGNATURES_NAMED =
  ", each countersignature naming the decision it endorses";
/**
 * A ledger with no signature on it does not get to open with "every decision
 * signed": vacuously true and read as complete. It says what happened instead.
 */
const NOTHING_SIGNED_IN = "Nothing has been signed in";

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

function runsLabel(count: number): string {
  return `${count} ${count === 1 ? "analysis run" : "analysis runs"}`;
}

function ownersLabel(count: number): string {
  return `${count} ${count === 1 ? "pipeline owner" : "pipeline owners"}`;
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
function summaryLine(records: readonly AuditRecord[]): string {
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
function decisionRows(records: readonly AuditRecord[]): AuditRecord[] {
  return records.filter((record) => record.countersigns === undefined);
}

/**
 * The run sentence: "2 analysis runs by K. Shah, counted apart from the
 * decisions above — a run signs nothing".
 *
 * Counted off the run rows themselves, like every other number on this screen,
 * and mirroring getLedgerSummary().runText in lib/data/fixtures.ts — which
 * this component cannot call, for the same reason summaryLine() cannot: that
 * accessor is keyed by review id and this component is handed rows.
 *
 * An owner is named only when the rows name one. A run whose owner the
 * contract does not carry (every live run — see AnalysisRun.owner) leaves the
 * sentence at the count, rather than borrowing the fixture owner's name.
 */
function runSummaryLine(runs: readonly RunLedgerEntry[]): string {
  if (runs.length === 0) return NO_RUNS_RECORDED;

  const owners: Actor[] = [];
  for (const run of runs) {
    const owner = run.actor;
    if (owner && !owners.some((known) => known.id === owner.id)) {
      owners.push(owner);
    }
  }

  const attribution =
    owners.length === 1
      ? ` by ${owners[0].name}`
      : owners.length > 1
        ? ` across ${ownersLabel(owners.length)}`
        : "";

  return `${runsLabel(runs.length)}${attribution}, ${RUNS_NOT_DECISIONS}`;
}

/**
 * The clause the header adds when analysis runs are on the ledger — the one
 * sentence that tells a reader, before they reach a row, that not everything
 * below is a signature. Said only when such a row exists, and agreeing with
 * how many there are: one run is a system event, not "system events".
 */
function runsClause(count: number, anySigned: boolean): string {
  // "The analysis run", not "The 1 analysis run" — the count is carried by the
  // run sentence beneath, and this one only has to agree with it.
  const noun = count === 1 ? "analysis run" : runsLabel(count);
  const verb = count === 1 ? "sits" : "sit";
  const mark = count === 1 ? "a system event" : "system events";
  const subject = count === 1 ? "It signed" : "They signed";

  return anySigned
    ? ` The ${noun} behind them ${verb} in the same list, marked as ${mark}. ${subject} nothing.`
    : ` The ${noun} that produced its findings ${verb} on the ledger below, marked as ${mark}. ${subject} nothing.`;
}

/**
 * One row of the ledger, in the order the data layer put it in.
 *
 * The two members are kept apart all the way to the JSX — there is no shared
 * "row" shape with optional decision fields, because the whole point of
 * LedgerEntry is that a run cannot be rendered as a decision by accident.
 */
type LedgerRow =
  | { kind: "decision"; record: AuditRecord }
  | { kind: "run"; entry: RunLedgerEntry };

/**
 * Rows from whichever prop the caller supplied. `entries` is the ledger;
 * `records` is the decisions-only shape (see AuditLedgerProps), and a caller
 * that passes it has told this component nothing about runs — which is not
 * the same as telling it there were none, and is why the run sentence is
 * suppressed on that path instead of reading "No analysis runs recorded".
 */
function toRows(
  entries: readonly LedgerEntry[] | undefined,
  records: readonly AuditRecord[] | undefined,
): LedgerRow[] {
  if (entries) {
    return entries.map((entry) =>
      entry.kind === "run"
        ? { kind: "run", entry }
        : { kind: "decision", record: entry.record },
    );
  }

  return (records ?? []).map((record) => ({ kind: "decision", record }));
}

export interface AuditLedgerProps {
  /**
   * THE LEDGER'S ROWS in data-layer order — signed decisions AND analysis
   * runs, from getLedgerEntries(). Never re-sorted here: that accessor orders
   * a run by the instant it finished and a decision by the instant it was
   * signed, which is the true order of what happened.
   *
   * Preferred over `records`, and the only prop that can put a run on the
   * ledger. When it is given, `records` is ignored.
   */
  entries?: readonly LedgerEntry[];
  /**
   * Signed decisions only, from getAuditRecords() — the shape this screen was
   * first built against. Kept so a caller that has not moved to `entries` yet
   * still renders its decisions correctly; such a ledger simply holds no run
   * rows and says nothing about runs at all.
   */
  records?: readonly AuditRecord[];
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
  entries,
  records,
  reviewTitle,
  reviewSubtitle,
  coverage,
  reviewHref,
}: AuditLedgerProps) {
  const rows = toRows(entries, records);

  // The two kinds, split once and never re-merged. Every count below is taken
  // from one side or the other, so no number on this screen can hold both.
  const signed = rows.flatMap((row) =>
    row.kind === "decision" ? [row.record] : [],
  );
  const runs = rows.flatMap((row) => (row.kind === "run" ? [row.entry] : []));

  // Derived on every render from the rows below, so the header cannot drift
  // from the ledger it summarizes. Approved/rejected count DECISIONS, not
  // rows: a countersignature endorses a decision already counted here, and a
  // run decided nothing to count.
  const decisions = decisionRows(signed);
  const approved = decisions.filter((r) => r.decision === "approved").length;
  const rejected = decisions.length - approved;
  const countersigned = signed.length - decisions.length;

  const summary = summaryLine(signed);
  // Suppressed entirely on the decisions-only prop path: a component that was
  // never handed runs may not report how many there were. See toRows().
  const runSummary = entries ? runSummaryLine(runs) : undefined;

  // Grouping is decided ONCE, here, because the header sentence describes it
  // and the rows draw it — and the two would drift if each worked it out
  // separately. A countersignature groups only when the decision it endorses
  // is the row directly above it, which stops being true the moment anything
  // else lands between them: getLedgerEntries() orders by instant, and a
  // countersignature signed after a later decision sits after that decision.
  const drawn = rows.map((row, index) => {
    if (row.kind === "run") return { row, grouped: false } as const;

    const previous = rows[index - 1];
    // Only a DECISION can be endorsed, so a run above this row leaves this
    // undefined and the divider stays.
    const previousRecord =
      previous?.kind === "decision" ? previous.record : undefined;
    const countersigns = row.record.countersigns;

    return {
      row,
      grouped:
        countersigns !== undefined &&
        previousRecord !== undefined &&
        previousRecord.countersigns === undefined &&
        previousRecord.flagId === row.record.flagId &&
        previousRecord.signedAt === countersigns.decidedAt,
    } as const;
  });

  // What the header may say about countersignatures: that they sit beneath
  // their decisions only when every one of them actually does.
  const groupedCount = drawn.filter((entry) => entry.grouped).length;
  const countersignatureClause =
    countersigned === 0
      ? ""
      : groupedCount === countersigned
        ? COUNTERSIGNATURES_BENEATH
        : COUNTERSIGNATURES_NAMED;

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
              {/* This line claims NO ORDER. The component renders the rows in
                  the order it was handed and cannot know the rule behind it —
                  getAuditRecords() groups a countersignature with its
                  decision, getLedgerEntries() orders everything by instant —
                  so it describes what is on the ledger and lets the rows
                  carry their own sequence. */}
              {signed.length === 0
                ? `${NOTHING_SIGNED_IN} ${reviewTitle ?? "this run"}.`
                : `Every decision signed in ${reviewTitle ?? "this run"}${countersignatureClause}.`}
              {runs.length > 0
                ? runsClause(runs.length, signed.length > 0)
                : null}
            </p>
            {reviewSubtitle ? (
              <p className="mt-1 text-caption text-ink-3">{reviewSubtitle}</p>
            ) : null}
            {/* Counted off the rows below — "4 decisions · 2 reviewers".
                SIGNED ROWS ONLY: a run reaching this ledger must never move
                this number, because nobody signed it. */}
            <p className="tabular mt-1 text-caption text-ink-3">{summary}</p>
            {/* The runs, in their own sentence and their own count. */}
            {runSummary ? (
              <p className="tabular mt-1 text-caption text-ink-3">
                {runSummary}
              </p>
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

      {rows.length === 0 ? (
        <EmptyLedger open={coverage.open} />
      ) : (
        <div className="scroll-col min-w-0 flex-1 overflow-x-auto rounded border border-line bg-surface">
          {/* border-separate, not collapse: a collapsed border on a sticky
              header cell scrolls away with the rows underneath it. */}
          <table className="w-full border-separate border-spacing-0 text-left">
            <caption className="sr-only">
              {runs.length > 0
                ? "Signed decisions and analysis runs: when each happened, the actor behind it and in what capacity, the claim it settles, the decision — or, on a countersignature, the decision it endorses — the evidence behind it, and the record hash. An analysis run settles no claim, takes no decision and carries no hash; its row says so in place of those columns."
                : "Signed decisions: when each was signed, the actor who signed it and in what capacity, the claim it settles, the decision — or, on a countersignature, the decision it endorses — the evidence behind it, and the record hash."}
            </caption>

            <thead>
              <tr>
                {/* "Signed" while every instant below IS a signing time;
                    "When" once a run is on the ledger, because a run's
                    completion time is not a signature and a header saying so
                    would claim one that does not exist. Each run row names
                    which of its two instants it is showing. */}
                <HeadCell>{runs.length > 0 ? "When" : "Signed"}</HeadCell>
                <HeadCell>Actor</HeadCell>
                <HeadCell>Claim</HeadCell>
                <HeadCell>Decision</HeadCell>
                <HeadCell>Evidence</HeadCell>
                <HeadCell>Record hash</HeadCell>
              </tr>
            </thead>

            {/* A ledger of runs alone is not an empty ledger — there are rows
                on it — but it is still a run nobody has signed, and the header
                strip says that in a count rather than in words. This says it
                in words, once, above the rows. */}
            {signed.length === 0 ? (
              <NothingSignedRow open={coverage.open} />
            ) : null}

            {drawn.map(({ row, grouped }, index) => {
              // The rule sits on a row's top edge. The first row needs none —
              // unless the band above it does, in which case it separates the
              // two. A grouped countersignature drops its rule on purpose:
              // the closed gap is what makes the pair read as one finding.
              const divided = (index > 0 || signed.length === 0) && !grouped;

              return row.kind === "run" ? (
                <RunRow
                  key={`run-${row.entry.run.id}-${row.entry.at}`}
                  entry={row.entry}
                  divided={divided}
                />
              ) : (
                <LedgerRows
                  key={`${row.record.flagId}-${row.record.signedAt}`}
                  record={row.record}
                  divided={divided}
                  grouped={grouped}
                />
              );
            })}
          </table>

          <Footnotes runs={runs.length} />
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
            {record.signedDocumentUrl?.startsWith("/api/records/") ? (
              <a
                href={record.signedDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
              >
                Open signed PDF
              </a>
            ) : record.signedDocumentUrl ? (
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

  return (
    <ActorIdentity
      actor={actor}
      // The system says what it does not know.
      name={actor?.name ?? record.reviewer}
      role={actor?.role ?? ROLE_UNRECORDED}
    />
  );
}

/**
 * The actor mark itself — square, name, capacity — shared by every row so that
 * who did something is rendered the same way whether they signed it or ran it.
 * WHAT they did is carried by the rest of the row, never by this cell.
 *
 * `role` is optional because a run that names no owner already says so in its
 * name line (RunLedgerEntry.byline, "Pipeline owner not recorded"); repeating
 * "Role not recorded" underneath it would state the same gap twice.
 */
function ActorIdentity({
  actor,
  name,
  role,
}: {
  actor?: Actor;
  name: string;
  role?: string;
}) {
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
        <span className="block text-ink">{name}</span>
        {role ? (
          <span className="mt-0.5 block text-micro text-ink-3">{role}</span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * AN ANALYSIS RUN. A system event on a ledger of signatures, and everything
 * about the row is arranged so it cannot be misread as one.
 *
 * No dot, no decision word, no hash: those are what a signature looks like
 * here, and this row has none of the three. It carries a `canvas` ground
 * instead — the app's own background, one step further from `surface` than
 * `subtle` in light and further still in dark, so the band reads in BOTH
 * themes — and the claim / decision / evidence columns are spanned as a single
 * cell, because a run answers none of those three questions.
 *
 * Every string on it except the framing words comes off the entry: the label,
 * why the run happened, what it produced, and why it is unsigned.
 */
function RunRow({
  entry,
  divided,
}: {
  entry: RunLedgerEntry;
  divided: boolean;
}) {
  const at = formatSignedAt(entry.at);
  // getLedgerEntries() stamps a run with its completion instant and falls back
  // to its start; the row says which one it got rather than implying the run
  // ended when it did not.
  const completed =
    entry.run.completedAt !== undefined && entry.at === entry.run.completedAt;

  const rule = divided ? "border-t border-line-soft" : "";
  const ground = `${rule} bg-canvas`;

  return (
    <tbody>
      <tr>
        <Cell className={`${ground} tabular whitespace-nowrap`}>
          {at ? (
            <>
              <span className="block text-ink-2">{at.date}</span>
              <span className="block text-caption text-ink-3">{at.time}</span>
              <span className="mt-0.5 block text-micro text-ink-3">
                {completed ? RUN_COMPLETED : RUN_STARTED}
              </span>
            </>
          ) : (
            /* The system says what it does not know. */
            <span className="text-ink-3">{RUN_INSTANT_UNRECORDED}</span>
          )}
        </Cell>

        <Cell className={`${ground} whitespace-nowrap`}>
          {/* Same mark as a signer's, because it is the same person type —
              and the role beside it is the whole difference: a Pipeline owner
              runs the pipeline and signs nothing. */}
          <ActorIdentity
            actor={entry.actor}
            name={entry.actor?.name ?? entry.byline}
            role={entry.actor?.role}
          />
        </Cell>

        {/* Claim · Decision · Evidence, spanned: a run settles no claim and
            takes no decision, so it may not sit in those columns as though it
            answered them. */}
        <Cell colSpan={3} className={ground}>
          <span className="block text-micro uppercase text-ink-3">
            {SYSTEM_EVENT}
          </span>
          <span className="mt-0.5 block font-medium text-ink-2">
            {entry.label}
          </span>
          <span className="mt-0.5 block text-caption text-ink-2">
            {entry.summary}
          </span>
          <span className="tabular mt-0.5 block text-caption text-ink-3">
            {`${entry.run.label} · ${entry.outcomeText}`}
          </span>
        </Cell>

        <Cell className={ground}>
          {/* Deliberately NOT the mono face the hash column uses: this is the
              absence of a digest, not a digest. And not blank — a blank cell
              would leave the reader to work out which of the two is missing,
              the signature or the hash of it. */}
          <span className="block text-ink-3">{NO_RECORD_HASH}</span>
          <span className="mt-1 block text-caption text-ink-3">
            {entry.unsignedNote}
          </span>
        </Cell>
      </tr>
    </tbody>
  );
}

/**
 * A ledger with rows on it but no signature among them — the degraded run,
 * whose one analysis run finished and whose findings nobody has decided.
 *
 * Consequence before cause, and it names what is outstanding, exactly as the
 * empty ledger does: rows on the page must not let the run read as reviewed.
 */
function NothingSignedRow({ open }: { open: number }) {
  return (
    <tbody>
      <tr>
        <td colSpan={COLUMNS} className="px-4 pt-3.5 pb-1 align-top">
          <p className="text-micro uppercase text-ink-3">
            {NO_DECISIONS_SIGNED}
          </p>
          <p className="mt-1 max-w-prose text-body text-ink-2">
            There is nothing signed to audit here: no finding in this run has
            been approved or rejected.{" "}
            {open > 0
              ? `${findingsLabel(open)} are still waiting on a human decision.`
              : "This run produced no findings to decide."}{" "}
            Every row below is a system event.
          </p>
        </td>
      </tr>
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
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
  /** Used once: a run spans the claim / decision / evidence columns. */
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
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
          decision needs a second signature, the countersignature arrives as
          its own row against the same claim, naming the decision it endorses.
        </p>
      </div>

      <Footnotes />
    </div>
  );
}

/**
 * What each column can and cannot stand behind, stated once at the foot of
 * the panel rather than repeated in every row.
 *
 * A row signed through POST /api/sign carries the SHA-256 of the signed PDF
 * bytes and links the PDF; the committed fixture rows carry a
 * "fixture-sha256:" placeholder and a path with nothing behind it. The prefix
 * is what tells them apart, and it is rendered rather than trimmed.
 *
 * Beneath them, the retention line: workspace POLICY, read verbatim from
 * getComplianceCopy(). It is set apart by a rule and labelled as policy
 * precisely because this build implements none of it — it states what the
 * system does with a signed record, not what this build did with the PDFs it
 * serves from data/records.
 * TODO(schema-gap: retention): nothing in lib/types.ts models retention,
 * immutability or export; the sentence is fixture copy.
 */
function Footnotes({ runs = 0 }: { runs?: number }) {
  const { auditRetention } = getComplianceCopy();

  return (
    <div className="border-t border-line bg-subtle px-4 py-3">
      <ul className="flex flex-col gap-1.5">
        {/* Only when there is such a row to explain: a note about run rows on
            a ledger that holds none would describe something off screen. */}
        {runs > 0 ? (
          <li className="text-caption text-ink-3">
            A row on the shaded ground is a system event, not a signed
            decision: an analysis run closes no finding, carries no signature
            and no record hash, and is counted apart from the decisions above.
          </li>
        ) : null}
        <li className="text-caption text-ink-3">
          A <span className="font-mono">sha256:</span> hash is the digest of the
          PDF that {SIGNING_PROVIDER} signed for that decision — recompute it
          over the file to check the row. A{" "}
          <span className="font-mono">fixture-sha256:</span> prefix marks a
          committed placeholder that was never signed.
        </li>
        <li className="text-caption text-ink-3">
          &ldquo;Open signed PDF&rdquo; serves the signed record from this app.
          A record path without a link is a fixture entry with no file behind
          it.
        </li>
        <li className="text-caption text-ink-3">
          Rejection reasons and reviewer notes are signed with the decision and
          printed on the record itself.
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
