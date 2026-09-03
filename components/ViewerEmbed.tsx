"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import type { Instance } from "@nutrient-sdk/viewer";
import { useThemeStamp } from "./ThemeToggle";

/**
 * Embedded Nutrient Web SDK viewer — STANDALONE mode (client-side WASM
 * rendering, zero server code). The SDK's static assets are served from
 * /public/nutrient-viewer-lib (copied from
 * node_modules/@nutrient-sdk/viewer/dist/), so `baseUrl` points at the
 * site origin. Runs without a license key → renders with a trial watermark.
 *
 * Reusable: drop into any container with a resolved height (h-full +
 * min-h-0 parent, or an explicit height) and pass the document URL.
 *
 * ── HOW TALL THIS IS, AND WHO DECIDES ───────────────────────────────────────
 *
 * The parent decides; this component only refuses to disappear. The shell is
 * `flex-1 h-full min-h-[320px]`, which is three answers to three parents:
 *
 *   · a flex COLUMN pane with a resolved height — `flex-1` takes whatever is
 *     left after the toolbar and the claim strip, so the document is as tall
 *     as the screen allows and nothing here has to guess a number;
 *   · a plain sized block — `flex-1` is inert there and `h-full` fills it;
 *   · a parent with no resolved height at all — a percentage flex-basis
 *     against an indefinite main size falls back to the CONTENT size, so the
 *     shell keeps growing the way it always did rather than collapsing.
 *
 * The floor USED TO BE the whole story: the shell was `h-full min-h-[480px]`
 * under a parent that gave `h-full` nothing to resolve against, so 480px won
 * at every viewport height and a US-Letter page was read through a 430px slot
 * — 43% of one page. The floor is now the last resort rather than the answer,
 * and it is deliberately SMALL: 320px leaves ~270px of page under the SDK's
 * ~49px toolbar, and it is low enough that it only binds when the pane is
 * shorter than the chrome around it. A floor that argued with a real parent
 * height would be this file making a layout decision that is not its to make.
 *
 * TODO(token-gap: --spacing-doc-min): 320 is the one number in this file that
 * app/theme.css cannot supply — the scale carries fixed COLUMN widths
 * (--spacing-rail, --spacing-queue, --spacing-panel) and no height token. The
 * marked-text rendition (components/ClaimBoxOverlay.tsx) states the same floor
 * for the same reason, and the two must move together: a pane that changed
 * height when the reviewer switched views would be the screen flinching at a
 * question about the evidence.
 *
 * ── PAGE NUMBERING: 1-BASED IN, 0-BASED DOWN ────────────────────────────────
 *
 * The domain is 1-based. `ClaimSource.page` is what a reviewer reads off the
 * paper and what the detail pane prints ("Claim on page 2 of 2"), so this
 * component's `page` prop and its `onVisiblePageChange` report are 1-based too
 * — the app never has to think in indexes.
 *
 * The SDK is 0-based. `ViewState.currentPageIndex` is documented as
 * "zero-based … maximum value of totalPageCount - 1", and the same holds for
 * the `viewState.currentPageIndex.change` event payload. The conversion
 * happens in exactly two functions below — `toPageIndex` on the way in,
 * `toPageNumber` on the way out — and nowhere else, so an off-by-one has one
 * place to live and one place to be fixed.
 *
 * ── JUMPING DOES NOT RELOAD ─────────────────────────────────────────────────
 *
 * The SDK gives us both halves of this, and they are different mechanisms:
 *
 *   · `initialViewState` on the LOAD configuration — a `ViewState` built with
 *     `currentPageIndex`, applied before the viewer mounts. This is how the
 *     document opens at the claim's page instead of at page 1. It is forgiving:
 *     an index past the end of the document falls back to the default rather
 *     than throwing.
 *
 *   · `instance.setViewState(state => state.set("currentPageIndex", n))` on the
 *     MOUNTED instance — applied immediately and synchronously, no reload, no
 *     WASM restart. This is how a later jump costs nothing. It is NOT forgiving:
 *     an out-of-range index throws, which is why `navigate` clamps and catches.
 *
 * So a page change is a `setViewState` call, never a remount: the load effect
 * below deliberately does NOT take `page` as a dependency (it reads the latest
 * value off a ref), and a second, much cheaper effect does the navigating.
 * Only `documentUrl` and the theme can force a reload.
 *
 * THE VIEWER HAS ITS OWN THEME. It renders into its own DOM subtree with its
 * own stylesheet, so the app's tokens do not reach it: left alone it would
 * stay bright white inside a dark app. The SDK ships the switch we need —
 * `theme` on the load configuration, `NutrientViewer.Theme` — and its AUTO
 * value follows `prefers-color-scheme`, which is exactly what "System" means
 * here. So the three app states map one-to-one onto three SDK values and the
 * viewer follows the app in all of them, OS included.
 *
 * What that does and does not darken: the SDK themes its CHROME and the
 * viewport the pages sit in — toolbar, sidebar, and the surround behind the
 * document. The rendered page stays white, because it is the document, not UI:
 * a PDF's white is ink-on-paper, and inverting it would misreport the source
 * we are asking a reviewer to trust. There is no page-invert or night-mode
 * option in the SDK's typings, and we would not want one here.
 *
 * ── NOTHING IS DRAWN ON TOP OF THIS VIEWER, AND WHY ─────────────────────────
 *
 * The claim boxes (components/ClaimBoxOverlay.tsx) mark the words each claim
 * was extracted from. They are NOT an absolutely-positioned layer over this
 * component, and adding one would be wrong twice over:
 *
 *   · THERE ARE NO COORDINATES TO DRAW AT. `ClaimBox.bbox` is absent on every
 *     box this build ships. DWS json-content does return bboxes and
 *     lib/nutrient.ts drops them in three places — the full statement is
 *     TODO(schema-gap: bbox) in lib/data/types.ts. A layer positioned by
 *     left/top percentages over a rendered page would be inventing the one
 *     number the pipeline never kept, and it would be inventing it over the
 *     document a reviewer signs against.
 *   · THIS COMPONENT DOES NOT OWN THE GEOMETRY IT RENDERS. The SDK mounts into
 *     a shadow root on `.PSPDFKit-Container` and keeps its own scroll
 *     container, spread layout and zoom inside it. Our DOM has no stable
 *     relationship to any of that: an overlay would have to re-measure
 *     `.PSPDFKit-Page` through the shadow boundary on every scroll, zoom,
 *     resize, spread change and page change, and would drift by exactly one
 *     frame's worth of lag each time — worst at the zoom levels a reviewer
 *     uses to read a figure, which is when a box being one line off is a
 *     misreport rather than a wobble.
 *
 * So ReviewDetail's document pane mounts EITHER this viewer OR the marked-text
 * rendition, never one over the other, and this file stays what it is: the
 * source PDF, rendered, with nothing of ours painted on it. When ClaimSource
 * grows real rects in a named unit, the honest way in is the SDK's own
 * annotation API (which lives inside the same shadow root and moves with the
 * page), not a `position:absolute` div of ours.
 *
 * Re-applying the THEME still costs a reload: the theme is load configuration
 * and the SDK exposes no runtime setter (nothing like `setTheme` on the
 * instance), so the effect below takes the stamp as a dependency and
 * unloads/reloads. What the reload now restores is the CLAIM's page, not the
 * page the reviewer had scrolled to — `initialViewState` is rebuilt from the
 * same `page` prop the pane opened with. The theme stays a rail-level
 * preference set once rather than something touched mid-review.
 */

/** The claim's page, as a human reads it. Page one is `1`. */
const FIRST_PAGE = 1;

/** What a parent can ask the mounted viewer to do. */
export interface ViewerHandle {
  /**
   * Scroll the viewer to a 1-based page, now, without reloading.
   *
   * Needed as an imperative call and not just as a prop change: after the
   * reviewer scrolls away by hand, the page they want to return to is the one
   * `page` already holds, so a declarative prop has nothing to change and
   * nothing to re-fire on. Silent no-op while no document is mounted — the
   * caller is told about that through `onVisiblePageChange(null)` and is
   * expected to disable its control rather than let a press do nothing.
   */
  jumpToPage: (page: number) => void;
}

export interface ViewerEmbedProps {
  documentUrl?: string;
  /**
   * The 1-based page to open at, and to navigate to whenever it changes.
   * Defaults to the first page.
   */
  page?: number;
  /**
   * The 1-based page currently on screen, reported on load and on every page
   * change the reviewer makes. `null` means there is no document mounted —
   * loading, failed, or unmounted — so the page position is genuinely unknown
   * rather than zero.
   */
  onVisiblePageChange?: (page: number | null) => void;
  ref?: Ref<ViewerHandle>;
}

/** 1-based page → 0-based SDK index, clamped into the document when known. */
function toPageIndex(page: number, totalPages?: number): number {
  const index = Math.max(Math.round(page) - FIRST_PAGE, 0);
  if (totalPages === undefined || totalPages < 1) return index;
  return Math.min(index, totalPages - 1);
}

/** 0-based SDK index → 1-based page. */
function toPageNumber(pageIndex: number): number {
  return pageIndex + FIRST_PAGE;
}

export default function ViewerEmbed({
  documentUrl = "/doc-a.pdf",
  page = FIRST_PAGE,
  onVisiblePageChange,
  ref,
}: ViewerEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<typeof import("@nutrient-sdk/viewer").default | null>(
    null,
  );
  /** The mounted instance — the thing `setViewState` can be called on. */
  const instanceRef = useRef<Instance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /* The same `data-theme` stamp on <html> that theme.css resolves the app's
     tokens from — read, never stored a second time, so the document pane
     cannot end up in a different theme from the page around it. */
  const themeStamp = useThemeStamp();

  /* Latest values, readable from the load effect WITHOUT being dependencies of
     it. This is what keeps a page change from costing a WASM restart, and what
     keeps the parent's inline callback from reloading the document on every
     render of the parent. */
  const pageRef = useRef(page);
  const reportRef = useRef(onVisiblePageChange);
  /* Declared before the load effect so it has already run when that effect
     first fires in the same commit. */
  useEffect(() => {
    pageRef.current = page;
    reportRef.current = onVisiblePageChange;
  });

  /**
   * Navigate a mounted instance. Clamped because `setViewState` throws on an
   * out-of-range index, and caught because a page the run recorded may simply
   * not exist in the file we were handed — in which case the right outcome is
   * that the viewer stays where it is, not that the pane crashes.
   */
  const navigate = useCallback((instance: Instance, target: number) => {
    const index = toPageIndex(target, instance.totalPageCount);
    if (instance.viewState.currentPageIndex === index) return;
    try {
      instance.setViewState((state) => state.set("currentPageIndex", index));
    } catch {
      // Out of bounds after all — leave the document where the reviewer left it.
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setError(null);
    setReady(false);

    /* Declared out here so the cleanup below can unregister the very same
       function reference it registered. */
    const handlePageIndexChange = (pageIndex: number) => {
      reportRef.current?.(toPageNumber(pageIndex));
    };

    (async () => {
      // Dynamic import keeps the ~3MB UMD bundle out of SSR and out of the
      // initial client chunk.
      const NutrientViewer = (await import("@nutrient-sdk/viewer")).default;
      sdkRef.current = NutrientViewer;
      if (cancelled) return;
      // Guard against React 18/19 StrictMode double-invoking effects: make
      // sure the container is clean before loading into it.
      NutrientViewer.unload(container);
      const instance = await NutrientViewer.load({
        container,
        document: documentUrl,
        baseUrl: `${window.location.protocol}//${window.location.host}/`,
        /* Open ON the claim's page rather than at page 1 and then scrolling.
           `totalPageCount` is unknowable until the document is parsed, so this
           index is only floored, not clamped — the SDK's documented fallback
           for an index past the end is the default page, which is the same
           thing we would do by hand. */
        initialViewState: new NutrientViewer.ViewState({
          currentPageIndex: toPageIndex(pageRef.current),
          /* THE PAGE TAKES THE COLUMN. Left at its default (ZoomMode.AUTO)
             the SDK picks a zoom for "the best viewing experience" in the
             abstract, which in this pane rendered a 765px page inside a 940px
             viewport — 175px of empty gutter, 18.6% of the width the document
             was given. FIT_TO_WIDTH is documented as "fit the width of the
             broadest page into the viewport; the height might overflow", and
             overflowing height is exactly what a continuous document is for.

             Note the SDK's own caveat: "Using a ZoomMode will override the
             padding set using ViewState#viewportPadding". So `viewportPadding`
             and `spreadSpacing` are deliberately NOT set here — setting them
             beside a ZoomMode would be writing down a number the SDK then
             ignores. */
          zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
          /* STATED, NOT INHERITED. Both of these are already the SDK's
             defaults in v1.21 (CONTINUOUS, SINGLE). They are written down
             anyway because they are what makes this pane read as a document —
             one column of pages you scroll through, not a paged widget — and
             an SDK bump that moved either default would silently change how a
             reviewer reads the evidence. A default is a fact about a version;
             this is a decision about the screen. */
          scrollMode: NutrientViewer.ScrollMode.CONTINUOUS,
          layoutMode: NutrientViewer.LayoutMode.SINGLE,
        }),
        /* No stamp is "System", and the SDK's AUTO reads
           prefers-color-scheme itself — the same rule theme.css follows for
           an un-stamped root, so the OS moves both together. */
        theme:
          themeStamp === "dark"
            ? NutrientViewer.Theme.DARK
            : themeStamp === "light"
              ? NutrientViewer.Theme.LIGHT
              : NutrientViewer.Theme.AUTO,
      });
      /* StrictMode (or a fast document switch) can unmount while `load` is in
         flight: the cleanup below ran before there was an instance to unload,
         so this branch is the one that has to dispose of it. */
      if (cancelled) {
        NutrientViewer.unload(instance);
        return;
      }
      instanceRef.current = instance;
      instance.addEventListener(
        "viewState.currentPageIndex.change",
        handlePageIndexChange,
      );
      setReady(true);
      // Report where we actually landed, which is not always where we asked.
      reportRef.current?.(toPageNumber(instance.viewState.currentPageIndex));
    })().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
      instanceRef.current?.removeEventListener(
        "viewState.currentPageIndex.change",
        handlePageIndexChange,
      );
      instanceRef.current = null;
      /* There is no document on screen any more, so there is no page position.
         Saying `null` is what lets the pane above disable its jump control
         instead of offering a button with nothing behind it. */
      reportRef.current?.(null);
      sdkRef.current?.unload(container);
    };
    /* `page` is deliberately NOT a dependency: navigating is a `setViewState`
       call on the live instance (see the effect below), not a reload. The theme
       IS one, because `theme` is load configuration and the SDK has no runtime
       setter for it. */
  }, [documentUrl, themeStamp]);

  /* The cheap half: a page change moves the mounted viewer. `ready` is a
     dependency so a document that finishes loading after `page` last changed
     still ends up on the right page. */
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    navigate(instance, page);
  }, [page, ready, navigate]);

  useImperativeHandle(
    ref,
    () => ({
      jumpToPage: (target: number) => {
        const instance = instanceRef.current;
        if (!instance) return;
        navigate(instance, target);
      },
    }),
    [navigate],
  );

  return (
    /* THE SHELL TAKES THE HEIGHT IT IS GIVEN. See HOW TALL THIS IS above:
       `flex-1` claims the leftover height of a flex-column pane, `h-full`
       covers the case where the pane hands this component a sized block
       instead, and the floor is the last resort so the viewer is never a slit.
       `min-h-0` is deliberately absent: it would let a flex parent with no
       resolved height collapse this to nothing. */
    <div className="relative h-full min-h-[320px] w-full flex-1 overflow-hidden rounded border border-line bg-surface">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-caption text-ink-3">Loading document…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface p-6">
          <span className="text-caption text-alert">
            Viewer failed to load: {error}
          </span>
        </div>
      )}
    </div>
  );
}
