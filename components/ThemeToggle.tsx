"use client";

/**
 * ThemeToggle — the three-position theme control at the foot of the AppNav rail.
 *
 * TEXT ONLY. There are no icons in this system, so the control is never a sun,
 * a moon or a half-filled circle (DESIGN_SYSTEM.md, Foundations → Icons): it is
 * the words for the three states, and each word names the state it selects.
 * Per the honesty rule "System" reports only what it is — it never claims to be
 * Light or Dark, because the OS, not this app, decides what it resolves to.
 *
 * ── ONE SOURCE OF TRUTH: THE STAMP ON <html> ────────────────────────────────
 *
 * theme.css resolves the theme from the `data-theme` attribute on the root
 * element: absent → follow the OS, "light" → light, "dark" → dark. That
 * attribute is therefore the whole state of this control, and this component
 * keeps NO second copy of it. It writes the stamp, and it reads the stamp back
 * through `useThemeStamp` — so does ViewerEmbed, which has to theme the
 * Nutrient viewer to match. Nothing can disagree with the attribute because
 * nothing else stores the answer.
 *
 * localStorage is the *persistence* behind the stamp, not a parallel state: it
 * is written on click and read exactly twice — by the bootstrap script in the
 * document head (app/layout.tsx) before first paint, and by the layout effect
 * below that repairs the dev-only remount described there.
 *
 * ── WHY THE MARK CANNOT FLASH ───────────────────────────────────────────────
 *
 * Which segment reads as selected is decided in CSS, off the same `<html>`
 * stamp, not by React state. The head script sets that stamp while the browser
 * is still parsing the document, so the correct segment is already marked on
 * the first paint — before React exists on the page. Compare with driving the
 * mark from state: the server cannot know the choice, so it would render
 * "System" marked and the mark would jump when hydration finally ran.
 *
 * The classes look heavy and are the point: `[:root[data-theme=dark]_&]:` is a
 * Tailwind arbitrary variant compiling to `:root[data-theme=dark] .selector`,
 * which is the exact condition theme.css uses for the same state. The hover
 * variants are negated (`:not([data-theme=dark])`) so the hover rule and the
 * selected rule can never both match one segment — no specificity race.
 *
 * ── WHY THERE IS NO HYDRATION MISMATCH ──────────────────────────────────────
 *
 * `aria-checked` is real ARIA state and cannot be expressed in CSS, so that one
 * fact does live in React — read through `useSyncExternalStore`, whose third
 * argument is the server snapshot. The server does not know the choice, so it
 * answers "no stamp" (System); React uses that same answer for the hydration
 * render, so server HTML and client render are identical, and it then
 * re-renders with the real stamp before paint. That is the whole reason to use
 * this hook rather than `useState` + an effect: it is the API that exists for a
 * value the server cannot know. (lib/format.ts avoids the same bug class for
 * timestamps — see next docs, guides/preventing-flash-before-hydration.md.)
 */

import { useLayoutEffect, useSyncExternalStore } from "react";

/** The attribute theme.css resolves the theme from. Written only here. */
export const THEME_ATTRIBUTE = "data-theme";

/**
 * Where the choice persists. The bootstrap script in app/layout.tsx reads this
 * same key; it has to restate the string because a Server Component cannot
 * read an export out of a client module, and the script is a string in <head>.
 */
export const THEME_STORAGE_KEY = "sparkline.theme";

/** The two values that may appear on <html>. Anything else is not a stamp. */
export type ThemeStamp = "light" | "dark";

/** The three states of the control. "system" is the ABSENCE of a stamp. */
export type ThemeChoice = ThemeStamp | "system";

const SYSTEM = "system" satisfies ThemeChoice;

/**
 * The words, and the state each word selects. This table is the one place
 * either is written — the label and the value it writes to the stamp come from
 * the same row, so a button cannot be labelled "Dark" and select something
 * else. These are not data: they are the three theme states DESIGN_SYSTEM.md
 * names, which is why they are stated here and not in lib/data.
 */
interface ThemeOption {
  choice: ThemeChoice;
  label: string;
  /**
   * Marked as selected exactly when <html> is in this option's state — the
   * same condition theme.css uses, so the mark cannot disagree with the theme.
   */
  selected: string;
  /** Hover cue, suppressed on the selected segment by negating that state. */
  hover: string;
}

const OPTIONS: ThemeOption[] = [
  {
    choice: "light",
    label: "Light",
    selected:
      "[:root[data-theme=light]_&]:bg-surface [:root[data-theme=light]_&]:text-ink",
    hover: "[:root:not([data-theme=light])_&]:hover:text-ink-2",
  },
  {
    choice: "dark",
    label: "Dark",
    selected:
      "[:root[data-theme=dark]_&]:bg-surface [:root[data-theme=dark]_&]:text-ink",
    hover: "[:root:not([data-theme=dark])_&]:hover:text-ink-2",
  },
  {
    choice: SYSTEM,
    label: "System",
    selected:
      "[:root:not([data-theme])_&]:bg-surface [:root:not([data-theme])_&]:text-ink",
    hover: "[:root[data-theme]_&]:hover:text-ink-2",
  },
];

/** Names the group for assistive tech and heads the block for everyone else. */
const GROUP_LABEL = "Theme";

/** The stamp currently on <html>, or null when there is none (System). */
function readStamp(): ThemeStamp | null {
  const value = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return value === "light" || value === "dark" ? value : null;
}

/** The server cannot know the choice, so it renders the un-stamped default. */
function noStamp(): null {
  return null;
}

/** Re-read whenever anything changes the attribute — including this control. */
function subscribeToStamp(onStampChange: () => void): () => void {
  const observer = new MutationObserver(onStampChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
}

/**
 * The live theme stamp on <html>: "light", "dark", or null for "follow the OS".
 *
 * Exported because the Nutrient viewer has its own theme and has to be told
 * which one to use (components/ViewerEmbed.tsx). It reads the stamp rather than
 * localStorage so there is still exactly one source of truth.
 */
export function useThemeStamp(): ThemeStamp | null {
  return useSyncExternalStore(subscribeToStamp, readStamp, noStamp);
}

/** Stamp <html>, or un-stamp it for System. This is what "applying" means. */
function applyChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === SYSTEM) root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, choice);
}

/** Persist, or clear for System so the next load falls back to the OS. */
function persistChoice(choice: ThemeChoice): void {
  try {
    if (choice === SYSTEM) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The choice
    // still applies to this page; it just will not outlive it.
  }
}

/** What was persisted, or System for "nothing stored" and anything unreadable. */
function storedChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : SYSTEM;
  } catch {
    return SYSTEM;
  }
}

export default function ThemeToggle() {
  const selected: ThemeChoice = useThemeStamp() ?? SYSTEM;

  /**
   * Production no-op. In development React's Strict Mode remounts once and
   * resets <html> to the attributes it manages from JSX, clearing the stamp the
   * head script set; re-applying here restores it before paint. Documented in
   * next docs, guides/preventing-flash-before-hydration.md → "Re-applying
   * attributes in development".
   */
  useLayoutEffect(() => {
    applyChoice(storedChoice());
  }, []);

  return (
    <div className="shrink-0 border-t border-line px-2 py-3">
      <h2 className="px-3 pb-1.5 text-micro uppercase text-ink-3">
        {GROUP_LABEL}
      </h2>
      <div
        role="radiogroup"
        aria-label={GROUP_LABEL}
        className="flex rounded border border-line bg-canvas p-px"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.choice}
            type="button"
            role="radio"
            aria-checked={selected === option.choice}
            onClick={() => {
              applyChoice(option.choice);
              persistChoice(option.choice);
            }}
            className={`flex-1 cursor-pointer rounded-sm py-1 text-caption text-ink-3 focus-visible:shadow-selected focus-visible:outline-none ${option.selected} ${option.hover}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
