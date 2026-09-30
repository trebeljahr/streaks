import path from "node:path";
import type { NextConfig } from "next";

/*
 * The hatchkit local-dev plugin (`@hatchkit/dev-plugin-next` — Caddy
 * fragment + Tailscale banner) is deliberately not wired in here.
 *
 * Next 16 loads next.config.ts through a CommonJS bundle, and that package
 * publishes only an `import` condition in its exports map, so requiring it
 * fails with ERR_PACKAGE_PATH_NOT_EXPORTED — under `next dev` as well as
 * `next build`. It affects only the local-dev banner and the Caddy fragment;
 * nothing the app does at runtime depends on it.
 */

/*
 * A relative assetPrefix is required for the native shells, which load the
 * export from file:// (Electron) or the Capacitor bundle. It is WRONG for
 * the web: combined with trailingSlash it resolves chunks against the
 * current path, so /signup/ asks for /signup/_next/... and gets a 404 —
 * the page renders as dead HTML with no JavaScript. Native builds set
 * NATIVE_BUILD; everything else serves from the root.
 */
const isNativeBuild = process.env.NATIVE_BUILD === "1";

if (process.env.HATCHKIT_IMAGE_BUILD === "1" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required for the production image");
}

const nextConfig: NextConfig = {
  output: isNativeBuild ? "export" : "standalone",
  ...(!isNativeBuild
    ? { outputFileTracingRoot: path.resolve(process.cwd(), "../..") }
    : {}),
  /*
   * Next 16 blocks dev-server asset and HMR requests from origins it does
   * not recognise. Reaching the dev server over 127.0.0.1 (as Playwright
   * and the LAN/device previews do) while it treats localhost as its own
   * origin silently starves the page of its client runtime: the markup
   * renders but never hydrates, so forms fall back to a native submit.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "0.0.0.0"],
  ...(isNativeBuild ? { assetPrefix: "./" } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@starter/server", "@starter/shared"],
};

export default nextConfig;
