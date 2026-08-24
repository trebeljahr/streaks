"use client";

import { useEffect } from "react";

/*
 * Mounts once at app root. If running under Capacitor (iOS/Android
 * WebView), imports the bridge and initializes plugins. On web this
 * module still loads but initMobile() short-circuits when
 * Capacitor.isNativePlatform() returns false, so it's a no-op.
 */
export function MobileBridgeLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cap = (window as unknown as { Capacitor?: unknown }).Capacitor;
    if (!cap) return;

    let cancelled = false;
    (async () => {
      const { initMobile, hideSplash } = await import("./bridge");
      if (cancelled) return;
      await initMobile();
      await hideSplash();
    })().catch(() => {
      /* swallow — bridge failures must never crash the app */
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
