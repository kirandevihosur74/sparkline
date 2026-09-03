"use client";

/**
 * ClaimBoxOverlay — the page, with a box drawn around every claim Nutrient DWS
 * read out of it.
 *
 * ── WHY THIS IS NOT AN OVERLAY OVER THE PDF VIEWER ──────────────────────────
 *
 * The name says "overlay" because that is what the reviewer sees: a box around
 * the extracted words, labelled with the claim and its confidence. It is NOT
 * an absolutely-positioned layer floating over ViewerEmbed, and it must not
 * become one until two things are true that are not true today:
 *
 *   1. NOTHING GIVES US COORDINATES. `ClaimBox.bbox` is absent on every box
 *      this build ships. DWS json-content does return bboxes and
 *      lib/nutrient.ts drops them in three places — the whole statement is
 *      TODO(schema-gap: bbox) in lib/data/types.ts. A layer positioned by
 *      left/top percentages would be inventing the one number the pipeline
 *      never recorded, which is the thing this project refuses to do.
 *   2. THE VIEWER OWNS ITS OWN GEOMETRY. The Nutrient viewer renders into a
 *      shadow root on `.PSPDFKit-Container`, with its own scroll container
 *      (`.PSPDFKit-Scroll`), its own spread layout and its own zoom. A layer
 *      in our light DOM has no stable relationship to any of it: it would have
 *      to re-measure `.PSPDFKit-Page` through the shadow boundary on every
 *      scroll, zoom, resize, spread change and page change, and it would drift
 *      — visibly, and worst at the zoom levels a reviewer actually uses to
 *      read a figure — every time a measurement lagged a frame.
 *
 * So the box's geometry is the TEXT ITSELF. Each box is an inline element
 * wrapping the exact run of words the claim was read from (`PageTextRun`), so
 * it is exactly as wide and as tall as those words and re-wraps with them at
 * any container width. There is no coordinate space, and therefore no
 * coordinate to fake. The real PDF stays one click away in the same pane, and
 * `DocumentPageFacsimile.provenance` says on screen that this is a text
 * rendition rather than a render of the page.
 *
 * ── LABEL COLLISION ─────────────────────────────────────────────────────────
 *
 * A label sits in the line ABOVE its box. Drawing every label at once stacks
 * them into that line and into each other — the bug this component exists to
 * not have. The rule, and the whole of it: a label is drawn only for the
 * SELECTED box, or while the pointer (or keyboard focus) is on a box. At most
 * two are ever visible, and in practice one. The line-height of the page is
 * 1.85 so that the one visible label has room to sit in.
 *
 * ── MOTION ──────────────────────────────────────────────────────────────────
 *
 * None. The design system's Motion section does not list a box or its label,
 * so nothing here animates — not the ring, not the tint, not the label's
 * appearance. There is no transition to reduce, so `prefers-reduced-motion`
 * has nothing to switch on.
 */

import type { CSSProperties } from "react";
import type {
  ClaimBox,
  ClaimBoxVerdict,
  DocumentPageBlock,
  DocumentPageFacsimile,
  PageTextRun,
} from "@/lib/data";

/**
 * The document's leading.
 *
 * A label is ~12px tall and is drawn into the line above its box, so the page
 * needs a line box tall enough to take one legibly. 1.85 is what the reference
 * prototype sets on `.paper` and what this build must match exactly — not a
 * `leading-*` step that rounds it.
 *
 * TODO(token-gap: --leading-doc): this belongs in app/theme.css beside the
 * type scale, as does the ring geometry below. Both are stated once here
 * because theme.css is owned elsewhere; move them the moment it is opened.
 */
const DOCUMENT_LINE_HEIGHT = 1.85;

/**
 * Ring geometry, in px.
 *
 * These are `box-shadow` rings in a verdict colour, NOT container borders, so
 * the house 1px `--color-line` rule is not what governs them: the ring is
 * drawn outside the text's own box and costs the line no reflow when it
 * thickens on selection. The selected box is the only one that also carries a
 * halo — a second, wider layer of the same colour at low alpha, which is what
 * makes "heavier" read at a glance without moving a single word.
 */
const RING_PX = 1.5;
const RING_SELECTED_PX = 2;
const HALO_SELECTED_PX = 5;
/** The label's downward tail: a 3px triangle, 8px in from the label's left. */
const TAIL_PX = 3;

/**
 * How a verdict is drawn.
 *
 * Every colour is a theme token — the component holds no colour of its own —
 * so the dark theme re-points all four automatically off `--dark-warn`,
 * `--dark-alert`, `--dark-accent` and `--dark-line-strong`, and the tints
 * re-mix against whatever those become. Five ClaimVerdicts collapse to three
 * of these plus grey; the finer label ("review required", "consistent") rides
 * in the box's own label and on the queue card, never in a fourth ring colour.
 *
 * The tint alphas are deliberately not uniform. They are the reference
 * prototype's perceptual balance between a dark green, a red-brown, an amber
 * and a grey at the same apparent weight — not a typo to tidy up.
 */
interface BoxTone {
  /** Ring colour, and the label's ground. */
  line: string;
  /** Ground colour of the label, where it differs from the ring. */
  labelGround: string;
  /** Tint alpha, percent. */
  fillPct: number;
  /** Halo alpha, percent — selected boxes only. */
  haloPct: number;
}

const BOX_TONE: Record<ClaimBoxVerdict, BoxTone> = {
  stale: {
    line: "var(--color-warn)",
    labelGround: "var(--color-warn)",
    fillPct: 7,
    haloPct: 14,
  },
  conflicting: {
    line: "var(--color-alert)",
    labelGround: "var(--color-alert)",
    fillPct: 6,
    haloPct: 12,
  },
  corroborated: {
    line: "var(--color-accent)",
    labelGround: "var(--color-accent)",
    fillPct: 6,
    haloPct: 12,
  },
  /* A claim that produced no finding: read cleanly, drawn anyway, and inert.
     It is never the selected box — nothing selects it — so its halo is never
     drawn, and its label takes the metadata rung rather than a verdict colour,
     because a grey ring in a verdict palette would read as a fourth verdict. */
  none: {
    line: "var(--color-line-strong)",
    labelGround: "var(--color-ink-3)",
    fillPct: 8,
    haloPct: 0,
  },
};

export interface ClaimBoxOverlayProps {
  /** The page to draw, from getDocumentPage() — text runs and their boxes. */
  page: DocumentPageFacsimile;
  /**
   * The finding the screen has selected. Its box — and only its box — gets the
   * heavier ring. Selection is DERIVED, never held here: one piece of state
   * lights the queue card, the detail header and the box together. When the
   * selected finding's claim is not on this page, no box is selected, and that
   * is the correct outcome rather than a missing one.
   */
  selectedFindingId?: string;
  /**
   * Draw the claims that produced NO finding as well — the grey, inert boxes.
   * Off by default: the page shows what the pipeline concluded until the
   * reviewer asks what it read. Off, those runs render as bare text with no
   * element at all, so they are not hover targets and not DOM the reader can
   * trip over.
   */
  showAllClaims?: boolean;
  /**
   * Open a finding. Boxes are navigation, not decoration: clicking one selects
   * that finding exactly as clicking its queue card does.
   *
   * Absent ⇒ there is nothing for a click to do, so no box is rendered as a
   * button and none takes a pointer cursor. A control that looks live and does
   * nothing is the dead control this project keeps refusing to ship.
   */
  onSelectFinding?: (findingId: string) => void;
}

export default function ClaimBoxOverlay({
  page,
  selectedFindingId,
  showAllClaims = false,
  onSelectFinding,
}: ClaimBoxOverlayProps) {
  return (
    <div className="flex justify-center rounded border border-line bg-canvas p-4">
      <article
        aria-label={page.label}
        className="w-full max-w-prose bg-surface px-8 py-7 font-serif text-body text-ink-2 shadow-paper"
        /* The one number the type scale cannot carry: the page's leading has
           to leave room for a label in the line above the box. */
        style={{ lineHeight: DOCUMENT_LINE_HEIGHT }}
      >
        {page.blocks.map((block, blockIndex) => (
          <Block
            key={blockIndex}
            block={block}
            first={blockIndex === 0}
            selectedFindingId={selectedFindingId}
            showAllClaims={showAllClaims}
            onSelectFinding={onSelectFinding}
          />
        ))}
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocks and runs
// ---------------------------------------------------------------------------

function Block({
  block,
  first,
  selectedFindingId,
  showAllClaims,
  onSelectFinding,
}: {
  block: DocumentPageBlock;
  first: boolean;
  selectedFindingId?: string;
  showAllClaims: boolean;
  onSelectFinding?: (findingId: string) => void;
}) {
  const runs = block.runs.map((run, runIndex) => (
    <Run
      key={runIndex}
      run={run}
      selectedFindingId={selectedFindingId}
      showAllClaims={showAllClaims}
      onSelectFinding={onSelectFinding}
    />
  ));

  /* Section headings of the source document. Serif like the body, because
     they are the document's own words, not this app's chrome. */
  if (block.kind === "heading") {
    return (
      <h3 className={`font-semibold text-ink ${first ? "" : "mt-4"}`}>{runs}</h3>
    );
  }

  return <p className={first ? "" : "mt-2.5"}>{runs}</p>;
}

function Run({
  run,
  selectedFindingId,
  showAllClaims,
  onSelectFinding,
}: {
  run: PageTextRun;
  selectedFindingId?: string;
  showAllClaims: boolean;
  onSelectFinding?: (findingId: string) => void;
}) {
  if (run.kind === "text") return <>{run.text}</>;

  /* Show-all off: the run is drawn as the plain text it is. No hidden span, no
     inert hover target — the words are simply the document's words. */
  if (run.box.boxVerdict === "none" && !showAllClaims) return <>{run.text}</>;

  return (
    <Box
      box={run.box}
      text={run.text}
      selectedFindingId={selectedFindingId}
      onSelectFinding={onSelectFinding}
    />
  );
}

// ---------------------------------------------------------------------------
// The box
// ---------------------------------------------------------------------------

/**
 * One claim's box.
 *
 * Inline, so it wraps with the sentence it belongs to and its geometry is the
 * text's geometry. `box-shadow` for the ring rather than `border`, so the ring
 * thickening on selection moves no word on the line.
 *
 * A box with a finding is a real `<button>` — the reference prototype used a
 * `<span onclick>`, which cannot be reached by keyboard and announces nothing.
 * A box without one is a `<span>` with no handler: it is inert because there
 * is nothing behind it to open, and rendering it as a disabled button would
 * dress a fact up as a broken control.
 */
function Box({
  box,
  text,
  selectedFindingId,
  onSelectFinding,
}: {
  box: ClaimBox;
  text: string;
  selectedFindingId?: string;
  onSelectFinding?: (findingId: string) => void;
}) {
  const tone = BOX_TONE[box.boxVerdict];
  const findingId = box.findingId;
  const selected = findingId !== undefined && findingId === selectedFindingId;
  const clickable = box.interactive && findingId !== undefined && onSelectFinding !== undefined;

  /* group/box is what the label keys its hover and focus off — the label is a
     child of the box, so it can never be hovered independently of it. */
  const shared =
    "group/box relative inline rounded-sm px-0.5 py-px align-baseline text-inherit";

  const label = <Label box={box} tone={tone} shown={selected} />;

  if (!clickable) {
    return (
      <span
        className={`${shared} cursor-default`}
        /* Selection still thickens the ring here. A no-finding box can never
           be selected, but a finding's box rendered inert (no handler given)
           can be, and it must not lose the one mark that says which claim the
           screen is on. */
        style={boxStyle(tone, selected)}
      >
        {text}
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      /* Pressed, not selected-in-a-list: the box is one of several ways to
         reach the same finding, and it reports whether that finding is the one
         on screen. */
      aria-pressed={selected}
      onClick={() => onSelectFinding(findingId)}
      className={`${shared} cursor-pointer text-left focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink`}
      style={boxStyle(tone, selected)}
    >
      {text}
      {/* The document's own words stay the start of the accessible name, so a
          sentence still reads as a sentence; the claim, its verdict and its
          confidence are appended from the data layer's own wording. */}
      <span className="sr-only">, {box.accessibleName}</span>
      {label}
    </button>
  );
}

/** The tint and the ring. Selection changes the ring and adds the halo. */
function boxStyle(tone: BoxTone, selected: boolean): CSSProperties {
  return {
    backgroundColor: tint(tone.line, tone.fillPct),
    boxShadow: selected
      ? `0 0 0 ${RING_SELECTED_PX}px ${tone.line}, 0 0 0 ${HALO_SELECTED_PX}px ${tint(tone.line, tone.haloPct)}`
      : `0 0 0 ${RING_PX}px ${tone.line}`,
  };
}

/**
 * A verdict token at low alpha.
 *
 * `color-mix` rather than an authored rgba: the input is the token, so the
 * dark theme's own value is what gets mixed and the tint never has to be
 * re-authored per theme.
 */
function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/**
 * The claim's name and confidence, in the line above the box.
 *
 * Hidden unless this is the selected box or the pointer/focus is on it —
 * `opacity-0` plus `pointer-events-none`, so it never intercepts a click meant
 * for the line above and moving onto it cannot pull the pointer out of the
 * box's own hover. Sans on a verdict ground, deliberately chrome against the
 * document's serif.
 *
 * `aria-hidden`: the same three facts are already in the button's accessible
 * name, and a second copy would be read twice.
 */
function Label({
  box,
  tone,
  shown,
}: {
  box: ClaimBox;
  tone: BoxTone;
  shown: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-full left-0 z-10 -ml-0.5 mb-1.5 flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-sans text-micro leading-none font-medium text-surface ${
        shown
          ? "opacity-100"
          : "opacity-0 group-hover/box:opacity-100 group-focus-visible/box:opacity-100"
      }`}
      style={{ backgroundColor: tone.labelGround }}
    >
      {box.name}
      {/* Already 0–1 from lib/data — rendered as a percentage, never
          re-normalized. */}
      <span className="font-normal opacity-75">
        {Math.round(box.confidence * 100)}%
      </span>
      <span
        aria-hidden="true"
        className="absolute top-full left-2 size-0"
        style={{
          borderLeft: `${TAIL_PX}px solid transparent`,
          borderRight: `${TAIL_PX}px solid transparent`,
          borderTop: `${TAIL_PX}px solid ${tone.labelGround}`,
        }}
      />
    </span>
  );
}
