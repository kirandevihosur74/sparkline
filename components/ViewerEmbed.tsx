"use client";

import { useEffect, useRef, useState } from "react";
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
 * Re-applying on toggle costs a reload: the theme is load configuration and
 * the SDK exposes no runtime setter (nothing like `setTheme` on the instance),
 * so the effect below takes the stamp as a dependency and unloads/reloads.
 * That resets the page position, which is why the theme is a rail-level
 * preference set once and not something touched mid-review.
 */
export default function ViewerEmbed({
  documentUrl = "/doc-a.pdf",
}: {
  documentUrl?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<typeof import("@nutrient-sdk/viewer").default | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /* The same `data-theme` stamp on <html> that theme.css resolves the app's
     tokens from — read, never stored a second time, so the document pane
     cannot end up in a different theme from the page around it. */
  const themeStamp = useThemeStamp();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setError(null);
    setReady(false);

    (async () => {
      // Dynamic import keeps the ~3MB UMD bundle out of SSR and out of the
      // initial client chunk.
      const NutrientViewer = (await import("@nutrient-sdk/viewer")).default;
      sdkRef.current = NutrientViewer;
      if (cancelled) return;
      // Guard against React 18/19 StrictMode double-invoking effects: make
      // sure the container is clean before loading into it.
      NutrientViewer.unload(container);
      await NutrientViewer.load({
        container,
        document: documentUrl,
        baseUrl: `${window.location.protocol}//${window.location.host}/`,
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
      if (!cancelled) setReady(true);
    })().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
      sdkRef.current?.unload(container);
    };
    /* themeStamp is a dependency because `theme` is load configuration: the
       only way to re-apply it is to unload and load again. */
  }, [documentUrl, themeStamp]);

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded border border-line bg-surface">
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
