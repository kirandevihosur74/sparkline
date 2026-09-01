/**
 * / — no landing screen of its own.
 *
 * The demo has one spine and it starts inside a review, so the root route
 * redirects rather than duplicating a screen. `redirect` throws (it returns
 * `never`), which ends rendering of this segment — see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md.
 * It defaults to a history `replace` outside Server Actions, which is what we
 * want: Back should not land the judge on a blank redirecting route.
 *
 * The id comes from lib/data, never from a literal in this file.
 */

import { redirect } from "next/navigation";
import { DEMO_REVIEW_ID } from "@/lib/data";

export default function RootPage() {
  redirect(`/reviews/${DEMO_REVIEW_ID}/review`);
}
