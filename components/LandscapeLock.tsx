"use client";

import { useEffect } from "react";

/**
 * Attempts to lock the screen orientation to landscape via the
 * Screen Orientation API. This is a progressive enhancement —
 * it works in Chrome/Edge on Android but is ignored on iOS Safari
 * and desktop browsers. The CSS portrait overlay serves as fallback.
 */
export default function LandscapeLock() {
  useEffect(() => {
    async function lock() {
      try {
        // Only available in secure contexts on supported browsers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any)?.lock?.("landscape");
      } catch {
        // Silently fail — the CSS overlay handles the fallback
      }
    }
    lock();
  }, []);

  return (
    <>
      {/* Full-screen overlay shown ONLY in portrait on small devices */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-5">
          {/* Animated phone rotating icon */}
          <div
            className="w-12 h-20 border-2 border-slate-300 rounded-xl flex items-center justify-center"
            style={{ animation: "rotate-hint 2s ease-in-out infinite" }}
          >
            <div className="w-5 h-0.5 bg-slate-400 rounded-full" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-200 text-sm font-medium">Rotate your device</p>
            <p className="text-slate-400 text-[10px] leading-relaxed max-w-[200px]">
              Cabo is designed for landscape mode. Please turn your phone sideways.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
