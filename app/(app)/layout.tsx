/**
 * The app shell: nav rail on the left, one header row, then the screen.
 *
 * Every product screen lives under this route group; the landing page at `/`
 * sits outside it and gets no rail. theme.css pins html/body to the viewport,
 * so the shell fills it and columns scroll independently.
 *
 * ChromeProvider wraps BOTH the rail and the screen. The control that collapses
 * the rail is inside the rail, but the rail is rendered here and the screens
 * are `children`, so the two have no common ancestor that could hold the state
 * — this layout is a Server Component and holds none. The provider is that
 * ancestor and nothing more: it carries the nav's collapsed flag and no other
 * layout state (components/ChromeProvider.tsx says why).
 */

import AppNav from "@/components/AppNav";
import ChromeProvider from "@/components/ChromeProvider";
import ContextBar from "@/components/ContextBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ChromeProvider>
      <AppNav />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* One header row on every route: the review's title inside a review
            screen that has none of its own, the screen's own name everywhere
            else. ContextBar decides — see components/ContextBar.tsx. */}
        <ContextBar />
        {children}
      </main>
    </ChromeProvider>
  );
}
