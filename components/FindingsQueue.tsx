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
 * THE RUN DIFF. Cards mark the findings this run reported and the previous one
 * did not, and the header says how many of the rows on screen carry that mark.
 * Both come from getRunDiff() for THE RUN THIS QUEUE IS SHOWING, resolved from
 * the route the same way ContextBar resolves the review it titles — never from
 * the accessor's default. That default is DEMO_REVIEW_ID, and the degraded run
 * reuses the demo run's finding ids, so letting it stand would print "New since
 * the last run" on two degraded cards against a comparison that run never had.
 * When no comparison resolves — a first run, a live run, a queue rendered off
 * this route — the header says so instead of leaving the cards' silence to be
 * read as "nothing changed".
 *
 * COLLAPSED, the column is var(--spacing-queue-min) (w-queue-min, 46px): the
 * control that reopens it, one 5px status dot per listed finding — the one
 * non-text mark this system allows, in the same verdict colour the finding's
 * card carries, each a button that selects it — and the open count set
 * vertically beneath them. Nothing on the rail is authored: the dots are the
 * `findings` prop and the count is `breakdown.open`, the same number the
 * expanded header's scale line opens with.
 *
 * Client component: it owns the selection and filter interactions.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";

import CoverageBar from "./CoverageBar";
import FindingCard, { isNewSinceLastRun, VERDICT } from "./FindingCard";
import { getFindingsFooter, getRunDiff } from "@/lib/data";
import type {
  CoverageBreakdown,
  Finding,
  FindingQueue,
  FindingQueueFilter,
  FindingQueueFilterId,
  FindingRunChange,
  FindingsFooter,
  FlagStatus,
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

/**
 * The diff line's words. Same division as the two blocks above: the nouns are
 * the design system's, the NUMBER is counted off the rows this queue is
 * rendering — not off the run — so the line describes the list under it even
 * when a filter is hiding most of it.
 *
 * The no-comparison sentence says exactly what is missing (a comparison) and
 * not what would be a guess (that no previous run exists): getRunDiff also
 * returns nothing for a run this client cannot resolve, and "this run is the
 * first" would be a claim about history in that case.
 */
const CHANGE_COPY = {
  count: (count: number) =>
    count === 1
      ? "1 finding here is new since the last run"
      : `${count} findings here are new since the last run`,
  none: "Nothing here is new since the last run",
  uncompared:
    "Nothing here is marked new: this run records no comparison with a previous run.",
} as const;

/**
 * The collapsed rail's words, and the one thing on it that is not a word.
 *
 * `dot` is the 5px status dot — the ONE non-text mark this system allows
 * (DESIGN_SYSTEM.md, Foundations → Icons), which is why the rail can be a
 * column of them and still have no icons in it. Colour never carries the
 * meaning alone: every dot is a button whose accessible name says the finding,
 * its verdict IN WORDS and whether it has been decided.
 *
 * TODO(duplication: verdict tone) — this Record restates FindingCard's own
 * VERDICT map, which is module-private there. The rail and the card draw the
 * same dot for the same finding, so the two tables have to agree, and today
 * only a browser check proves they do. The fix is one word: export VERDICT from
 * components/FindingCard.tsx (it already exports isNewSinceLastRun for exactly
 * this reason — one predicate, drawn and counted in two files) and import it
 * here. That file belongs to another change in flight, so the export is left
 * for it rather than raced for.
 */
/*
 * The rail's dots read their label and colour from THE CARD'S OWN MAP, imported
 * from FindingCard. This file briefly carried a fifth copy of that mapping,
 * which would have made the collapsed column and the expanded one two
 * independent claims about the same finding — free to drift the moment either
 * changed. They are one claim now.
 */

/** How a decided finding says so in its dot's name. Total, like the map above. */
const RAIL_STATUS: Record<FlagStatus, string> = {
  open: "open",
  approved: "approved",
  rejected: "rejected",
};

const RAIL_COPY = {
  collapse: "Collapse findings queue",
  expand: "Expand findings queue",
  /** Points at the column it opens; the queue is on the left of the screen. */
  glyph: (collapsed: boolean) => (collapsed ? "›" : "‹"),
  /**
   * The rail's one line of text, set vertically. It counts the SAME number the
   * expanded header's scale line opens with — `breakdown.open`, off the
   * findings this queue is listing — so collapsing the column cannot change
   * what it says is left to do.
   */
  open: (open: number) =>
    `${open} open ${open === 1 ? "finding" : "findings"}`,
  /** Names each dot: what it is, what it found, and whether it is settled. */
  dot: (label: string, verdict: string, status: string) =>
    `${label}, ${verdict}, ${status}`,
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
  /**
   * Collapses the column to var(--spacing-queue-min) — a rail of status dots,
   * one per listed finding, and the open count set vertically beneath them.
   *
   * CONTROLLED when passed: the collapsed columns are the review screen's
   * layout and ReviewWorkspace holds them beside the selection and the filter.
   * Omitted, this component keeps its own flag instead of rendering a control
   * that does nothing — an inert affordance is the dead control this project
   * keeps refusing to ship — so the queue collapses on its own on any screen
   * that has not wired the state up yet.
   */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
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
  collapsed,
  onCollapsedChange,
}: FindingsQueueProps) {
  // The caller's flag wins whenever there is one; the fallback exists only so
  // the control is never inert. See `collapsed` above.
  const [ownCollapsed, setOwnCollapsed] = useState(false);
  const isCollapsed = collapsed ?? ownCollapsed;
  const setCollapsed = onCollapsedChange ?? setOwnCollapsed;

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

  // The diff for the run on screen, keyed by finding id. Undefined values are
  // the honest answer for a finding no comparison covers, and the map is empty
  // when there is no comparison at all — no card is marked either way.
  const pathname = usePathname();
  const changes = runChanges(pathname);
  const newCount = findings.filter((finding) =>
    isNewSinceLastRun(changes.get(finding.id)),
  ).length;

  // Live, off the session breakdown: "9 open · 2 resolved · 11 findings".
  // Every number is counted from the findings this queue is rendering.
  const scaleLine = [
    `${breakdown.open} ${SCALE_COPY.open}`,
    `${breakdown.approved + breakdown.rejected} ${SCALE_COPY.resolved}`,
    SCALE_COPY.findings(breakdown.total),
  ].join(SEGMENT_SEPARATOR);

  /**
   * THE RAIL. At var(--spacing-queue-min) the queue gives 346px to the
   * document and keeps three things: the way back, one dot per listed finding,
   * and the count of what is still open.
   *
   * The dots are the queue in miniature — same order, same verdict colours,
   * same selection — and each is a real button, so the reviewer can still move
   * between findings without reopening the column. The list carries
   * `.scroll-col` for the same reason the expanded list does: a run with more
   * findings than fit must scroll the rail, never the page.
   */
  if (isCollapsed) {
    return (
      <aside
        id={QUEUE_ID}
        aria-label="Findings queue"
        className="flex w-queue-min min-h-0 shrink-0 flex-col items-center gap-2 border-r border-line bg-canvas py-3 transition-[width] duration-220 ease-in-out motion-reduce:transition-none"
      >
        <QueueCollapseControl collapsed onToggle={() => setCollapsed(false)} />

        <div className="scroll-col flex w-full flex-1 flex-col items-center gap-2 px-2 py-1">
          {findings.map((finding) => (
            <RailDot
              key={finding.id}
              finding={finding}
              selected={finding.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>

        {/* The one line of text, turned to fit. Counted off `breakdown`, like
            every number in the expanded header — never typed in. */}
        <p className="tabular shrink-0 rotate-180 [writing-mode:vertical-rl] text-micro uppercase text-ink-3">
          {RAIL_COPY.open(breakdown.open)}
        </p>
      </aside>
    );
  }

  return (
    <aside
      id={QUEUE_ID}
      aria-label="Findings queue"
      className="flex w-queue min-h-0 shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-220 ease-in-out motion-reduce:transition-none"
    >
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line bg-surface px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-label font-medium text-ink">Findings</h2>
            <QueueCollapseControl
              collapsed={false}
              onToggle={() => setCollapsed(true)}
            />
          </div>

          {/* The scale line replaces the bare open count that sat top-right:
              it says the same thing and three more, so both would repeat. */}
          <p className="tabular text-caption text-ink-3">{scaleLine}</p>

          {/* One line about the previous run, and only about what is listed.
              It is not the analysis screen's change summary in miniature: no
              resolved count (the scale line above already spends the word
              "resolved" on signed decisions), no changed count, no trust
              delta — just the mark the cards beneath it carry, counted with
              the same predicate that draws it. Suppressed while the list is
              empty, where the empty state is the answer instead. */}
          {findings.length > 0 ? (
            <p className="tabular text-caption text-ink-3">
              {changes.size === 0
                ? CHANGE_COPY.uncompared
                : newCount === 0
                  ? CHANGE_COPY.none
                  : CHANGE_COPY.count(newCount)}
            </p>
          ) : null}
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
              change={changes.get(finding.id)}
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
// The collapsed rail
// ---------------------------------------------------------------------------

/** The region the collapse control opens and closes, for aria-controls. */
const QUEUE_ID = "findings-queue";

/**
 * The control that collapses the column and the one that reopens it — the same
 * component in both states, so the way back is where the way out was.
 *
 * A single chevron, the same class of typographic mark as the "Next finding →"
 * arrow this screen's decision bar already sets in copy — not an icon from a
 * set, and it carries nothing on its own: `aria-label` names the action in
 * words, `aria-expanded` reports the column's state, `title` repeats the
 * sentence for the mouse.
 */
function QueueCollapseControl({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const label = collapsed ? RAIL_COPY.expand : RAIL_COPY.collapse;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls={QUEUE_ID}
      title={label}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-surface text-caption leading-none text-ink-3 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
    >
      <span aria-hidden>{RAIL_COPY.glyph(collapsed)}</span>
    </button>
  );
}

/**
 * One finding as a 5px dot in a pressable target.
 *
 * The dot is the finding's verdict colour, the same one its card carries. A
 * DECIDED finding is drawn back — the queue is a list of what is left to do, so
 * the eleven dots should not all shout equally — and it says which decision it
 * was in its accessible name, because colour and opacity are not meaning.
 *
 * Selection is a HALO, not a border: `shadow-selected` is the 1px ink ring
 * every selected thing on this screen already wears, and it costs no layout, so
 * the column of dots does not shift by a pixel when the selection moves. It is
 * not `shadow-action` — that belongs to the decision bar's Approve button, and
 * there is one of those per screen.
 */
function RailDot({
  finding,
  selected,
  onSelect,
}: {
  finding: Finding;
  selected: boolean;
  onSelect: (findingId: string) => void;
}) {
  const verdict = VERDICT[finding.verdict];
  const name = RAIL_COPY.dot(
    finding.label,
    verdict.label,
    RAIL_STATUS[finding.status],
  );

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={name}
      title={name}
      onClick={() => onSelect(finding.id)}
      className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full ${
        selected ? "shadow-selected" : ""
      } focus-visible:shadow-selected focus-visible:outline-none`}
    >
      <span
        aria-hidden="true"
        className={`size-[5px] rounded-full ${verdict.dot} ${
          finding.status === "open" ? "" : "opacity-40"
        }`}
      />
    </button>
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

// ---------------------------------------------------------------------------
// The run this queue is showing
// ---------------------------------------------------------------------------

const REVIEWS_SEGMENT = "reviews";
const REVIEW_SEGMENT = "review";

/**
 * The review id in `/reviews/{id}/review`, or undefined on any other path.
 *
 * Duplicated from ContextBar, where the same three-segment match is
 * module-private, and deliberately so: both components answer "which review is
 * on screen" from the route because neither is passed it, and a shared helper
 * would be a data-layer function that reads a URL. Matching on segments rather
 * than a prefix keeps `/reviews/{id}` and `/reviews/{id}/audit` out of it.
 */
function reviewIdInPath(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 3 &&
    segments[0] === REVIEWS_SEGMENT &&
    segments[2] === REVIEW_SEGMENT
    ? segments[1]
    : undefined;
}

/**
 * Every finding's place in the diff for the run at this path, by id.
 *
 * NO FALLBACK, for the reason /reviews/[id]/review and ContextBar have none: an
 * id this client cannot resolve is not the demo run, and the demo run's diff
 * under another run's findings would mark cards new against a comparison that
 * never happened. An unresolvable path returns an empty map, which the header
 * reports as an absent comparison rather than as an absence of change.
 */
function runChanges(pathname: string): Map<string, FindingRunChange> {
  const reviewId = reviewIdInPath(pathname);
  const diff = reviewId === undefined ? undefined : getRunDiff(reviewId);
  return new Map((diff?.changes ?? []).map((change) => [change.findingId, change]));
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
