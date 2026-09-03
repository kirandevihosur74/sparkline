"use client";

/**
 * SidePanel — the 384px column to the RIGHT of the review detail, holding the
 * two tabs that explain the finding on screen: Reasoning (why the pipeline
 * reached this verdict) and Extraction (what Nutrient DWS actually returned
 * for the page).
 *
 * PRESENTATIONAL. It owns which tab is showing only in the sense that it
 * renders the one it is told to; open/closed lives in ReviewWorkspace, which
 * simply does not render this component when the panel is closed. There is
 * deliberately NO collapsed state here: a 0px column still holds focusable
 * content, and a reviewer tabbing into a panel they cannot see is the failure
 * this build removes rather than styles around.
 *
 * IT PUSHES, IT DOES NOT FLOAT. The root is a flex child at
 * `var(--spacing-panel)` (w-panel) with `shrink-0` — never absolute, never
 * fixed — so opening it narrows the document column instead of covering it.
 *
 * REAL TABS. `role="tablist"` / `role="tab"` / `role="tabpanel"` with
 * `aria-selected`, `aria-controls`, `aria-labelledby` and a ROVING TABINDEX:
 * one Tab stop reaches the strip, and Left/Right/Home/End move between the
 * tabs and activate them. Only the active panel is rendered, so the inactive
 * tab's content is never a hidden focus trap.
 *
 * THE CLOSE CONTROL IS A WORD, NOT A GLYPH. This design system has no icons —
 * the only non-text marks are 5px status dots and the form primitives — so the
 * mockup's bare "✕" is not available here. It is the verb instead, at the
 * caption size, with an aria-label that names what closes. That also gives it
 * a hit area a pointer can find, which a 10px glyph does not have.
 *
 * Shadow discipline: nothing here carries `shadow-action`. That belongs to the
 * screen's single primary action, which is DecisionBar's.
 *
 * Client component: it owns the tab keyboard interaction and hands selection
 * back up through `onTabChange`.
 */

import { useRef } from "react";

import ExtractionTab from "./ExtractionTab";
import ReasoningTab from "./ReasoningTab";
import { getFindingReasoning } from "@/lib/data";
import type { Finding } from "@/lib/data";

/** The two tabs, in render order. A closed union so a third fails the build. */
export type SidePanelTab = "reasoning" | "extraction";

const TABS: readonly { id: SidePanelTab; label: string }[] = [
  { id: "reasoning", label: "Reasoning" },
  { id: "extraction", label: "Extraction" },
];

const REGION_LABEL = "Finding reasoning and extraction";
const TABLIST_LABEL = "Side panel view";
const CLOSE_LABEL = "Close";
const CLOSE_DESCRIPTION = "Close the reasoning panel";

const tabId = (id: SidePanelTab) => `side-panel-tab-${id}`;
const panelId = (id: SidePanelTab) => `side-panel-panel-${id}`;

export interface SidePanelProps {
  /** The finding the queue has selected — the whole panel is about this one. */
  finding: Finding;
  /**
   * Which run is on screen. Required, not defaulted: the reasoning module's
   * trace lookup is per-run, and defaulting it would print the demo run's
   * search under another run's finding.
   */
  reviewId: string;
  /** The document the viewer is showing — the Extraction tab is scoped to it. */
  documentId: string;
  /** The page ON SCREEN, 1-based, as everywhere else in this contract. */
  page: number;
  /** Which tab is showing. Owned by the caller. */
  tab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  onClose: () => void;
}

export default function SidePanel({
  finding,
  reviewId,
  documentId,
  page,
  tab,
  onTabChange,
  onClose,
}: SidePanelProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Roving tabindex: the strip is ONE tab stop, and the arrow keys move within
     it. Activation follows focus, which is the right default for two tabs whose
     panels are already loaded. */
  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = TABS.findIndex((entry) => entry.id === tab);
    let next: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (current + 1) % TABS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (current - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = TABS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onTabChange(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <aside
      aria-label={REGION_LABEL}
      className="flex min-h-0 w-panel shrink-0 flex-col overflow-hidden border-l border-line bg-surface"
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line-soft bg-subtle px-3.5 py-2">
        {/* Segmented control: one border around the pair, one divider between
            them, and the active tab takes the ink fill the rest of the system
            uses for selection. */}
        <div
          role="tablist"
          aria-label={TABLIST_LABEL}
          onKeyDown={onTabKeyDown}
          className="flex overflow-hidden rounded border border-line"
        >
          {TABS.map((entry, index) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={tabId(entry.id)}
                aria-selected={active}
                aria-controls={panelId(entry.id)}
                tabIndex={active ? 0 : -1}
                onClick={() => onTabChange(entry.id)}
                className={`px-3 py-1 text-caption focus-visible:shadow-selected focus-visible:outline-none ${
                  index < TABS.length - 1 ? "border-r border-line" : ""
                } ${
                  active
                    ? "bg-ink font-medium text-surface"
                    : "bg-surface text-ink-2 hover:bg-canvas hover:text-ink"
                }`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        {/* A word, not a glyph — see the header note on icons. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={CLOSE_DESCRIPTION}
          className="shrink-0 rounded border border-line bg-surface px-2.5 py-1 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
        >
          {CLOSE_LABEL}
        </button>
      </div>

      {tab === "reasoning" ? (
        /* The reasoning column scrolls itself; the page never scrolls. It is
           focusable so a keyboard reader can scroll it without a pointer. */
        <div
          role="tabpanel"
          id={panelId("reasoning")}
          aria-labelledby={tabId("reasoning")}
          tabIndex={0}
          className="scroll-col min-h-0 flex-1 bg-surface focus-visible:shadow-selected focus-visible:outline-none"
        >
          <ReasoningTab
            reasoning={getFindingReasoning(finding, reviewId)}
            findingLabel={finding.label}
          />
        </div>
      ) : (
        /* ExtractionTab is already a full-height flex column that manages its
           own scrolling in both axes, so this wrapper only gives it a height
           to fill and adds no scroll container of its own. */
        <div
          role="tabpanel"
          id={panelId("extraction")}
          aria-labelledby={tabId("extraction")}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col"
        >
          <ExtractionTab
            documentId={documentId}
            page={page}
            reviewId={reviewId}
            selectedFindingId={finding.id}
          />
        </div>
      )}
    </aside>
  );
}
