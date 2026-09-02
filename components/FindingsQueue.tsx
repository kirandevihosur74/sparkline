"use client";

/**
 * FindingsQueue — the LEFT column of the review screen (screens 4 and 5).
 *
 * Fixed at var(--spacing-queue) (392px, w-queue) per DESIGN_SYSTEM.md layout
 * rules, and it scrolls INDEPENDENTLY: the page itself never scrolls
 * (theme.css base layer pins html/body), so the queue is a min-h-0 flex column
 * whose list carries `.scroll-col`. A page-level scroll here would push the
 * Approve button below the fold, which is the fix the design review made. The
 * header and footer are both `shrink-0`, so they take height from the list and
 * never from the page.
 *
 * The queue is a list of FindingCard, one per finding, in the order the data
 * layer returns them (flags first, by materiality) — this component never
 * re-sorts and never filters ITSELF. Its header carries the CoverageBar so the
 * shape of what is listed is visible above the row you are reading.
 *
 * Everything rendered here is data: the counts come off the breakdown, which is
 * DERIVED from the same findings the list renders, so the header cannot drift
 * from the rows beneath it. There is no figure on this screen that was typed
 * in — no portfolio total above the list, no page count below it.
 *
 * THE FILTER ROW. All findings / Assigned to me / Unassigned, as three text
 * controls — no icons, no chips, no new radius, and no border of their own:
 * the active state is text COLOUR and weight, per the rule that a coloured
 * rule never carries state. The whole model, including each option's count and
 * the actor "me" resolves to, arrives as `queue` from getFindingQueue(); this
 * component decides nothing about who holds what. Applying a filter is the
 * caller's job (ReviewWorkspace holds it beside selection), so `findings` is
 * ALREADY the filtered list and `breakdown` is derived from it — which is what
 * keeps the header, the bar and the footer describing the rows on screen
 * rather than the run behind them. The run's own total stays legible one line
 * up, as the "All findings" count.
 *
 * "Assigned to me" can be UNAVAILABLE. On a run that has signed nothing there
 * is no signing actor, so the filter carries no count, cannot be selected, and
 * says why — a 0 there would be a claim about the reviewer's workload that
 * nothing in the run supports.
 *
 * Client component: it owns the selection and filter interactions.
 */

import CoverageBar from "./CoverageBar";
import FindingCard from "./FindingCard";
import { getFindingsFooter } from "@/lib/data";
import type {
  CoverageBreakdown,
  Finding,
  FindingQueue,
  FindingQueueFilter,
  FindingQueueFilterId,
  FindingsFooter,
  UnresolvedFindingQueueFilter,
} from "@/lib/data";

/**
 * The queue's own copy. Words are a design-system concern (DESIGN_SYSTEM.md
 * wins on copy), values are the data layer's — so the nouns live here and
 * every NUMBER beside them is counted off `breakdown`.
 */
const SCALE_COPY = {
  open: "open",
  resolved: "resolved",
  /** Reads "11 findings" — these are findings, not claims (CoverageBreakdown). */
  findings: (findings: number) =>
    `${findings} ${findings === 1 ? "finding" : "findings"}`,
  showing: (findings: number, documents: number) =>
    `Showing ${findings} ${findings === 1 ? "finding" : "findings"} from ${documents} ${
      documents === 1 ? "document" : "documents"
    }`,
} as const;

/** The one separator this UI joins metadata segments with. */
const SEGMENT_SEPARATOR = " · ";

/**
 * The filter row's own words. Every NAME in these sentences is passed in from
 * the filter model — the label of the filter that is hiding the rows, and the
 * label of the one that hides nothing — so the empty state names the control
 * the reviewer has to press and cannot go stale if that control is renamed.
 */
const FILTER_COPY = {
  group: "Filter findings",
  /** Consequence (nothing is listed) before cause (this filter). */
  hidden: (active: string, all: string) =>
    `No findings under ${active}: every finding this run produced is hidden by this filter. Choose ${all} to see them.`,
  /** The same fact, said in the space the coverage key would have used. */
  hiddenCoverage: (active: string) =>
    `Nothing to segment: ${active} leaves no findings on screen.`,
} as const;

export interface FindingsQueueProps {
  /**
   * In data-layer order, and ALREADY FILTERED: these are the findings this
   * queue lists, which is what every count in the header and footer is taken
   * off. Statuses reflect this session's decisions.
   */
  findings: Finding[];
  /** Derived from `findings` by the caller — never stored, so it cannot drift. */
  breakdown: CoverageBreakdown;
  /**
   * The three filter states and their counts, from getFindingQueue(reviewId).
   * Required rather than defaulted: a queue that renders counts for one run
   * while listing another run's findings is the drift this prop exists to
   * prevent, and only the caller knows which run is on screen.
   */
  queue: FindingQueue;
  /** Which state is active. Held by the caller, beside selection. */
  filterId: FindingQueueFilterId;
  onFilterChange: (filterId: FindingQueueFilterId) => void;
  selectedId?: string;
  onSelect: (findingId: string) => void;
  /**
   * Document count for the footer line. `documentCount` is the run's; a caller
   * on a run other than the demo should pass getFindingsFooter(reviewId)
   * rather than let this default.
   *
   * The header line takes no such prop. getFindingsHeader() would give the
   * same three counts, but off getCoverage() — which reads the fixture run and
   * cannot see the decisions taken in this session, so it would freeze
   * "9 open · 2 resolved" above a CoverageBar that had already moved. Same
   * reasoning as AuditLedger's summary line: a component holding live counts
   * composes from them rather than printing a snapshot.
   */
  footer?: FindingsFooter;
}

export default function FindingsQueue({
  findings,
  breakdown,
  queue,
  filterId,
  onFilterChange,
  selectedId,
  onSelect,
  footer = getFindingsFooter(),
}: FindingsQueueProps) {
  // The active filter, and the one that hides nothing — both read off the
  // model's ordering contract, so neither label is typed in here.
  const activeFilter = filterFor(queue, filterId);
  const allFilter = queue.filters[0];

  // Why the list is empty, which is not one answer: a run can produce no
  // findings at all, and a filter can hide the ones it produced. The first
  // filter is the run's own total, so it is what tells the two apart.
  const runHasFindings = allFilter.count > 0;
  const hiddenByFilter = findings.length === 0 && runHasFindings;

  // The one filter this run cannot apply, if there is one.
  const unavailableFilter = unresolvedFilter(queue);

  // Live, off the session breakdown: "9 open · 2 resolved · 11 findings".
  // Every number is counted from the findings this queue is rendering.
  const scaleLine = [
    `${breakdown.open} ${SCALE_COPY.open}`,
    `${breakdown.approved + breakdown.rejected} ${SCALE_COPY.resolved}`,
    SCALE_COPY.findings(breakdown.total),
  ].join(SEGMENT_SEPARATOR);

  return (
    <aside
      aria-label="Findings queue"
      className="flex w-queue min-h-0 shrink-0 flex-col border-r border-line bg-canvas"
    >
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line bg-surface px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="text-label font-medium text-ink">Findings</h2>

          {/* The scale line replaces the bare open count that sat top-right:
              it says the same thing and three more, so both would repeat. */}
          <p className="tabular text-caption text-ink-3">{scaleLine}</p>
        </div>

        <CoverageBar
          breakdown={breakdown}
          /* When a filter is what emptied the bar, the bar says so instead of
             falling back to "nothing in this review is covered", which would
             be false of the run. */
          emptyNote={
            hiddenByFilter
              ? FILTER_COPY.hiddenCoverage(activeFilter.label)
              : undefined
          }
        />

        {/* Text controls, separated from the bar by the one internal divider
            weight this system has. No border, no background, no pill: the
            active option is the one in ink at weight 500. */}
        <div className="flex flex-col gap-1.5 border-t border-line-soft pt-2.5">
          <div
            role="group"
            aria-label={FILTER_COPY.group}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
          >
            {queue.filters.map((filter) => (
              <FilterControl
                key={filter.id}
                filter={filter}
                active={filter.id === activeFilter.id}
                onSelect={onFilterChange}
              />
            ))}
          </div>

          {/* A control the reviewer cannot press explains itself. Rendered
              only when one of the three is unresolvable, which is a run with
              no signed decision — see UNRESOLVED_ME in fixtures.ts. */}
          {unavailableFilter ? (
            <p className="text-caption text-ink-3">
              {unavailableFilter.unresolved.reason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="scroll-col flex flex-1 flex-col gap-2 p-3">
        {findings.length === 0 ? (
          /* The system says what it does not know — and says which of the two
             things it is. An empty filter is not an empty run. */
          <p className="px-1 py-2 text-body text-ink-3">
            {activeFilter.unresolved
              ? activeFilter.unresolved.reason
              : hiddenByFilter
                ? FILTER_COPY.hidden(activeFilter.label, allFilter.label)
                : "There is nothing to review: this run produced no findings."}
          </p>
        ) : (
          findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              selected={finding.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      {/* The footer carries one line and no pager: this build has one page of
          findings, and "1 2 3 … of 12" counted nothing. Both numbers here are
          counted — the findings on screen, and the run's documents. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line bg-subtle px-4 py-2.5">
        <p className="tabular text-caption text-ink-3">
          {SCALE_COPY.showing(breakdown.total, footer.documentCount)}
        </p>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The filter row
// ---------------------------------------------------------------------------

/**
 * One filter state as a text control.
 *
 * Active is ink at weight 500 against ink-3 — colour and weight, never a
 * border, and never a second shadow (the focus ring is the 1px ink
 * shadow-selected every control on this screen already uses). The count sits
 * beside the label in the muted tone, tabular like every number in this UI.
 *
 * A filter that cannot be resolved is DISABLED and shows its headline where
 * its count would be: it has no number, and printing 0 would answer a question
 * the run cannot answer. The accessible name is the model's own composed line
 * — "Assigned to me · M. Bui · 5" — so the actor the filter resolves to is
 * announced even though the row stays short enough to read at a glance.
 */
function FilterControl({
  filter,
  active,
  onSelect,
}: {
  filter: FindingQueueFilter;
  active: boolean;
  onSelect: (filterId: FindingQueueFilterId) => void;
}) {
  const unavailable = filter.unresolved !== undefined;
  const tone = unavailable
    ? "cursor-default text-ink-3"
    : active
      ? "font-medium text-ink"
      : "text-ink-3 hover:text-ink-2";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={filter.text}
      disabled={unavailable}
      onClick={() => onSelect(filter.id)}
      className={`flex items-baseline gap-1.5 text-caption ${tone} focus-visible:shadow-selected focus-visible:outline-none`}
    >
      <span>{filter.label}</span>
      {filter.unresolved ? (
        <span className="text-ink-3">{filter.unresolved.headline}</span>
      ) : (
        <span className="tabular text-ink-3">{filter.count}</span>
      )}
    </button>
  );
}

/**
 * The active filter, or the one that hides nothing when the id does not
 * resolve — the queue always lists SOMETHING it can name, never rows under a
 * filter it cannot describe.
 */
function filterFor(
  queue: FindingQueue,
  filterId: FindingQueueFilterId,
): FindingQueueFilter {
  return queue.filters.find((filter) => filter.id === filterId) ?? queue.filters[0];
}

/** The filter this run cannot apply, if there is one. */
function unresolvedFilter(
  queue: FindingQueue,
): UnresolvedFindingQueueFilter | undefined {
  for (const filter of queue.filters) {
    if (filter.unresolved) return filter;
  }
  return undefined;
}
