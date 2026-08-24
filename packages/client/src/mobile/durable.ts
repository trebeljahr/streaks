/*
 * Durable persistence mirror for Capacitor.
 *
 * iOS WKWebView classifies localStorage as non-critical web data — it
 * can be evicted after low storage or ~7 days of app inactivity. Mirror
 * every write to @capacitor/preferences (UserDefaults / SharedPreferences)
 * and hydrate missing keys back to localStorage at boot.
 *
 * localStorage stays the operational source of truth so game/app reads
 * remain synchronous; Preferences is the fallback on next boot.
 */

import { Preferences } from "@capacitor/preferences";

export async function hydrateKeys(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      if (window.localStorage.getItem(key) != null) continue;
    } catch {
      continue;
    }

    let durable: string | null = null;
    try {
      const res = await Preferences.get({ key });
      durable = res.value;
    } catch {
      continue;
    }
    if (durable == null) continue;

    try {
      window.localStorage.setItem(key, durable);
    } catch {
      /* storage denied */
    }
  }
}

export function mirrorSet(key: string, value: string): void {
  Preferences.set({ key, value }).catch(() => {});
}

export function mirrorRemove(key: string): void {
  Preferences.remove({ key }).catch(() => {});
}
