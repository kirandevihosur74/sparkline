import type { Metadata } from "next";
import { Poppins, Source_Serif_4 } from "next/font/google";
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
    >
      {/* theme.css base layer pins html/body: height 100%, overflow hidden.
          Whatever renders here fills the viewport; the app shell
          (app/(app)/layout.tsx) adds the rail, the landing page does not. */}
      <body className="flex h-full">{children}</body>
    </html>
  );
}
