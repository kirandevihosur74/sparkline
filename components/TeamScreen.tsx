/**
 * TeamScreen — the body of `/team`: the people this workspace's record
 * names, and what that record says each of them has actually done.
 *
 * WHAT REPLACED THE STUB. The stub said the screen would hold "the people who
 * can decide findings, the signing identity each of them approves under, and
 * which reviews are assigned to whom", and admitted there was no roster
 * because "the demo signs every decision as one fixed reviewer". Neither half
 * is true any more: the roster signs, runs and countersigns on this ledger, and
 * `getWorkspaceTeam()` counts each of them off the audit ledger and the review
 * portfolio. So the screen renders that instead of an emptiness that no longer
 * exists.
 *
 * EVERY NUMBER IS THE DATA LAYER'S. This component counts nothing and sums
 * nothing. The header line, the scope note, each activity fact and its wording,
 * the role note, the last-active label and the per-review counts are all built
 * in lib/data and rendered here as given. The only arithmetic is filtering
 * `getWorkspaceReviews()` down to the rows waiting on one actor — the SAME
 * predicate getWorkspaceTeam() applies to produce `waitingReviewCount`, so the
 * list beneath a count can never disagree with it.
 *
 * ZERO IS NEVER PRINTED AS A MEASUREMENT. `ActorActivity.facts` holds only
 * non-zero counts, so Kiran's card reads "2 analysis runs executed" and does
 * not also report that he signed no decisions — a pipeline owner signing
 * nothing is what the role MEANS, and "0 decisions" would read as a measured
 * shortfall. An actor with nothing at all on the record carries `inactiveNote`
 * in place of the list, and an actor no review is waiting on says so in words.
 *
 * ROLES ARE DESCRIPTIVE, AND THE SCREEN SAYS SO OUT LOUD. Reviewer / Pipeline
 * owner / Approver are how this workspace divides the work. Nothing in this
 * build gates an action by role, so the screen states the convention and
 * explicitly refuses to imply a permissions model that does not exist —
 * `roleNote` describes what each capacity does, never what it is allowed to do.
 *
 * NO PROVIDER IS NAMED, BECAUSE NO PROVIDER PRODUCED ANY OF THIS. SerpApi backs
 * live verification and Nutrient DWS backs extraction and signing; a roster,
 * its signatures and its assignments are fixture records of this workspace's
 * own. Attributing them to either provider would be the one lie this screen
 * could tell.
 *
 * The initials square is the audit ledger's mark, unchanged: a tinted square
 * with the house's standard 1px `line` edge, which is what makes it read as a
 * square when the `-soft` tint sits close to the surface's own lightness in
 * both themes. It is a typographic byline, never a photo and never an icon.
 *
 * Server component. Token-pure: 1px --color-line borders, no icons, no dots
 * (nothing here has a state), weight ceiling 500, and no shadow —
 * `shadow-action` belongs to a screen's single primary action, and a roster has
 * none.
 *
 * Layout: the totals strip is a shrink-0 header row and the roster is the
 * flex-1 `.scroll-col` beneath it, so the page itself never scrolls.
 */

import Link from "next/link";
import { formatUtc } from "@/lib/format";
import {
  DEMO_REVIEW_ID,
  getReview,
  getWorkspaceReviews,
  getWorkspaceTeam,
} from "@/lib/data";
import type {
  ActorActivity,
  ActorRole,
  WorkspaceReviewRow,
  WorkspaceTeam,
} from "@/lib/data";

/**
 * The screen's copy. Words are a design-system concern (DESIGN_SYSTEM.md wins
 * on copy); every VALUE beside them comes off the data layer. Nothing here is
 * a fact about a person.
 */
const COPY = {
  rosterLabel: "People this workspace records",
  eyebrow: "People this workspace records",
  lede: "The people this workspace works through, and what its record says each of them has done. The counts are the record's, not an appraisal: someone on the roster who has signed nothing shows an empty record rather than a row of zeros.",
  /**
   * Sits where every other screen names its provider. None is named here on
   * purpose: no provider produced a roster, a signature or an assignment.
   */
  strip: "Counted off this workspace's own record — no provider",
  /**
   * THE ROLE RULE. Roles are labels for a convention, and this build enforces
   * none of them; saying otherwise would invent a permissions model.
   */
  rolesNote:
    "Reviewer, Pipeline owner and Approver describe how this workspace divides the work. They are not permissions: nothing in this build gates an action by role, so an approver can do exactly what a reviewer can. What follows is a convention the record shows being kept, not a rule the software enforces.",
  activityHeading: "On the record",
  waitingHeading: "Waiting on them",
  /** Said in place of a zero when the portfolio holds nothing for someone. */
  nothingWaiting:
    "No review in the portfolio is waiting on a decision from them.",
  /** Reconciles the signatures and runs above with the screen that lists them. */
  ledgerNote: "Every signature and run counted here is a row on the audit trail for",
  /** The system says what it does not know, rather than showing a blank list. */
  empty:
    "There is nobody to list: this workspace's record names no actor, so there is no signature, no run and no assignment to attribute.",
} as const;

/**
 * Role → the tint behind the initials, exactly as the audit ledger tints the
 * same square. Class names only — every value behind them is a theme token, so
 * both themes are already correct and no literal enters the component tree.
 *
 * `accent` means agreed, which is what an approver's endorsement is; the two
 * capacities that do not endorse anything carry no hue at all. The 1px `line`
 * edge is the same on every role, so the border states nothing.
 */
const ROLE_TINT: Record<ActorRole, string> = {
  Reviewer: "bg-canvas text-ink-2",
  "Pipeline owner": "bg-canvas text-ink-2",
  Approver: "bg-accent-soft text-accent",
};

/** The shell every card and row shares — the 1px border is stated once. */
const SHELL = "rounded border border-line";

export interface TeamScreenProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen took it.
   * Rendered as the document's `sr-only` h1: ContextBar already prints these
   * words at the head of the main column, and printing them twice is the
   * duplication the stub pass removed everywhere else.
   */
  title: string;
  /**
   * The roster on screen. Defaults to the data layer's — there is one
   * workspace and no endpoint behind it, so the accessor is the only source.
   */
  team?: WorkspaceTeam;
}

export default function TeamScreen({
  title,
  team = getWorkspaceTeam(),
}: TeamScreenProps) {
  // The portfolio, read once and handed to each card. The rows themselves are
  // what the reviews index renders, so a review named here is the same review
  // with the same counts there.
  const reviews = getWorkspaceReviews();
  // The ledger these signatures and runs sit on. Only the demo run is listed,
  // so the activity above is exactly that run chain's rows — the link is a
  // reconciliation, not a suggestion.
  const ledgerReview = getReview(DEMO_REVIEW_ID);

  return (
    <>
      {/* "3 people · 3 with recorded activity" — assembled in lib/data and
          rendered as one string, so the total and the cards beneath it cannot
          drift apart. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
        <p className="tabular text-caption text-ink-3">{team.text}</p>
        <p className="shrink-0 text-caption text-ink-3">{COPY.strip}</p>
      </div>

      <section
        aria-label={COPY.rosterLabel}
        className="scroll-col flex-1 px-5 py-5"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <header>
            <h1 className="sr-only">{title}</h1>
            <p className="text-micro uppercase text-ink-3">{COPY.eyebrow}</p>
            <p className="mt-2 max-w-2xl text-body text-ink-2">{COPY.lede}</p>
            <p className="mt-1.5 max-w-2xl text-body text-ink-2">
              {COPY.rolesNote}
            </p>
            {/* Where the numbers come from, and what they therefore miss. The
                data layer's sentence, not an inference drawn here. */}
            <p className="mt-2 max-w-2xl text-caption text-ink-3">
              {team.scopeNote}
            </p>
          </header>

          <ul className="flex flex-col gap-2">
            {team.members.length === 0 ? (
              <li className={`${SHELL} bg-surface px-4 py-3.5 text-body text-ink-3`}>
                {COPY.empty}
              </li>
            ) : (
              team.members.map((member) => (
                <MemberCard
                  key={member.actor.id}
                  member={member}
                  reviews={reviews}
                />
              ))
            )}
          </ul>

          {team.members.length > 0 && ledgerReview ? (
            <p className="max-w-2xl text-caption text-ink-3">
              {COPY.ledgerNote}{" "}
              <Link
                href={`/reviews/${ledgerReview.id}/audit`}
                className="font-medium text-ink underline underline-offset-4 hover:text-ink-2"
              >
                {ledgerReview.title}
              </Link>
              .
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/**
 * One person. The name, the capacity, what that capacity does, the facts the
 * record holds for them, and the reviews still owed a decision by them.
 */
function MemberCard({
  member,
  reviews,
}: {
  member: ActorActivity;
  reviews: readonly WorkspaceReviewRow[];
}) {
  // The same predicate getWorkspaceTeam() counts with: a review still
  // ANALYZING is excluded even when it names the reviewer it will land with,
  // because nobody is holding that one up yet.
  const waiting = reviews.filter(
    (row) =>
      row.waiting.state === "reviewer" &&
      row.waiting.actor?.id === member.actor.id,
  );
  const lastActive = member.lastActiveAt
    ? formatUtc(member.lastActiveAt)
    : undefined;

  return (
    <li>
      <article className={`${SHELL} bg-surface px-4 py-3.5`}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            {/* The ledger's mark, unchanged: a tinted square with the house's
                standard 1px edge. Initials are a dense byline, never
                identity — Actor.initials in lib/data/types.ts says so. */}
            <span
              aria-hidden="true"
              className={`grid size-7 shrink-0 place-items-center rounded border border-line text-micro font-medium ${ROLE_TINT[member.actor.role]}`}
            >
              {member.actor.initials}
            </span>
            <span className="min-w-0">
              <span className="block text-title font-medium text-ink">
                {member.actor.name}
              </span>
              {/* The capacity, then what that capacity DOES — never what it is
                  permitted to do. See COPY.rolesNote. */}
              <span className="mt-0.5 block text-caption text-ink-3">
                {member.actor.role}
              </span>
            </span>
          </span>

          <p className="shrink-0 text-right">
            <span className="block text-micro uppercase text-ink-3">
              {member.lastActiveLabel}
            </span>
            {lastActive ? (
              <span className="tabular mt-0.5 block text-caption text-ink-2">
                {lastActive}
              </span>
            ) : null}
          </p>
        </div>

        <p className="mt-2 max-w-2xl text-body text-ink-2">{member.roleNote}</p>

        <div className="mt-3 border-t border-line-soft pt-3">
          <p className="text-micro uppercase text-ink-3">
            {COPY.activityHeading}
          </p>

          {member.inactiveNote ? (
            /* No facts at all. The honest reading is that the RECORD is empty,
               not that the person is idle — and that is what it says. */
            <p className="mt-1.5 max-w-2xl text-body text-ink-2">
              {member.inactiveNote}
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {member.facts.map((fact) => (
                <li key={fact.id} className="flex items-baseline gap-2">
                  <span className="tabular w-8 shrink-0 text-value font-medium text-ink">
                    {fact.value}
                  </span>
                  <span className="text-body text-ink-2">{fact.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 border-t border-line-soft pt-3">
          <p className="text-micro uppercase text-ink-3">
            {COPY.waitingHeading}
          </p>

          {waiting.length === 0 ? (
            /* Said in words rather than as a 0, which would read as a measured
               shortfall. For a pipeline owner it is the role working as
               described: they sign nothing, so nothing waits on them. */
            <p className="mt-1.5 text-body text-ink-2">{COPY.nothingWaiting}</p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {waiting.map((row) => (
                <WaitingRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </article>
    </li>
  );
}

/**
 * One review still owed a decision by this person — the same row the reviews
 * index renders, with its own counts.
 *
 * A row opens only where a review actually exists behind it. A row listed with
 * counts only carries `unavailableNote` instead of a link, in the data layer's
 * words: sending someone to `/reviews/{unknown-id}` would open a different
 * project's findings, which is the worst lie this screen could tell.
 */
function WaitingRow({ row }: { row: WorkspaceReviewRow }) {
  return (
    <li>
      {row.href ? (
        <Link
          href={row.href}
          className="block text-label font-medium text-ink underline underline-offset-4 hover:text-ink-2 focus-visible:shadow-selected focus-visible:outline-none"
        >
          {row.title}
        </Link>
      ) : (
        <p className="text-label font-medium text-ink-2">{row.title}</p>
      )}
      <p className="tabular mt-0.5 text-caption text-ink-3">
        {row.counts.text}
      </p>
      {row.unavailableNote ? (
        <p className="mt-0.5 text-caption text-ink-3">{row.unavailableNote}</p>
      ) : null}
    </li>
  );
}
