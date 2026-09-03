"use client";

/**
 * AppNav — the fixed left rail (DESIGN_SYSTEM.md, component 1).
 *
 * Exactly var(--spacing-rail) wide (w-rail), on --color-subtle with a 1px
 * --color-line right border. No icons; hierarchy is typographic.
 *
 * Three labelled sections — Workspace / Record / Settings — and every row
 * links to a route that exists. The active row is marked by a
 * --color-surface background, a 1px --color-accent LEFT RULE and weight 500.
 * That left rule is one of the two the border rule explicitly allows: it
 * encodes SELECTION (which screen you are on), not state.
 *
 * Counts come off the data layer and nowhere else — open findings, documents
 * and signed decisions are derived from the same accessors the screens read,
 * so a pill cannot disagree with the screen it points at. A row whose count
 * has no meaning carries NO pill; nothing here renders a placeholder zero.
 *
 * Client component: active-route detection requires usePathname — layouts
 * never re-render on navigation, so a server component here cannot know the
 * current route (see next docs, layout.md). lib/data is a plain fixture
 * module with no server-only imports, so it resolves in the client bundle.
 *
 * The page never scrolls: the rail is a min-h-0 flex column whose nav list
 * carries .scroll-col, so a short viewport scrolls the rows, not the app. The
 * theme control is pinned below that list — a preference belongs under the
 * last section, not inside one — and is shrink-0, so it cannot be scrolled
 * away and cannot push the rail past the viewport.
 *
 * COLLAPSED, the rail is var(--spacing-rail-min) (w-rail-min, 52px) and gives
 * its 136px to the document. Nothing is replaced by an icon — there are none in
 * this system: a row keeps two uppercase letters DERIVED from its own label
 * (see MARKS below), its count moves under them, a section heading becomes the
 * 1px rule it was already implying with its words in an sr-only span, and the
 * wordmark shortens to its first letter. Every row still carries its full name
 * as `aria-label` and as a tooltip, so nothing is announced as an abbreviation.
 * The state lives in ChromeProvider because the control is in here and the rail
 * is rendered by a Server Component layout.
 *
 * The SECTIONS table below is also the one place a route's NAME is written:
 * ContextBar titles every workspace screen from it (via `navRouteName`), so
 * the header of a screen and the nav row that reached it cannot disagree.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useChrome } from "./ChromeProvider";
import {
  DEMO_REVIEW_ID,
  getAuditRecords,
  getWorkspaceReviews,
  getDocuments,
} from "@/lib/data";

/**
 * The app's wordmark. ContextBar falls back to it for a route the nav does not
 * name, so the header is never blank and never invents a screen title.
 */
export const APP_NAME = "Sparkline";

/**
 * A row's NAME and DESTINATION. This table is the one place either is written:
 * ContextBar titles every workspace screen from it, so a screen's header and
 * its nav row cannot disagree about what the screen is called.
 */
interface NavRoute {
  label: string;
  href: string;
  /**
   * What this row's count counts. Present only on rows that HAVE a count —
   * the number itself is derived per render in `countFor`, never typed here.
   */
  countLabel?: string;
}

interface NavItem extends NavRoute {
  /**
   * Omitted when this row has no meaningful number behind it. Undefined is
   * "no pill", never a rendered 0 — a zero pill would claim we counted
   * something and found none, which is not the same as not knowing.
   */
  count?: number;
}

interface NavSection<Item extends NavRoute> {
  label: string;
  items: Item[];
}

/* Hrefs the counts key off, so the table and `countFor` cannot drift apart. */
const NEW_REVIEW_HREF = "/reviews/new";
const REVIEWS_HREF = "/reviews";
const DOCUMENTS_HREF = "/documents";
const AUDIT_HREF = `/reviews/${DEMO_REVIEW_ID}/audit`;

/**
 * Every row, in nav order.
 *
 * "New review" sits ABOVE "Reviews": it is where the demo starts, so it has to
 * be reachable by clicking rather than by typing a URL. It carries no
 * countLabel because there is no number behind starting something.
 */
const SECTIONS: NavSection<NavRoute>[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New review", href: NEW_REVIEW_HREF },
      { label: "Reviews", href: REVIEWS_HREF, countLabel: "reviews" },
      { label: "Documents", href: DOCUMENTS_HREF, countLabel: "documents" },
      // No count: nothing in the data layer enumerates live sources
      // workspace-wide, and an invented number is worse than none.
      { label: "Sources", href: "/sources" },
    ],
  },
  {
    label: "Record",
    items: [
      { label: "Audit log", href: AUDIT_HREF, countLabel: "signed decisions" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Verification rules", href: "/rules" },
      { label: "Team", href: "/team" },
    ],
  },
];

/** Every href in the table, flattened — the input the matcher compares against. */
const HREFS = SECTIONS.flatMap((section) =>
  section.items.map((item) => item.href),
);

// ---------------------------------------------------------------------------
// The collapsed rail's marks
// ---------------------------------------------------------------------------

/**
 * At var(--spacing-rail-min) a row has no room for its label, and this system
 * has NO ICONS (DESIGN_SYSTEM.md, Foundations): the only non-text marks are the
 * 5px status dot and the form primitives. So the collapsed row keeps text — two
 * uppercase letters TAKEN FROM THE LABEL ITSELF, which is text standing in for
 * text rather than a second vocabulary the reader has to learn.
 *
 * DERIVED, NEVER TYPED. A hand-written table of nine two-letter codes is a
 * second source of truth for a row's name: rename "Reports" and the code beside
 * it silently keeps describing the old one. These are computed from `SECTIONS`,
 * so a mark cannot outlive the label it abbreviates.
 *
 * The rule is FIRST LETTER + FIRST FOLLOWING CONSONANT — "Documents" → DC,
 * "Verification rules" → VR — because initials alone collide immediately here:
 * "Reviews" and "Reports" are both RE. With this rule the nine rows come out
 * unique on the first candidate (DS · NW · RV · DC · SR · AD · RP · VR · TM),
 * and `markFor` still resolves collisions rather than assuming that holds: it
 * walks the remaining consonants, then the remaining letters, and takes the
 * first pairing no earlier row has claimed. Row order decides who keeps the
 * obvious mark, and row order is nav order — the reader's own reading order.
 *
 * A mark is never the accessible name. Every collapsed row carries `aria-label`
 * with the FULL label (and its count), so nothing about this abbreviation
 * reaches assistive tech; it is a visual shorthand and nothing more.
 */
const VOWELS = "AEIOU";

/** Pairings for one label, best first: consonants, then any remaining letter. */
function markCandidates(label: string): string[] {
  const letters = label.toUpperCase().replace(/[^A-Z]/g, "");
  const first = letters.slice(0, 1);
  const rest = [...letters.slice(1)];
  const consonants = rest.filter((letter) => !VOWELS.includes(letter));
  return [...consonants, ...rest].map((letter) => first + letter);
}

/**
 * Every row's mark, keyed by href and resolved in nav order so the result is
 * stable. The last resort is the bare first letter: it can only be reached by a
 * label with no usable second letter at all, and a one-letter mark is still
 * honest — the row's accessible name and its tooltip carry the whole label.
 */
const MARKS: Map<string, string> = (() => {
  const marks = new Map<string, string>();
  const taken = new Set<string>();
  for (const section of SECTIONS) {
    for (const item of section.items) {
      const candidates = markCandidates(item.label);
      const mark =
        candidates.find((candidate) => !taken.has(candidate)) ??
        item.label.slice(0, 1).toUpperCase();
      taken.add(mark);
      marks.set(item.href, mark);
    }
  }
  return marks;
})();

/**
 * The number behind a row, read per render from the same accessors the screens
 * read — so a pill cannot disagree with the screen it points at. A row the
 * data layer has no number for returns undefined and renders no pill.
 */
function countFor(href: string): number | undefined {
  switch (href) {
    // Reviews in the workspace — the rows the Reviews screen actually renders.
    // This was the demo run's open-finding count while the workspace WAS one
    // project; a list of six reviews made that number false in two ways at
    // once (it is not a review count, and it is not the workspace's open
    // findings either — those total 17 across three reviews). Counting the
    // same accessor the index renders is the only reading that cannot drift.
    case REVIEWS_HREF:
      return getWorkspaceReviews().length;
    case DOCUMENTS_HREF:
      return getDocuments(DEMO_REVIEW_ID).length;
    // Signed decisions are exactly the rows the audit ledger renders.
    case AUDIT_HREF:
      return getAuditRecords(DEMO_REVIEW_ID).length;
    default:
      return undefined;
  }
}

/** The route table with its counts resolved, built per render. */
function buildSections(): NavSection<NavItem>[] {
  return SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      ...item,
      count: item.countLabel === undefined ? undefined : countFor(item.href),
    })),
  }));
}

/**
 * Most-specific-wins matching: a row claims the active mark on an exact hit,
 * or on a sub-route no deeper row also claims. Without the second half,
 * /reviews/{id}/audit would light both "Reviews" and "Audit log", and
 * /reviews/new would light both "Reviews" and "New review".
 */
function isActive(pathname: string, href: string, hrefs: string[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !hrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

/**
 * What the nav calls the screen at this path, or undefined when no row owns it.
 *
 * Exactly the row that lights up, resolved by the same matcher — so the title
 * ContextBar puts at the head of a workspace screen is the name of the row the
 * reader just clicked.
 */
export function navRouteName(pathname: string): string | undefined {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (isActive(pathname, item.href, HREFS)) return item.label;
    }
  }
  return undefined;
}

/** The nav's own copy for the control that opens and closes it. */
const COLLAPSE_COPY = {
  collapse: "Collapse navigation",
  expand: "Expand navigation",
  /** Left when there is room to give back, right when there is room to take. */
  glyph: (collapsed: boolean) => (collapsed ? "›" : "‹"),
} as const;

/** The element the collapse control expands and collapses, for aria-controls. */
const NAV_ID = "app-nav";

export default function AppNav() {
  const pathname = usePathname();
  const sections = buildSections();
  const { navCollapsed, toggleNav } = useChrome();

  return (
    <nav
      id={NAV_ID}
      aria-label={APP_NAME}
      /* Width is the ONLY thing that animates, over .22s on the standard
         curve. `motion-reduce:transition-none` is the whole of the reduced
         motion answer here: with no transition the rail simply arrives at its
         new width, which is the same layout one frame earlier. */
      className={`flex min-h-0 shrink-0 flex-col border-r border-line bg-subtle transition-[width] duration-220 ease-in-out motion-reduce:transition-none ${
        navCollapsed ? "w-rail-min" : "w-rail"
      }`}
    >
      {/* The wordmark and the control that closes the rail share the header
          row while there is room for both, and stack when there is not. The
          control is in the same place in both states — a collapsed rail whose
          way back is hidden is a trap. */}
      <div
        className={`flex shrink-0 items-center gap-2 pt-5 pb-6 ${
          navCollapsed ? "flex-col justify-center px-2" : "justify-between px-5"
        }`}
      >
        <Link
          href="/"
          aria-label={APP_NAME}
          className="text-title font-semibold text-ink"
        >
          {/* Collapsed, the wordmark is its own first letter — still the
              wordmark, still ink, just as much of it as fits. It does not take
              a semantic colour: `accent` means verified, and a brand mark
              reporting a verdict would be a fourth meaning for the token. */}
          {navCollapsed ? APP_NAME.slice(0, 1) : APP_NAME}
        </Link>

        <CollapseControl collapsed={navCollapsed} onToggle={toggleNav} />
      </div>

      <div className={`scroll-col flex-1 pb-4 ${navCollapsed ? "px-1.5" : "px-2"}`}>
        {sections.map((section) => (
          <section key={section.label} className="mb-4 last:mb-0">
            {/* Collapsed, the heading becomes the 1px --color-line rule that
                the grouping still needs, with its words moved into a
                visually-hidden span rather than made transparent: `sr-only`
                is the pattern that is guaranteed to stay in the accessibility
                tree, so the sections are still announced by name. */}
            {navCollapsed ? (
              <h2 className="mx-1 mb-1.5 h-px bg-line">
                <span className="sr-only">{section.label}</span>
              </h2>
            ) : (
              <h2 className="px-3 pb-1.5 text-micro uppercase text-ink-3">
                {section.label}
              </h2>
            )}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavRow
                    item={item}
                    active={isActive(pathname, item.href, HREFS)}
                    collapsed={navCollapsed}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* A preference, not a destination — so it sits below the last section
          rather than inside one. shrink-0 keeps it pinned at the foot of the
          rail: the row list above scrolls, the rail does not grow, and the
          page still never scrolls.

          It is DROPPED at var(--spacing-rail-min): it is a three-position
          radiogroup of words (Light / Dark / System) and words are the whole
          design of it — there is no icon to shrink to, because this system has
          no icons. Squeezing three labels into 36px of usable width would
          either truncate all three or wrap them into a stack taller than the
          rows above. It is not lost: the control above restores the rail from
          either state, and it is the same control in the same place. */}
      {navCollapsed ? null : <ThemeToggle />}
    </nav>
  );
}

/**
 * The one control that opens and closes the rail.
 *
 * A single chevron, which is the same class of mark as the "Next finding →"
 * arrow the decision bar already sets in copy: a typographic glyph, not an icon
 * from a set. It carries no meaning on its own — `aria-label` names the action
 * in words, `aria-expanded` reports the rail's state, and `title` gives the
 * mouse reader the same sentence.
 */
function CollapseControl({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const label = collapsed ? COLLAPSE_COPY.expand : COLLAPSE_COPY.collapse;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls={NAV_ID}
      title={label}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-surface text-caption leading-none text-ink-3 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
    >
      <span aria-hidden>{COLLAPSE_COPY.glyph(collapsed)}</span>
    </button>
  );
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const showCount = item.count !== undefined;

  /* The row's full name, ALWAYS — not only when it has a count, which was the
     previous rule and would leave a collapsed row announcing two letters. */
  const name = showCount
    ? `${item.label}, ${item.count} ${item.countLabel}`
    : item.label;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={name}
      /* A tooltip only where the label is not on screen. Collapsed, it is the
         sighted mouse reader's way to read a mark they do not recognise. */
      title={collapsed ? name : undefined}
      /* border-l is always present so the label never shifts; only its colour
         changes. 1px, per the border rule — and the ONE coloured left rule
         AppNav is allowed, because it encodes selection, not state. */
      className={`flex rounded border-l text-label ${
        collapsed
          ? /* Every row is the same height whether or not it carries a count,
               so the column reads as one ladder rather than as rows of two
               sizes. */
            "min-h-10 flex-col items-center justify-center gap-0.5 px-1 py-1.5"
          : "items-center justify-between gap-2 px-3 py-1.5"
      } ${
        active
          ? "border-l-accent bg-surface font-medium text-ink"
          : "border-l-transparent text-ink-2 hover:text-ink"
      }`}
    >
      {collapsed ? (
        <>
          <span aria-hidden className="text-caption font-medium">
            {MARKS.get(item.href)}
          </span>
          {/* The count SURVIVES the collapse rather than being dropped: it is
              one or two digits, it fits under the mark without crowding it,
              and it is the only thing on this rail that changes between
              visits. A hidden count is information lost. */}
          {showCount && (
            <span aria-hidden className="tabular text-micro leading-none text-ink-3">
              {item.count}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="min-w-0 truncate">{item.label}</span>
          {showCount && (
            <span
              aria-hidden
              className="tabular shrink-0 rounded-full border border-line bg-surface px-1.5 text-micro text-ink-3"
            >
              {item.count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
