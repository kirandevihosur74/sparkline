/**
 * / — the landing page. The only route outside the app shell
 * (app/(app)/layout.tsx): no rail, no context bar, one action.
 */

import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Sparkline — document trust pipeline",
};

export default function LandingPage() {
  return <Landing />;
}
