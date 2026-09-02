import type { Metadata } from "next";
import { Poppins, Source_Serif_4 } from "next/font/google";
import AppNav from "@/components/AppNav";
import ContextBar from "@/components/ContextBar";
import "./globals.css";

/* Poppins for all UI chrome — 600 is the weight ceiling. */
const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

/* Source Serif 4 ONLY for document/excerpt rendering (variable font). */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

/**
 * Applies an explicit theme choice BEFORE THE FIRST PAINT.
 *
 * theme.css resolves the theme from `data-theme` on <html>: absent → follow the
 * OS, "light"/"dark" → that theme regardless of the OS. The server cannot know
 * which of the three a reader picked, so it stamps nothing and the document
 * ships in the OS's theme — honest, and the only markup a Server Component can
 * truthfully produce. This script then runs SYNCHRONOUSLY while the browser is
 * still parsing <head>, so an explicit choice is on the root element before any
 * pixel is drawn. An effect could not do this: effects run after hydration, and
 * on a slow connection the browser has painted the wrong theme long before
 * React arrives (next docs, guides/preventing-flash-before-hydration.md).
 *
 * Only the two legal stamps are honoured — a junk value in storage falls back
 * to following the OS rather than becoming an attribute nothing matches.
 *
 * The key and the attribute are OWNED BY components/ThemeToggle.tsx and
 * restated here because this is a string in the document head: a Server
 * Component cannot read an export out of a client module, and a client module
 * cannot put a script into <head>. They are the only two duplicated literals in
 * this feature, and a mismatch is loud — the choice would simply stop applying.
 */
const THEME_BOOTSTRAP = `(function(){try{var c=localStorage.getItem("sparkline.theme");if(c==="light"||c==="dark")document.documentElement.setAttribute("data-theme",c)}catch(e){}})()`;

export const metadata: Metadata = {
  title: "Sparkline",
  description:
    "Extracts claims from documents, catches contradictions, verifies them against live public data, and routes flags to a human with a signed audit trail.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${sourceSerif.variable} h-full`}
      /* The bootstrap script below adds `data-theme` to this element before
         React hydrates, so the DOM legitimately carries an attribute the
         server never rendered. suppressHydrationWarning tells React the DOM
         wins here — it is not a mismatch to repair. */
      suppressHydrationWarning
    >
      <head>
        {/* Runs during HTML parsing, before the first paint. See above. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      {/* theme.css base layer pins html/body: height 100%, overflow hidden.
          The app fills the viewport; columns scroll independently. */}
      <body className="flex h-full">
        <AppNav />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* One header row on every route: the review's title inside a review
              screen that has none of its own, the screen's own name everywhere
              else. ContextBar decides — see components/ContextBar.tsx. */}
          <ContextBar />
          {children}
        </main>
      </body>
    </html>
  );
}
