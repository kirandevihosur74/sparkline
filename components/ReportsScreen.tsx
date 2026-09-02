/**
 * ReportsScreen — the body of `/reports`: the record of every analysis run
 * this workspace holds, and what changed between one run and the next.
 *
 * WHAT REPLACED THE STUB, AND WHAT DELIBERATELY DID NOT. The stub promised
 * "the exports a finished review produces … as a document that can be sent
 * on". THAT DOES NOT EXIST. There is no report entity, no export, no schedule
 * and no generated file anywhere in this build — see TODO(schema-gap: report)
 * in lib/data/types.ts — so none is drawn here: no export button that produces
 * nothing, no "download PDF" that 404s, no scheduled-report row. What the
 * system genuinely records is RUNS: when each one ran, who executed it, what
 * it produced, and the diff against the run before it. That is the screen, and
 * `headlineNote` says so in the copy before a reader has to work it out.
 *
 * THE SCREEN IS SHORT, ON PURPOSE. Two runs of one bundle, because two runs of
 * one bundle is what the workspace holds. `scopeNote` states what the record
 * does not cover (five reviews listed with counts only, no run behind them)
 * rather than padding the list with rows about nothing. A thin screen that can
 * be checked line by line beats a full one that cannot.
 *
 * EVERY NUMBER IS THE DATA LAYER'S. This component sums nothing and formats no
 * figure: the totals line, each run's outcome, the diff counts, the trust
 * movement, the owner byline and the ledger sentence are all built in lib/data
 * (getWorkspaceRunReport / getLedgerSummary) and rendered as given. The only
 * two things assembled here are joins, not measurements — a change's finding
 * NAME, looked up in that run's own findings by id, and the previous run's
 * LABEL, looked up among the rows on screen. Both resolve to a record already
 * being rendered; neither invents a value.
 *
 * NO PROVIDER IS NAMED, BECAUSE NO PROVIDER PRODUCED THIS. Documents attribute
 * Nutrient DWS (it did the extraction) and Sources attribute SerpApi (it
 * returned the results). A run record is neither: it is this build's own
 * account of what it did, and `WorkspaceRunReport` accordingly carries no
 * provider field. Putting a vendor's name on a run's finding count would
 * credit it with work it did not do.
 *
 * WHAT CAN BE OPENED, AND WHAT CANNOT. A run opens at its own analysis screen
 * — a superseded run stays addressable by its own id — and its ledger opens at
 * that run's audit trail. Both are routes that exist. A signed decision's PDF
 * is NOT offered here: `/api/records/…` serves bytes only for records this
 * build signed live, and the committed rows carry a recorded path instead, so
 * a download control on this screen would be dead for most of them. The
 * footnote says that in words rather than rendering the dead link.
 *
 * RESOLVED BETWEEN RUNS IS NOT SIGNED OFF. A finding the re-run stopped
 * reporting was closed by nobody; the note beside it carries that distinction
 * from `ResolvedFinding`, and it is never counted as a decision.
 *
 * Server component. Token-pure: 1px --color-line borders, one 5px dot per run
 * for its state (carried by the LABEL COLOUR, never by a coloured border),
 * weight ceiling 500, no icons, and no shadow — shadow-action belongs to a
 * screen's single primary action, and a record has none.
 *
 * Layout: the totals strip is a shrink-0 header row and the run list is the
 * flex-1 `.scroll-col` beneath it, so the page itself never scrolls.
 */

import Link from "next/link";
import {
  getFindings,
  getLedgerSummary,
  getWorkspaceRunReport,
} from "@/lib/data";
import type {
  FindingRunChange,
  ResolvedFinding,
  RunDiff,
  WorkspaceRunReport,
  WorkspaceRunRow,
} from "@/lib/data";
import { formatUtc } from "@/lib/format";

/**
 * The screen's words. Copy is a design-system concern (DESIGN_SYSTEM.md wins
 * on copy); every VALUE beside them comes off the data layer. Nothing here is
 * a fact about a run.
 */
const COPY = {
  listLabel: "Analysis runs in this workspace",
  eyebrow: "What this workspace can report on",
  /** Said once, at the top: this screen lists runs because runs are what exist. */
  lede: "Every analysis run this workspace holds, newest first — when it ran, who executed it, what it produced, and what moved since the run before it.",
  /** The absence stated outright, so nobody hunts for an export control. */
  noExports:
    "Nothing here produces a file. There is no export, no schedule and no generated document in this build, so the record is the screen itself.",
  reviewsLink: "See every review in this workspace",
  /** Column headings inside a run. */
  producedLabel: "Produced",
  ledgerLabel: "On this run's ledger",
  comparisonLabel: "Against the previous run",
  movedLabel: "What moved",
  /** Timestamps. Both instants are the run's own; neither is elapsed time. */
  started: (at: string) => `Started ${at}`,
  finished: (at: string) => `finished ${at}`,
  /** Consequence before cause, per the copy conventions. */
  noCompletion:
    "No completion instant is recorded: this run reported no stage duration, so there is nothing to date it by.",
  /** The reader's own arithmetic check on the diff counts. */
  totals: (previous: number, current: number, previousLabel: string) =>
    `${previousLabel} reported ${previous} findings; this run reports ${current}.`,
  /** Said instead of listing eight identical rows. */
  unchanged: (count: number) =>
    `${count} ${count === 1 ? "finding says" : "findings say"} the same thing as the previous run and ${count === 1 ? "is" : "are"} not listed.`,
  trustLabel: "Trust score",
  /** Links out of a row. */
  openRun: "Open this run",
  openCurrent: "Open the current run of this bundle",
  openAudit: "Open this run's audit trail",
  /** A change whose finding this run's record does not name. */
  unnamedChange:
    "This run's record no longer names the finding, so only the change is shown.",
  /** Where a signature can be read, and why no PDF is offered from here. */
  signedRecords:
    "A signed decision is read on the audit trail of the run it belongs to. The PDF behind one is served only for records this build signed live; the committed rows carry the recorded path instead, so there is no download to offer from here.",
  /** The system says what it does not know, rather than showing a blank list. */
  empty:
    "There is nothing to list: no analysis run is recorded in this workspace, so there is no run to date, no output to count and nothing to compare.",
  /** Runs that ended badly, said only when there are some. */
  failed: (count: number) =>
    count === 1
      ? "1 run ended with a failed stage"
      : `${count} runs ended with a failed stage`,
} as const;

/**
 * A run's state — tone and words.
 *
 * `alert` is conflict/failure, which is exactly what a run that ended on a
 * failed stage is. `accent` is agreed — the run whose output the workspace
 * currently reads. `warn` is stale/caution — a run a later one superseded.
 * The same reading DocumentsScreen gives a document revision, for the same
 * reason. The 5px dot is the only mark; the 1px border never changes colour,
 * and the run's position in its chain ("Run 1 of 2") is printed as the row's
 * own title, so a failed run never loses it.
 */
const RUN_STATE = {
  failed: {
    label: "Ended with a failed stage",
    text: "text-alert",
    dot: "bg-alert",
  },
  current: {
    label: "Current run of this bundle",
    text: "text-accent",
    dot: "bg-accent",
  },
  superseded: {
    label: "Superseded by a later run",
    text: "text-warn",
    dot: "bg-warn",
  },
} as const;

/** The shell every run row shares — the 1px border is stated once. */
const SHELL = "rounded border border-line px-4 py-3.5";

export interface ReportsScreenProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen took it.
   * Rendered as the document's `sr-only` h1: ContextBar already prints these
   * words at the head of the main column, and printing them twice was the
   * duplication the stub pass removed everywhere else.
   */
  title: string;
  /**
   * The runs on screen. Defaults to the data layer's — there is one workspace
   * and no endpoint behind it, so the accessor is the only source.
   */
  report?: WorkspaceRunReport;
}

export default function ReportsScreen({
  title,
  report = getWorkspaceRunReport(),
}: ReportsScreenProps) {
  // A run's predecessor, named as the record names it. This is a join across
  // the rows already on screen, not a second reading of the run chain: the
  // diff states WHICH run it compared against, and this resolves that id to
  // the label that run prints on itself two rows down.
  const runLabels = new Map(
    report.rows.map((row) => [row.run.id, row.run.label]),
  );

  return (
    <>
      {/* "2 analysis runs · 1 document bundle" — assembled in lib/data and
          rendered as one string, so the totals and the list beneath them
          cannot drift apart. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
        <p className="tabular text-caption text-ink-3">{report.text}</p>
        {/* A zero here would read as a measurement of failure rather than the
            absence of one, so the clause appears only when runs did fail. */}
        {report.failedCount > 0 ? (
          <p className="tabular shrink-0 text-caption text-alert">
            {COPY.failed(report.failedCount)}
          </p>
        ) : null}
      </div>

      <section
        aria-label={COPY.listLabel}
        className="scroll-col flex-1 px-5 py-5"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <header>
            <h1 className="sr-only">{title}</h1>
            <p className="text-micro uppercase text-ink-3">{COPY.eyebrow}</p>

            {/* Why this screen lists runs rather than reports — the data
                layer's own sentence, not a paraphrase of it. */}
            <p className="mt-2 max-w-2xl text-body text-ink-2">
              {report.headlineNote}
            </p>
            <p className="mt-1.5 max-w-2xl text-body text-ink-2">
              {COPY.lede}
            </p>

            <p className="mt-2 max-w-2xl text-caption text-ink-3">
              {COPY.noExports}
            </p>
            {/* What the run record does not cover, counted in lib/data. */}
            <p className="mt-1 max-w-2xl text-caption text-ink-3">
              {report.scopeNote}{" "}
              <Link
                href="/reviews"
                className="text-ink underline underline-offset-4 hover:text-ink-2"
              >
                {COPY.reviewsLink}
              </Link>
              .
            </p>
          </header>

          <ul className="flex flex-col gap-2">
            {report.rows.length === 0 ? (
              <li className={`${SHELL} bg-surface text-body text-ink-3`}>
                {COPY.empty}
              </li>
            ) : (
              report.rows.map((row) => (
                <RunRow key={row.run.id} row={row} runLabels={runLabels} />
              ))
            )}
          </ul>

          {report.rows.length > 0 ? (
            <p className="max-w-2xl text-caption text-ink-3">
              {COPY.signedRecords}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/**
 * One analysis run. Everything on it is read off the row the data layer built
 * — its position in the chain, why it happened, who executed it, the instants
 * it started and finished, what it produced, and the diff against its
 * predecessor.
 */
function RunRow({
  row,
  runLabels,
}: {
  row: WorkspaceRunRow;
  runLabels: Map<string, string>;
}) {
  const { run } = row;

  // The head of a bundle's chain is the run the review resolves to, which is
  // exactly what `reviewId` holds (see WorkspaceRunRow) — so this is the
  // record's own answer to "is this the current run", not an inference from
  // ordinals or from which href happens to match.
  const isCurrent = run.id === row.reviewId;
  const state = run.failed
    ? RUN_STATE.failed
    : isCurrent
      ? RUN_STATE.current
      : RUN_STATE.superseded;

  // The signed decisions on THIS run's ledger, as the ledger itself counts
  // them: "4 decisions across 2 reviewers", or "No decisions signed". A run is
  // never counted among them — a run signs nothing.
  const ledger = getLedgerSummary(run.id);

  const startedAt = formatUtc(run.startedAt);
  const completedAt = run.completedAt ? formatUtc(run.completedAt) : undefined;

  return (
    <li>
      {/* A superseded run sits on `subtle` — the same treatment a superseded
          document revision gets, and the same one a reviews-index row gets
          when it is not the thing the workspace currently reads. */}
      <article className={`${SHELL} ${isCurrent ? "bg-surface" : "bg-subtle"}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            {/* State as colour-coded TEXT plus the 5px dot — never a border. */}
            <p className="flex items-center gap-1.5 text-micro uppercase">
              <span
                aria-hidden="true"
                className={`size-[5px] shrink-0 rounded-full ${state.dot}`}
              />
              <span className={`font-medium ${state.text}`}>{state.label}</span>
            </p>

            {/* "Run 2 of 2" — the run's position in its own chain, derived in
                lib/data from the chain's length. */}
            <p className="tabular mt-1.5 text-title font-medium text-ink">
              {run.label}
            </p>

            <p className="mt-0.5 text-caption text-ink-3">{row.reviewTitle}</p>
          </div>

          {/* Who executed it, and in what capacity. A Pipeline owner signs
              nothing; when the run names nobody the data layer says so. */}
          <p className="shrink-0 text-right text-caption text-ink-3">
            {row.ownerText}
          </p>
        </div>

        {/* Absolute UTC instants, formatted by lib/format — never an elapsed
            or relative time, which would differ between the server pass and
            the client pass and would be false against fixed fixtures. */}
        <p className="tabular mt-2 text-caption text-ink-3">
          {startedAt && completedAt ? (
            <>
              {COPY.started(startedAt)}
              <span aria-hidden="true"> · </span>
              {COPY.finished(completedAt)}
            </>
          ) : startedAt ? (
            <>
              {COPY.started(startedAt)}
              <span aria-hidden="true"> · </span>
              {COPY.noCompletion}
            </>
          ) : (
            COPY.noCompletion
          )}
        </p>

        {/* Why this run happened — the run's own trigger note. */}
        <p className="mt-1.5 text-body text-ink-2">{run.triggerNote}</p>

        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <p>
            <span className="block text-micro uppercase text-ink-3">
              {COPY.producedLabel}
            </span>
            {/* "11 findings · 12 claims · 2 documents" — counted off the run. */}
            <span className="tabular mt-0.5 block text-label text-ink-2">
              {row.outcomeText}
            </span>
          </p>

          <p>
            <span className="block text-micro uppercase text-ink-3">
              {COPY.ledgerLabel}
            </span>
            <span className="tabular mt-0.5 block text-label text-ink-2">
              {ledger.text}
            </span>
          </p>
        </div>

        {/* The diff against the run before it — or, on a first run, why there
            is nothing to compare. */}
        <div className="mt-3 border-t border-line-soft pt-3">
          {/* The heading belongs to a comparison that happened. On a first run
              there is none, and heading the say-so line "Against the previous
              run" would name a run that does not exist. */}
          {row.diff ? (
            <p className="text-micro uppercase text-ink-3">
              {COPY.comparisonLabel}
            </p>
          ) : null}

          {row.diff ? (
            <RunDiffBlock
              diff={row.diff}
              runId={run.id}
              previousLabel={runLabels.get(row.diff.previousRunId)}
            />
          ) : (
            /* "Nothing to compare — no earlier run of this bundle is
               recorded." A first run has no predecessor, and "0 new · 0
               resolved" would report a comparison that never happened. */
            <p className="text-body text-ink-2">{row.comparisonNote}</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line-soft pt-2.5">
          <Link
            href={row.runHref}
            className="text-label font-medium text-ink underline underline-offset-4 hover:text-ink-2 focus-visible:shadow-selected focus-visible:outline-none"
          >
            {COPY.openRun}
          </Link>

          {/* Only when this run is not the one the review already opens at —
              two links to one URL would say there are two places to go. */}
          {isCurrent ? null : (
            <Link
              href={row.reviewHref}
              className="text-label text-ink-2 underline underline-offset-4 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
            >
              {COPY.openCurrent}
            </Link>
          )}

          <Link
            href={`${row.runHref}/audit`}
            className="text-label text-ink-2 underline underline-offset-4 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            {COPY.openAudit}
          </Link>
        </div>
      </article>
    </li>
  );
}

/**
 * The diff between this run and the one before it.
 *
 * Every count in it was produced by comparing the two runs' finding sets in
 * lib/data; this renders them and names the findings behind the ones that
 * moved. Unchanged findings are counted, not listed — eight rows saying "same
 * as last time" would bury the three that did not.
 */
function RunDiffBlock({
  diff,
  runId,
  previousLabel,
}: {
  diff: RunDiff;
  /** The run whose findings this diff describes — where the names come from. */
  runId: string;
  /** What the previous run calls itself, when it is a row on this screen. */
  previousLabel?: string;
}) {
  // The finding NAME behind a change id. A join against the run's own record,
  // not a second source: `changes` names findings by id, and these are the
  // findings that run reported.
  const names = new Map(
    getFindings(runId).map((finding) => [finding.id, finding.label]),
  );

  // Resolved findings carry their own record in `diff.resolved`, with the note
  // that separates "the re-run stopped reporting it" from "somebody signed
  // it". They are rendered from there, so they are not read out of `changes`
  // twice.
  const moved = diff.changes.filter(
    (change) => change.id === "new" || change.id === "changed",
  );

  // The chip-length word for a resolved finding, taken from its own entry in
  // `changes` so every row in this list is labelled by the same vocabulary the
  // comparison used. A resolved finding always has one; the full-sentence
  // label on the record stands in if it ever does not.
  const shortLabels = new Map(
    diff.changes.map((change) => [change.findingId, change.shortLabel]),
  );

  return (
    <>
      {/* "2 new · 1 resolved · 1 changed · 8 unchanged" — the whole comparison
          in one data-layer string. */}
      <p className="tabular mt-1 text-body text-ink-2">{diff.text}</p>

      {/* The arithmetic a reader can run themselves: the previous run's total
          and this one's, both counted off the same comparison. */}
      {previousLabel ? (
        <p className="tabular mt-0.5 text-caption text-ink-3">
          {COPY.totals(
            diff.previousFindingCount,
            diff.currentFindingCount,
            previousLabel,
          )}
        </p>
      ) : null}

      {/* Present only when BOTH runs recorded a blended score — no colour, the
          three semantic tones mean verified / stale / conflict, and a score
          moving is none of those. */}
      {diff.trust ? (
        <p className="tabular mt-0.5 text-caption text-ink-3">
          {diff.trust.text}
        </p>
      ) : null}

      {moved.length > 0 || diff.resolved.length > 0 ? (
        <div className="mt-2.5">
          <p className="text-micro uppercase text-ink-3">{COPY.movedLabel}</p>
          <ul className="mt-1 flex flex-col gap-1.5">
            {moved.map((change) => (
              <ChangeRow
                key={change.findingId}
                change={change}
                name={names.get(change.findingId)}
              />
            ))}
            {diff.resolved.map((resolved) => (
              <ResolvedRow
                key={resolved.finding.id}
                resolved={resolved}
                shortLabel={shortLabels.get(resolved.finding.id)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {diff.unchangedCount > 0 ? (
        <p className="tabular mt-2 text-caption text-ink-3">
          {COPY.unchanged(diff.unchangedCount)}
        </p>
      ) : null}
    </>
  );
}

/** A finding this run reports that the previous run did not, or reports differently. */
function ChangeRow({
  change,
  name,
}: {
  change: FindingRunChange;
  /** The finding's queue label, when this run's record still names it. */
  name?: string;
}) {
  // `detail` is built in lib/data from the two runs' own values and already
  // leads with the finding it describes ("Module design assumption: Tier-1
  // 430 W modules → Tier-1 440 W modules"), so printing the name beside it
  // would say the same words twice. When there is no detail — a new finding
  // moved nothing, it simply appeared — the name is the row.
  const text = change.detail ?? name;

  return (
    <li className="text-label">
      <span className="tabular text-micro uppercase text-ink-3">
        {change.shortLabel}
      </span>{" "}
      {text ? (
        <span className="text-ink-2">{text}</span>
      ) : (
        <span className="text-ink-3">{COPY.unnamedChange}</span>
      )}
    </li>
  );
}

/**
 * A finding the previous run reported and this one does not.
 *
 * RESOLVED BETWEEN RUNS IS NOT SIGNED OFF: `note` carries which of the two
 * happened, derived from the previous run's own ledger. The superseded-document
 * line says why its evidence cannot be opened, so the row is not a link that
 * would go nowhere.
 */
function ResolvedRow({
  resolved,
  shortLabel,
}: {
  resolved: ResolvedFinding;
  /** "Resolved" — the chip word from this finding's own entry in the diff. */
  shortLabel?: string;
}) {
  return (
    <li className="text-label">
      <span className="tabular text-micro uppercase text-ink-3">
        {shortLabel ?? resolved.label}
      </span>{" "}
      <span className="text-ink-2">{resolved.finding.label}</span>
      <span className="mt-0.5 block text-caption text-ink-3">
        {resolved.note}
      </span>
      {resolved.supersededNote ? (
        <span className="mt-0.5 block text-caption text-ink-3">
          {resolved.supersededNote}
        </span>
      ) : null}
    </li>
  );
}
