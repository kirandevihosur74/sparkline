"use client";

/**
 * ChromeProvider — the one piece of app-shell state that has no other home.
 *
 * The nav rail is rendered by app/(app)/layout.tsx; the control that collapses
 * it lives inside the rail, but the state has to survive navigation and be
 * readable from anywhere under the shell. Layouts do not re-render on
 * navigation and a Server Component cannot hold state, so the nearest common
 * ancestor of the rail and the screen has to be a Client Component that exists
 * only to hold it. That is this file, and it holds NOTHING ELSE.
 *
 * Scope, deliberately narrow: the NAV rail only. The findings queue's rail and
 * the review screen's side panel are review-screen state — they belong to
 * ReviewWorkspace, which is where the selection and the filter already live,
 * and they are passed to their components as props. A context that collected
 * every collapsible column would make the review screen's layout readable (and
 * writable) from the dashboard, which nothing needs.
 *
 * ── WHY THE CHOICE IS NOT PERSISTED ─────────────────────────────────────────
 *
 * It would flash. theme.css resolves the theme from an attribute on <html>, so
 * the theme choice can be applied by a synchronous script in the document head
 * BEFORE the first paint (app/layout.tsx, THEME_BOOTSTRAP) — that is the only
 * reason the theme survives a reload without a flicker. The rail's width is not
 * an attribute on the root element; it is a class on a component the server
 * renders, and the server cannot know a value that lives in localStorage. Any
 * read of storage therefore happens after hydration, which is after the browser
 * has already painted the rail at its default width: the reader would watch
 * 188px snap to 52px on every load.
 *
 * Matching the theme's quality would mean stamping the root element from a
 * second head script and driving the width off that stamp in CSS — a change to
 * app/layout.tsx and to theme.css, neither of which this feature owns. So the
 * rail defaults to EXPANDED on every load and the preference lasts as long as
 * the session does. A forgotten preference is a smaller cost than a layout that
 * jumps on every navigation to a cold page.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface Chrome {
  /** True when the nav rail is showing as var(--spacing-rail-min). */
  navCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
  toggleNav: () => void;
}

/**
 * Undefined OUTSIDE the provider, which is what `useChrome` detects. A default
 * object here would let a component under a missing provider read `false`
 * forever and never say why.
 */
const ChromeContext = createContext<Chrome | undefined>(undefined);

/** The rail starts open: see "why the choice is not persisted" above. */
const NAV_STARTS_COLLAPSED = false;

export default function ChromeProvider({ children }: { children: ReactNode }) {
  const [navCollapsed, setNavCollapsed] = useState(NAV_STARTS_COLLAPSED);

  const toggleNav = useCallback(() => {
    setNavCollapsed((collapsed) => !collapsed);
  }, []);

  const value = useMemo<Chrome>(
    () => ({ navCollapsed, setNavCollapsed, toggleNav }),
    [navCollapsed, toggleNav],
  );

  return (
    <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
  );
}

/**
 * The app shell's chrome state.
 *
 * Throws rather than returning a default: a component that reads this outside
 * the shell is mounted somewhere it was not designed for (the landing page has
 * no rail), and a silent `false` would render a collapse control that cannot
 * collapse anything.
 */
export function useChrome(): Chrome {
  const chrome = useContext(ChromeContext);
  if (chrome === undefined) {
    throw new Error(
      "useChrome must be used inside <ChromeProvider> — it is mounted by app/(app)/layout.tsx, so this component is rendering outside the app shell.",
    );
  }
  return chrome;
}
