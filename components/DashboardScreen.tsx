/**
 * DashboardScreen — `/dashboard`, the workspace in one screen.
 *
 * WHAT A REVIEWER OPENS A DASHBOARD FOR. Not a scoreboard: the next decision.
 * So the screen leads with the one review that most needs a human, then the
 * open findings behind it, then who is holding what. The roll-ups that are
 * only context — reviews by state, the trust readings on record — sit in the
 * secondary column to the right.
 *
 * EVERY NUMBER HERE IS COUNTED, AND COUNTED ONCE. getWorkspaceDashboard()
 * assembles all of it from accessors that already exist (getWorkspaceReviews,
 * getFindings, getRunHistory), so this component makes ONE call and cannot
 * arrive at the same figure a second, differing way. It sorts nothing, sums
 * nothing and formats no number: the strings that carry counts — a group's
 * "2 reviews · 14 open findings", a delta's "Trust score 68 → 72" — are the
 * data layer's own, assembled beside the counting.
 *
 * WHAT THIS SCREEN DELIBERATELY DOES NOT DRAW, because nothing records it:
 *
 *   - No trend, no sparkline, no time series. This build holds ONE point in
 *     time per run plus one earlier run of one bundle. Two readings are a
 *     comparison, not a series, so the one cross-run statement it can make is
 *     rendered as exactly that — two scores and the direction between them.
 *   - No "this quarter", no percentage change over a period. Nothing here is
 *     dated into a window, so any such figure would be invented.
 *   - No workspace trust average. Six reviews' scores blended would print a
 *     figure nothing recorded and no reader could check; the screen shows each
 *     recorded reading, and says how many recorded none (`trust.note`).
 *   - No zero standing in for an absence. A review with no score carries its
 *     own typed reason and prints it.
 *
 * THE PICK IS STATED, NOT ASSUMED. The lead card holds the review with the
 * most open findings AMONG THE ONES THAT OPEN FROM HERE — most of the
 * portfolio is listed with counts only and has nothing behind it to open — and
 * the card says that rule in the reader's words rather than presenting the
 * choice as an oracle. When nothing openable has an open finding, there is no
 * lead card and no action: the screen says why instead.
 *
 * PROVENANCE. The only provider-produced figure on this screen is the
 * live-source sync instant, which is a SerpApi query trace's `searchedAt`, so
 * SerpApi is named beside it and nowhere else. Reviews, findings, decisions
 * and trust readings are records — no provider produced them, and none is
 * credited with them.
 *
 * Instants are ABSOLUTE UTC through the data layer's own already-formatted
 * sentence, never "N minutes ago": the fixtures are fixed in time, so elapsed
 * figures would be false, and computing one at render differs between the
 * server pass and the client pass.
 *
 * Server component — it reads the data layer once and renders it; nothing here
 * fetches, and there is nothing to fetch (lib/data/index.ts).
 *
 * Token-pure: 1px --color-line borders, 5px status dots as the only marks, no
 * coloured left rules, weight ceiling 500, and exactly ONE shadow-action — the
 * way into the work, on the lead card.
 *
 * Layout: the root layout's <main> is the flex column, so this renders a
 * shrink-0 strip and two independently scrolling columns inside a min-h-0 row.
 * The page itself never scrolls.
 *
 * TODO(schema-gap: Workspace): there is no workspace, tenant or portfolio
 * entity in lib/types.ts — WorkspaceDashboard is a view-model over the fixture
 * run registry, and must be replaced rather than reconciled when one lands.
 */

import Link from "next/link";

import { confidenceBand, type ConfidenceBand } from "./ConfidenceMeter";
import {
  getWorkspaceDashboard,
  getWorkspaceSources,
  getWorkspaceSummary,
} from "@/lib/data";
import type {
  DashboardAttention,
  DashboardStateGroup,
  DashboardTrust,
  DashboardTrustMovement,
  DashboardWaitGroup,
  RunTrustDelta,
  WorkspaceDashboard,
  WorkspaceReviewRow,
  WorkspaceReviewState,
  WorkspaceReviewTrust,
  WorkspaceSummary,
  WorkspaceWaitState,
} from "@/lib/data";

/**
 * The screen's own words. Copy is a design-system concern (DESIGN_SYSTEM.md
 * wins on it); every NUMBER, NAME, TITLE, SCORE and INSTANT beside them comes
 * off the data layer. The two functions below agree a noun with a count — they
 * state no quantity of their own.
 */
const COPY = {
  /** Names the wider column for a screen reader; the eye reads its cards. */
  primaryColumn: "What needs a decision",
  /** The same for the secondary column. */
  contextColumn: "Where the portfolio stands",
  lead: "Next decision",
  leadAction: "Open the review",
  /** The pick names its own rule, so the choice is checkable. */
  leadRule:
    "Chosen as the review with the most open findings among those that open from here.",
  /** Nothing openable has an open finding — said, not left blank. */
  noLeadHeadline: "No review here opens onto an open finding",
  noLeadReason:
    "There is nowhere to send you first: every review with a finding still waiting on a decision is listed with its counts only, so no queue was loaded behind it.",
  attention: "Open findings",
  /** The band rows account for part of the total; this names the rest. */
  notBanded: "Not broken down",
  attentionCheck: (banded: number, total: number) =>
    `${banded} of ${total} broken down by materiality.`,
  waiting: "Waiting on a decision",
  states: "Reviews by state",
  statesLink: "Open the reviews index",
  trust: "Trust readings",
  /** Heads the score on the lead card, as it does on a reviews-index row. */
  trustLabel: "Trust score",
  /** Reads after the band word, as it does on a reviews-index row. */
  trustBand: "trust",
  movement: "Between two runs of one bundle",
  /** Says what the comparison is, so it is not read as a series. */
  movementNote:
    "Each row compares the two runs a bundle actually recorded. A trust reading exists per run, so two of them are a comparison and not a trend — there is no series here to draw, and none is drawn.",
  noMovement:
    "No bundle in this workspace has been analyzed twice, so there is no movement in trust to compare.",
  unscored: "Recorded no score",
  /** The absence is reported rather than back-filled with an instant. */
  noSync:
    "No live source has been reached in this workspace's record, so there is no sync to report.",
  empty: "There is nothing to roll up: the data layer holds no reviews.",
  scale: (reviews: number, open: number) =>
    `${reviews} ${reviews === 1 ? "review" : "reviews"} · ${
      open === 0
        ? "No open findings"
        : `${open} ${open === 1 ? "open finding" : "open findings"}`
    }`,
} as const;

/**
 * Review state → tone, keyed as a total Record off the data-layer union so a
 * fourth state fails the build rather than rendering an untinted dot. The same
 * three tones a reviews-index row carries, for the same three meanings: ink is
 * in progress, warn is someone owes a decision, accent is agreed.
 *
 * The state's WORDS are always the data layer's (`group.label`); only the
 * token carrying it is decided here.
 */
const STATE_DOT: Record<WorkspaceReviewState, string> = {
  analyzing: "bg-ink",
  open_findings: "bg-warn",
  signed_off: "bg-accent",
};

const STATE_TEXT: Record<WorkspaceReviewState, string> = {
  analyzing: "text-ink",
  open_findings: "text-warn",
  signed_off: "text-accent",
};

/** Waiting-on state → tone. Same three meanings, same three tokens. */
const WAIT_DOT: Record<WorkspaceWaitState, string> = {
  analysis: "bg-ink",
  reviewer: "bg-warn",
  nobody: "bg-accent",
};

/**
 * Trust band → tone and word. The THRESHOLDS are not restated here:
 * `confidenceBand` is imported from ConfidenceMeter, the one place 0.80 and
 * 0.70 are written down, so this screen cannot drift from the meter, the dial
 * or a reviews-index row. Colour never carries meaning alone — each band has a
 * word beside it.
 */
const TRUST_TONE: Record<ConfidenceBand, { word: string; text: string }> = {
  high: { word: "high", text: "text-accent" },
  moderate: { word: "moderate", text: "text-warn" },
  low: { word: "low", text: "text-alert" },
};

/**
 * Direction of a trust movement → tone, keyed off the data-layer union. The
 * direction word itself is in the delta's own `text`; this is only the colour.
 */
const DIRECTION_TEXT: Record<RunTrustDelta["direction"], string> = {
  up: "text-accent",
  down: "text-alert",
  flat: "text-ink-3",
};

export interface DashboardScreenProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen took it.
   * Rendered as the document's `sr-only` h1: ContextBar already prints these
   * words at the head of the main column, and printing them twice is the
   * duplication removed everywhere else. The bar's label is a span, so without
   * this heading the screen would have no h1 at all.
   */
  title: string;
  /**
   * The roll-up. Defaults to the data layer's — there is one workspace and no
   * endpoint behind it, so the accessor is the only source, and it is the same
   * one the reviews index counts from.
   */
  dashboard?: WorkspaceDashboard;
  /**
   * The workspace strip's figures, for the live-source sync note alone. It is
   * the same already-formatted absolute instant the reviews index prints, so
   * the two screens cannot report different freshness.
   */
  summary?: WorkspaceSummary;
  /** "SerpApi" — the provider that returned the searches the sync dates. */
  liveProvider?: string;
}

export default function DashboardScreen({
  title,
  dashboard = getWorkspaceDashboard(),
  summary = getWorkspaceSummary(),
  liveProvider = getWorkspaceSources().provider,
}: DashboardScreenProps) {
  // Every review the roll-up holds, in the data layer's own group order
  // (analyzing, then open findings, then signed off). Flattened here only to
  // pick the lead and to list the reviews that recorded no score — no count is
  // taken off it.
  const rows: readonly WorkspaceReviewRow[] = dashboard.states.flatMap(
    (group) => group.reviews,
  );

  // THE LEAD. Openable (an href exists only where a full review exists behind
  // the row) and still owed a decision, most open findings first. Ties fall to
  // the data layer's order. The card states this rule; see COPY.leadRule.
  const lead = rows.reduce<{ row: WorkspaceReviewRow; href: string } | undefined>(
    (best, row) => {
      // An href exists only where a full review exists behind the row, so this
      // test is also what makes the link safe to render.
      if (row.href === undefined || row.counts.open === 0) return best;
      if (best !== undefined && best.row.counts.open >= row.counts.open) {
        return best;
      }
      return { row, href: row.href };
    },
    undefined,
  );

  // Reviews with no recorded score, each carrying its own typed reason. The
  // count of these is the data layer's `trust.unavailableCount`; this list is
  // the same set, named.
  const unscored = rows.filter((row) => row.trust.unavailable !== undefined);

  return (
    <>
      <SummaryStrip
        dashboard={dashboard}
        summary={summary}
        liveProvider={liveProvider}
      />

      {dashboard.reviewCount === 0 ? (
        /* The workspace holds nothing. The screen says so rather than drawing
           a wall of zeros, which would read as a measured emptiness. */
        <section
          aria-label={title}
          className="scroll-col flex flex-1 items-center justify-center p-8"
        >
          <div className="w-full max-w-lg rounded border border-line bg-surface p-6">
            <h1 className="sr-only">{title}</h1>
            <p className="text-body text-ink-3">{COPY.empty}</p>
          </div>
        </section>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* WHAT NEEDS A HUMAN — the reason this screen exists, so it leads
              and it gets the wider column. */}
          <section
            aria-label={COPY.primaryColumn}
            className="scroll-col flex-1 px-5 py-5"
          >
            <h1 className="sr-only">{title}</h1>

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {lead ? (
                <LeadCard row={lead.row} href={lead.href} />
              ) : (
                <NoLeadCard />
              )}
              <AttentionCard attention={dashboard.attention} />
              <WaitingCard groups={dashboard.waiting} />
            </div>
          </section>

          {/* CONTEXT — where the portfolio has got to, and what it scored. */}
          <aside
            aria-label={COPY.contextColumn}
            className="flex min-h-0 w-queue shrink-0 flex-col border-l border-line bg-canvas"
          >
            <div className="scroll-col flex-1 px-4 py-4">
              <StatesPanel groups={dashboard.states} />
              <div className="mt-5">
                <TrustPanel trust={dashboard.trust} unscored={unscored} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/**
 * The one-row header: the workspace's scale, and the last time a live source
 * was actually reached.
 *
 * The instant is the data layer's already-formatted absolute UTC sentence, and
 * SerpApi is named beside it because SerpApi returned the searches it dates.
 * Nothing else on this screen is SerpApi's, so nothing else carries the tag.
 */
function SummaryStrip({
  dashboard,
  summary,
  liveProvider,
}: {
  dashboard: WorkspaceDashboard;
  summary: WorkspaceSummary;
  liveProvider: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
      <p className="tabular text-caption text-ink-3">
        {COPY.scale(
          dashboard.reviewCount,
          dashboard.attention.openFindingCount,
        )}
      </p>

      <p className="flex items-center gap-2 text-caption text-ink-3">
        {summary.sync ? (
          <>
            <span
              aria-hidden="true"
              className="size-[5px] shrink-0 rounded-full bg-accent"
            />
            <span className="tabular">{summary.sync.text}</span>
          </>
        ) : (
          <span>{COPY.noSync}</span>
        )}
        <ProviderTag provider={liveProvider} />
      </p>
    </div>
  );
}

/** Provider attribution sits next to its output — no legend needed. */
function ProviderTag({ provider }: { provider: string }) {
  return (
    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro uppercase text-ink-3">
      {provider}
    </span>
  );
}

function SectionHeading({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-micro uppercase text-ink-3">{label}</h2>
      {detail ? (
        <span className="tabular text-micro uppercase text-ink-3">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The way into the work — and the ONE element on this screen with
 * `shadow-action`.
 *
 * Everything on it is the row's own: the state and its label, the counts, who
 * it is waiting on, the score or the typed reason there is none. The card adds
 * the rule by which it was chosen, and nothing else.
 */
function LeadCard({ row, href }: { row: WorkspaceReviewRow; href: string }) {
  const band =
    row.trust.value === undefined
      ? undefined
      : TRUST_TONE[confidenceBand(row.trust.value)];

  return (
    <section className="rounded border border-line bg-surface p-5">
      <SectionHeading label={COPY.lead} />

      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          {/* State as colour-coded TEXT beside the 5px dot — never a border. */}
          <p className="flex items-center gap-1.5 text-micro uppercase">
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${STATE_DOT[row.state]}`}
            />
            <span className={`font-medium ${STATE_TEXT[row.state]}`}>
              {row.stateLabel}
            </span>
          </p>

          <p className="mt-1.5 text-display font-medium text-ink">
            {row.title}
          </p>

          {row.subtitle ? (
            <p className="mt-1 text-caption text-ink-3">{row.subtitle}</p>
          ) : null}

          <p className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="tabular text-caption text-ink-3">
              {row.counts.text}
            </span>
            <span aria-hidden="true" className="text-caption text-ink-3">
              ·
            </span>
            <span className="text-caption text-ink-2">{row.waiting.text}</span>
          </p>
        </div>

        {/* The score where the review has one; the named absence where it does
            not. Nothing renders an empty slot. */}
        <div className="w-32 shrink-0 text-right">
          <TrustCell trust={row.trust} band={band} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 text-caption text-ink-3">
          {COPY.leadRule}
        </p>

        {/* The single shadow-action element on this screen. */}
        <Link
          href={href}
          className="shrink-0 rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
        >
          {COPY.leadAction}
        </Link>
      </div>
    </section>
  );
}

/**
 * What stands where the lead card would be when nothing openable is owed a
 * decision. Consequence before cause, and no action — a screen with nowhere to
 * send you must not offer a button that goes somewhere else.
 */
function NoLeadCard() {
  return (
    <section className="rounded border border-line bg-surface p-5">
      <SectionHeading label={COPY.lead} />
      <p className="mt-2.5 text-label font-medium text-ink">
        {COPY.noLeadHeadline}
      </p>
      <p className="mt-1.5 text-body text-ink-2">{COPY.noLeadReason}</p>
    </section>
  );
}

/**
 * The open findings, and how much of the total can be broken down.
 *
 * Materiality is NOT colour-coded — a finding card prints it as plain label
 * text, and the three semantic tokens mean verified / stale / conflict, not
 * severity. Borrowing them for a severity ramp would give `alert` a second
 * meaning on the one screen that summarizes every other.
 *
 * The bands cover only the reviews with a queue behind them. The rest are
 * counted and not banded, and that row is rendered rather than dropped: the
 * bands plus "Not broken down" add to the total, which is arithmetic a reader
 * can check on screen.
 */
function AttentionCard({ attention }: { attention: DashboardAttention }) {
  return (
    <section className="rounded border border-line bg-surface">
      <div className="px-5 pt-4">
        <SectionHeading
          label={COPY.attention}
          detail={`${attention.openFindingCount}`}
        />
      </div>

      <dl className="mt-2 flex flex-col">
        {attention.bands.map((band) => (
          <CountRow
            key={band.materiality}
            term={band.label}
            value={band.count}
          />
        ))}
        {attention.countedOnlyCount > 0 ? (
          <CountRow
            term={COPY.notBanded}
            value={attention.countedOnlyCount}
            muted
          />
        ) : null}
      </dl>

      {attention.countedOnlyNote ? (
        <div className="border-t border-line px-5 py-3">
          <p className="tabular text-caption text-ink-2">
            {COPY.attentionCheck(
              attention.bandedCount,
              attention.openFindingCount,
            )}
          </p>
          {/* The system says what it does not know. */}
          <p className="mt-1 text-caption text-ink-3">
            {attention.countedOnlyNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** One term-and-count row. The count is the data's; the noun is the data's. */
function CountRow({
  term,
  value,
  muted = false,
}: {
  term: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft px-5 py-2.5 last:border-b-0">
      <dt className={`text-body ${muted ? "text-ink-3" : "text-ink-2"}`}>
        {term}
      </dt>
      <dd
        className={`tabular text-title font-medium ${muted ? "text-ink-3" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Who is holding what.
 *
 * Each row prints the group's OWN sentence — "M. Bui · Reviewer · 2 reviews ·
 * 14 open findings", "Waiting on analysis · 1 review · No findings yet". It is
 * not re-split into columns here on purpose: the data layer is what keeps
 * "No open findings" (nothing left to decide) apart from "No findings yet"
 * (nothing produced yet), and a component that rebuilt the sentence from the
 * two counts would collapse that distinction and report an analysis in
 * progress as cleared.
 *
 * Order is the data layer's: the people owed a decision first, by how many
 * open findings they hold, then the run still analyzing, then the reviews
 * nobody is holding up.
 */
function WaitingCard({ groups }: { groups: readonly DashboardWaitGroup[] }) {
  return (
    <section className="rounded border border-line bg-surface">
      <div className="px-5 pt-4">
        <SectionHeading label={COPY.waiting} />
      </div>

      <ul className="mt-2 flex flex-col">
        {groups.map((group) => (
          <li
            key={`${group.state}-${group.actor?.id ?? ""}`}
            className="flex gap-2 border-b border-line-soft px-5 py-2.5 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={`mt-2 size-[5px] shrink-0 rounded-full ${WAIT_DOT[group.state]}`}
            />
            <span className="tabular min-w-0 text-body text-ink-2">
              {group.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Where the portfolio has got to. One row per state the workspace actually
 * has — a state with no reviews in it is absent from the data, so no row here
 * reports a zero.
 */
function StatesPanel({ groups }: { groups: readonly DashboardStateGroup[] }) {
  return (
    <section aria-label={COPY.states}>
      <SectionHeading label={COPY.states} />

      <ul className="mt-2 flex flex-col rounded border border-line bg-surface">
        {groups.map((group) => (
          <li
            key={group.state}
            className="border-b border-line-soft px-4 py-2.5 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-1.5 text-micro uppercase">
                <span
                  aria-hidden="true"
                  className={`size-[5px] shrink-0 rounded-full ${STATE_DOT[group.state]}`}
                />
                <span className={`font-medium ${STATE_TEXT[group.state]}`}>
                  {group.label}
                </span>
              </span>
              <span className="tabular text-title font-medium text-ink">
                {group.count}
              </span>
            </div>
            {/* "3 reviews · 17 open findings" — the group's own sentence. */}
            <p className="tabular mt-0.5 text-caption text-ink-3">
              {group.text}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-caption">
        <Link
          href="/reviews"
          className="text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {COPY.statesLink}
        </Link>
      </p>
    </section>
  );
}

/**
 * The trust readings on record — each one, never an average of them.
 *
 * The readings are the data layer's, highest first. The reviews that recorded
 * no score are listed by name beneath, each printing its own reason: a run
 * that could not finish its checks and an analysis still running are different
 * absences, and both are different from a low score.
 *
 * The movement is the ONE cross-run statement this build can make, and it is
 * drawn as two numbers and a direction — not as a line, because two readings
 * of one bundle are a comparison and nothing here is a series.
 */
function TrustPanel({
  trust,
  unscored,
}: {
  trust: DashboardTrust;
  unscored: readonly WorkspaceReviewRow[];
}) {
  return (
    <section aria-label={COPY.trust}>
      <SectionHeading label={COPY.trust} detail={`${trust.scoredCount}`} />

      <ul className="mt-2 flex flex-col rounded border border-line bg-surface">
        {trust.readings.map((reading) => (
          <li
            key={reading.reviewId}
            className="flex items-baseline justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0"
          >
            <span className="min-w-0 text-caption text-ink-2">
              {reading.title}
            </span>
            <TrustReadingValue trust={reading.trust} />
          </li>
        ))}
      </ul>

      {/* "5 reviews scored · 1 review recorded no score", then why there is no
          single number for the workspace. */}
      <p className="tabular mt-2 text-caption text-ink-2">{trust.text}</p>
      <p className="mt-1 text-caption text-ink-3">{trust.note}</p>

      {unscored.length > 0 ? (
        <div className="mt-3">
          <SectionHeading
            label={COPY.unscored}
            detail={`${trust.unavailableCount}`}
          />
          <ul className="mt-2 flex flex-col rounded border border-line bg-surface">
            {unscored.map((row) => (
              <li
                key={row.id}
                className="border-b border-line-soft px-4 py-2.5 last:border-b-0"
              >
                <p className="text-caption text-ink-2">{row.title}</p>
                {row.trust.unavailable ? (
                  <>
                    <p className="mt-0.5 text-caption text-ink-3">
                      {row.trust.unavailable.headline}
                    </p>
                    <p className="mt-0.5 text-caption text-ink-3">
                      {row.trust.unavailable.reason}
                    </p>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <SectionHeading label={COPY.movement} />
        {trust.movements.length === 0 ? (
          <p className="mt-2 text-caption text-ink-3">{COPY.noMovement}</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col rounded border border-line bg-surface">
              {trust.movements.map((movement) => (
                <MovementRow key={movement.reviewId} movement={movement} />
              ))}
            </ul>
            <p className="mt-2 text-caption text-ink-3">{COPY.movementNote}</p>
          </>
        )}
      </div>
    </section>
  );
}

/** A reading's percentage and its band word. Both come off the same value. */
function TrustReadingValue({ trust }: { trust: WorkspaceReviewTrust }) {
  const band =
    trust.value === undefined
      ? undefined
      : TRUST_TONE[confidenceBand(trust.value)];

  if (!band || !trust.display) {
    return trust.unavailable ? (
      <span className="shrink-0 text-caption text-ink-3">
        {trust.unavailable.headline}
      </span>
    ) : null;
  }

  return (
    <span className="shrink-0 text-right">
      <span className="tabular block text-title font-medium text-ink">
        {trust.display}
      </span>
      <span className={`block text-micro font-medium uppercase ${band.text}`}>
        {band.word} {COPY.trustBand}
      </span>
    </span>
  );
}

/** One bundle's movement: which runs, and the two scores between them. */
function MovementRow({ movement }: { movement: DashboardTrustMovement }) {
  return (
    <li className="px-4 py-2.5">
      <p className="text-caption text-ink-2">{movement.title}</p>
      {/* "Trust score 68 → 72" — built in lib/data from the two runs' own
          recorded readings, never from a rate of change. */}
      <p
        className={`tabular mt-0.5 text-title font-medium ${DIRECTION_TEXT[movement.delta.direction]}`}
      >
        {movement.delta.text}
      </p>
      <p className="tabular mt-0.5 text-caption text-ink-3">
        {movement.runText}
      </p>
    </li>
  );
}

/**
 * The lead card's score cell — the reviews-index treatment, so the same review
 * reads the same way on both screens.
 */
function TrustCell({
  trust,
  band,
}: {
  trust: WorkspaceReviewTrust;
  band?: { word: string; text: string };
}) {
  if (band && trust.display) {
    return (
      <>
        <p className="text-micro uppercase text-ink-3">{COPY.trustLabel}</p>
        <p className="tabular text-value font-medium text-ink">
          {trust.display}
        </p>
        <p className={`text-micro font-medium uppercase ${band.text}`}>
          {band.word} {COPY.trustBand}
        </p>
      </>
    );
  }

  return trust.unavailable ? (
    <>
      <p className="text-label text-ink-3">{trust.unavailable.headline}</p>
      <p className="mt-1 text-caption text-ink-3">{trust.unavailable.reason}</p>
    </>
  ) : null;
}
