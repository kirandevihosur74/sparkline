/**
 * StubScreen — the shared surface for screens that are designed but not built.
 *
 * A judge clicking through the nav should never hit a 404, and should never
 * hit a screen that fakes data either. Per the copy conventions, the system
 * says what it does not know: the screen names itself, names what it would
 * hold, admits it is outside the demo spine, and points back at the one review
 * that is real.
 *
 * THE SCREEN IS NAMED ONCE. ContextBar already puts the screen's name at the
 * head of the main column, read off the nav row that reached it
 * (navRouteName). Printing the same words again as a display-size h1 six
 * pixels below made every stub read as if the title had been pasted twice, so
 * the visible h1 is rendered ONLY on a path the nav does not name — today just
 * the unlinked /settings, which would otherwise arrive with no name at all.
 * Everywhere else the heading stays in the document outline as `sr-only`: the
 * structure a screen reader walks is unchanged, only the duplicate ink is
 * gone. The test is the same source of truth ContextBar uses, so the two can
 * never disagree about which screen has already been named.
 *
 * Client component for exactly that test — which path you are on is only
 * knowable from usePathname, and layouts do not re-render on navigation. Every
 * value still comes from lib/data, which resolves in the client bundle exactly
 * as AppNav and ContextBar already rely on.
 *
 * Token-pure: 1px --color-line borders, no icons, no shadow (shadow-action
 * belongs to a primary action, and a stub has none).
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navRouteName } from "./AppNav";
import { DEMO_REVIEW_ID, getReview } from "@/lib/data";

export default function StubScreen({
  title,
  detail,
  action,
}: {
  /** The screen's name, as it appears in the design. */
  title: string;
  /** One sentence naming what this screen would hold once it is built. */
  detail: string;
  /**
   * Optional onward link for a stub that stands in front of a screen that IS
   * built — the reviews index is unbuilt, but starting a new review is not,
   * and a stub should not dead-end a route that exists.
   */
  action?: { href: string; label: string };
}) {
  // Fixture-only, like every other read in the app — there are no GET
  // endpoints, so the demo review comes from lib/data or not at all.
  const review = getReview(DEMO_REVIEW_ID);

  const pathname = usePathname();
  // Has the header already said this screen's name? Same matcher, same table.
  const namedInBar = navRouteName(pathname) === title;

  return (
    <section className="scroll-col flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-lg rounded border border-line bg-surface p-6">
        <p className="text-micro uppercase text-ink-3">Designed, not built</p>

        <h1
          className={
            namedInBar ? "sr-only" : "mt-2 text-display font-semibold text-ink"
          }
        >
          {title}
        </h1>

        <p className="mt-3 text-body text-ink-2">{detail}</p>

        <p className="mt-2 text-body text-ink-2">
          It is not part of the demo spine, so there is no data behind it — this
          screen is empty rather than invented.
        </p>

        {action ? (
          <p className="mt-4 text-body">
            <Link
              href={action.href}
              className="text-ink underline underline-offset-4 hover:text-ink-2"
            >
              {action.label}
            </Link>
          </p>
        ) : null}

        <div className="mt-6 border-t border-line pt-4">
          {review ? (
            <Link
              href={`/reviews/${review.id}/review`}
              className="text-label font-medium text-ink underline underline-offset-4 hover:text-ink-2"
            >
              Open the demo review — {review.title} →
            </Link>
          ) : (
            /* Honest failure: name the consequence (nowhere to go) before the
               cause (the demo review is missing from the data layer). */
            <p className="text-label text-ink-3">
              There is nowhere to send you from here: the demo review is not in
              the data layer.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
