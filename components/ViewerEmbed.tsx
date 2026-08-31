"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // Nutrient Web SDK global, loaded from CDN (plan §9.1 Viewer step 4).
    NutrientViewer?: {
      load: (config: Record<string, unknown>) => Promise<unknown>;
      unload: (container: HTMLElement) => void;
    };
  }
}

// TODO(beat-3): replace with the exact CDN URL from the Nutrient Web SDK docs
// (Viewer API dashboard → integration guide). Left blank so the missing URL
// fails loudly here instead of silently breaking the embed.
const NUTRIENT_WEB_SDK_CDN_URL = "";

/**
 * Beat 3 — embedded DWS Viewer where the human reviews a flagged document.
 * Gets its session token from POST /api/viewer-session (never the raw API key).
 */
export default function ViewerEmbed({ sessionToken }: { sessionToken?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!sessionToken || !container || !window.NutrientViewer) return;

    // TODO(beat-3): window.NutrientViewer.load({ container, session: sessionToken, ... })
    // — confirm config shape in the Web SDK docs, then unload on cleanup.
    return () => {
      window.NutrientViewer?.unload(container);
    };
  }, [sessionToken]);

  return (
    <>
      {NUTRIENT_WEB_SDK_CDN_URL && (
        <Script src={NUTRIENT_WEB_SDK_CDN_URL} strategy="lazyOnload" />
      )}
      <div
        ref={containerRef}
        className="flex h-[600px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700"
      >
        {sessionToken
          ? "Loading viewer…"
          : "DWS Viewer embed — awaiting session token (Beat 3)"}
      </div>
    </>
  );
}
