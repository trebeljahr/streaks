/*
 * Capacitor (native-mobile) bridge.
 *
 * Loaded dynamically from the client entry so Capacitor symbols stay
 * out of the web bundle. Init is idempotent and all native calls are
 * try-wrapped — a missing plugin or denied permission never crashes
 * the web view.
 */

export interface MobileHandlers {
  onBackButton?: () => boolean;
  onPause?: () => void;
  onResume?: () => void;
}

let initialized = false;

export async function initMobile(handlers: MobileHandlers = {}): Promise<void> {
  if (initialized) return;
  initialized = true;

  const [{ Capacitor }, { App }, { StatusBar, Style }] = await Promise.all([
    import("@capacitor/core"),
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
  ]);

  if (!Capacitor.isNativePlatform()) return;

  document.body.classList.add("cap");
  document.body.setAttribute("data-platform", Capacitor.getPlatform());

  try {
    await StatusBar.setStyle({ style: Style.Default });
  } catch {
    /* ignore */
  }

  if (handlers.onBackButton) {
    App.addListener("backButton", (event) => {
      const handled = handlers.onBackButton!();
      if (!handled && event.canGoBack === false) {
        App.exitApp();
      }
    });
  }

  if (handlers.onPause || handlers.onResume) {
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) handlers.onResume?.();
      else handlers.onPause?.();
    });
  }
}

export async function hideSplash(): Promise<void> {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    /* ignore */
  }
}

export async function lockOrientation(
  orientation: "portrait" | "landscape",
): Promise<void> {
  try {
    const { ScreenOrientation } = await import(
      "@capacitor/screen-orientation"
    );
    await ScreenOrientation.lock({ orientation });
  } catch {
    /* some devices refuse — leave unlocked */
  }
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}
