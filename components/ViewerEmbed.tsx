"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Embedded Nutrient Web SDK viewer — STANDALONE mode (client-side WASM
 * rendering, zero server code). The SDK's static assets are served from
 * /public/nutrient-viewer-lib (copied from
 * node_modules/@nutrient-sdk/viewer/dist/), so `baseUrl` points at the
 * site origin. Runs without a license key → renders with a trial watermark.
 *
 * Reusable: drop into any container with a resolved height (h-full +
 * min-h-0 parent, or an explicit height) and pass the document URL.
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
  }, [documentUrl]);

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
