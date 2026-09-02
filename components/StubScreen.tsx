/**
 * StubScreen — the shared surface for screens that are designed but not built.
 *
 * A judge clicking through the nav should never hit a 404, and should never
 * hit a screen that fakes data either. Per the copy conventions, the system
 * says what it does not know: the screen names itself, names what it would
 * hold, admits it is outside the demo spine, and points back at the one review
 * that is real.
 *
 * Server component. Token-pure: 1px --color-line borders, no icons, no shadow
 * (shadow-action belongs to a primary action, and a stub has none).
 */

import Link from "next/link";
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

  return (
    <section className="scroll-col flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-lg rounded border border-line bg-surface p-6">
        <p className="text-micro uppercase text-ink-3">Designed, not built</p>

        <h1 className="mt-2 text-display font-semibold text-ink">{title}</h1>

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
