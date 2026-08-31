"use client";

/**
 * Fixed left navigation rail — exactly var(--spacing-rail) wide (w-rail),
 * on --color-subtle with a 1px --color-line right border. No icons; the
 * active row is marked by a --color-surface background only.
 *
 * Client component: active-route detection requires usePathname — layouts
 * never re-render on navigation, so a server component here cannot know
 * the current route (see next docs, layout.md).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "New review", href: "/reviews/new" },
  { label: "Reviews", href: "/reviews/demo-2026-08" },
  { label: "Audit trail", href: "/reviews/demo-2026-08/audit" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Prefix-match sub-routes, but let the most specific item win:
  // a deeper nav item that also prefix-matches claims the row instead.
  if (!pathname.startsWith(`${href}/`)) return false;
  return !NAV_ITEMS.some(
    (item) =>
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-rail shrink-0 flex-col border-r border-line bg-subtle">
      <div className="px-5 pt-5 pb-6">
        <Link href="/" className="text-title font-semibold text-ink">
          Sparkline
        </Link>
      </div>
      <ul className="flex flex-col gap-px px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <NavRow item={item} active={active} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavRow({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`block rounded px-3 py-1.5 text-label ${
        active
          ? "bg-surface font-medium text-ink"
          : "text-ink-2 hover:text-ink"
      }`}
    >
      {item.label}
    </Link>
  );
}
