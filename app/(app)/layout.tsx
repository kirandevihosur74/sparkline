/**
 * The app shell: nav rail on the left, one header row, then the screen.
 *
 * Every product screen lives under this route group; the landing page at `/`
 * sits outside it and gets no rail. theme.css pins html/body to the viewport,
 * so the shell fills it and columns scroll independently.
 */

import AppNav from "@/components/AppNav";
import ContextBar from "@/components/ContextBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppNav />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* One header row on every route: the review's title inside a review
            screen that has none of its own, the screen's own name everywhere
            else. ContextBar decides — see components/ContextBar.tsx. */}
        <ContextBar />
        {children}
      </main>
    </>
  );
}
