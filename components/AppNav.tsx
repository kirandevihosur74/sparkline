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
 * carries .scroll-col, so a short viewport scrolls the rows, not the app.
 *
 * The SECTIONS table below is also the one place a route's NAME is written:
 * ContextBar titles every workspace screen from it (via `navRouteName`), so
 * the header of a screen and the nav row that reached it cannot disagree.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DEMO_REVIEW_ID,
  getAuditRecords,
  getCoverage,
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
      { label: "Reviews", href: REVIEWS_HREF, countLabel: "open findings" },
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

/**
 * The number behind a row, read per render from the same accessors the screens
 * read — so a pill cannot disagree with the screen it points at. A row the
 * data layer has no number for returns undefined and renders no pill.
 */
function countFor(href: string): number | undefined {
  switch (href) {
    // Findings still awaiting a decision: the work the Reviews screen holds.
    case REVIEWS_HREF:
      return getCoverage(DEMO_REVIEW_ID).open;
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

export default function AppNav() {
  const pathname = usePathname();
  const sections = buildSections();

  return (
    <nav
      aria-label={APP_NAME}
      className="flex min-h-0 w-rail shrink-0 flex-col border-r border-line bg-subtle"
    >
      <div className="shrink-0 px-5 pt-5 pb-6">
        <Link href="/" className="text-title font-semibold text-ink">
          {APP_NAME}
        </Link>
      </div>

      <div className="scroll-col flex-1 px-2 pb-4">
        {sections.map((section) => (
          <section key={section.label} className="mb-4 last:mb-0">
            <h2 className="px-3 pb-1.5 text-micro uppercase text-ink-3">
              {section.label}
            </h2>
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavRow
                    item={item}
                    active={isActive(pathname, item.href, HREFS)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const showCount = item.count !== undefined;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={
        showCount ? `${item.label}, ${item.count} ${item.countLabel}` : undefined
      }
      /* border-l is always present so the label never shifts; only its colour
         changes. 1px, per the border rule. */
      className={`flex items-center justify-between gap-2 rounded border-l px-3 py-1.5 text-label ${
        active
          ? "border-l-accent bg-surface font-medium text-ink"
          : "border-l-transparent text-ink-2 hover:text-ink"
      }`}
    >
      <span className="min-w-0 truncate">{item.label}</span>
      {showCount && (
        <span
          aria-hidden
          className="tabular shrink-0 rounded-full border border-line bg-surface px-1.5 text-micro text-ink-3"
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}
