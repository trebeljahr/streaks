import type { CapacitorConfig } from "@capacitor/cli";

/*
 * Capacitor (iOS + Android) configuration.
 *
 * The mobile build is produced by `pnpm build:mobile`, which runs
 * `next build` against packages/client (must have output: "export"
 * in next.config.ts) and then `cap sync`. Capacitor copies the
 * exported packages/client/out/ into ios/App/App/public and
 * android/app/src/main/assets/public.
 *
 * Live reload in dev: scripts/android-dev.sh / scripts/ios-dev.sh
 * set CAP_DEV_URL so the WebView loads from the Next dev server
 * on localhost, your LAN, or the hatchkit Tailscale dev URL instead
 * of the bundled export.
 */
const config: CapacitorConfig = {
  appId: "com.example.streaks",
  appName: "streaks",
  webDir: "packages/client/out",

  android: {
    allowMixedContent: false,
  },

  backgroundColor: "#ffffff",

  ...(process.env.CAP_DEV_URL
    ? {
        server: {
          url: process.env.CAP_DEV_URL,
          cleartext: true,
        },
      }
    : {}),

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
