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
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DEMO_REVIEW_ID,
  getAuditRecords,
  getCoverage,
  getDocuments,
} from "@/lib/data";

interface NavItem {
  label: string;
  href: string;
  /**
   * Omitted when this row has no meaningful number behind it. Undefined is
   * "no pill", never a rendered 0 — a zero pill would claim we counted
   * something and found none, which is not the same as not knowing.
   */
  count?: number;
  /** What the count counts, for the row's accessible name. */
  countLabel?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Built per render from lib/data — the review id is DEMO_REVIEW_ID, never a
 * literal, and every count is derived, never typed in.
 */
function buildSections(): NavSection[] {
  // Findings still awaiting a decision: the work the Reviews screen holds.
  const openFindings = getCoverage(DEMO_REVIEW_ID).open;
  const documentCount = getDocuments(DEMO_REVIEW_ID).length;
  // Signed decisions are exactly the rows the audit ledger renders.
  const signedDecisions = getAuditRecords(DEMO_REVIEW_ID).length;

  return [
    {
      label: "Workspace",
      items: [
        { label: "Dashboard", href: "/dashboard" },
        {
          label: "Reviews",
          href: "/reviews",
          count: openFindings,
          countLabel: "open findings",
        },
        {
          label: "Documents",
          href: "/documents",
          count: documentCount,
          countLabel: "documents",
        },
        // No count: nothing in the data layer enumerates live sources
        // workspace-wide, and an invented number is worse than none.
        { label: "Sources", href: "/sources" },
      ],
    },
    {
      label: "Record",
      items: [
        {
          label: "Audit log",
          href: `/reviews/${DEMO_REVIEW_ID}/audit`,
          count: signedDecisions,
          countLabel: "signed decisions",
        },
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
}

/**
 * Most-specific-wins matching: a row claims the active mark on an exact hit,
 * or on a sub-route no deeper row also claims. Without the second half,
 * /reviews/{id}/audit would light both "Reviews" and "Audit log".
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

export default function AppNav() {
  const pathname = usePathname();
  const sections = buildSections();
  const hrefs = sections.flatMap((section) =>
    section.items.map((item) => item.href),
  );

  return (
    <nav
      aria-label="Sparkline"
      className="flex min-h-0 w-rail shrink-0 flex-col border-r border-line bg-subtle"
    >
      <div className="shrink-0 px-5 pt-5 pb-6">
        <Link href="/" className="text-title font-semibold text-ink">
          Sparkline
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
                    active={isActive(pathname, item.href, hrefs)}
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
