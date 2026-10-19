import { scrubBreadcrumb, scrubEvent } from "./scrub";
import type * as Sdk from "./sdk";

/**
 * Error reports from streaks, to a Sentry-protocol endpoint.
 *
 * Generated and OWNED by hatchkit: `hatchkit update` rewrites this file,
 * so an edit here is lost on the next run. Call the two exports at the
 * bottom from your own code; do not tune this one in place.
 *
 * Off unless this build has an endpoint. `NEXT_PUBLIC_SENTRY_DSN` is inlined at build
 * time with an empty fallback, so the condition in front of the import below
 * is a literal in every build: without an endpoint the bundler folds it
 * away and none of the SDK is shipped. Empty means off, not "on with
 * nowhere to send".
 *
 * Nothing here runs before the app mounts. The SDK arrives as a dynamic
 * import started from an effect, so it is in neither the prerendered HTML
 * nor the first chunks, and the platform is read only once the shell's
 * globals exist.
 *
 * What a report may carry is `scrub.ts`, and the privacy page states the
 * same list in plain words. What this file adds is the release and the
 * platform, and nothing else.
 *
 * No tracing, no replay, no session tracking. That is not a preference:
 * tracing makes the SDK add `sentry-trace` and `baggage` headers to this
 * app's own API requests, the API's CORS configuration does not list
 * them, the preflight fails, and sign-in stops working — in the name of
 * monitoring. Replay records the screen, and session tracking sends a
 * ping on every page load. With none of them, the SDK sends something
 * only when an error happens.
 */

/** The SDK surface the reporter uses: the named re-exports in `sdk.ts`. */
type Sentry = typeof Sdk;

/** Where an error was caught. Sent as the `source` tag. */
export interface ReportContext {
  source: "boundary" | "global" | "listener";
}

export interface ErrorReporter {
  /** Loads and starts the SDK once. Resolves false with no endpoint, or
   *  when the SDK chunk failed to load. */
  start(): Promise<boolean>;
  /** Reports one error. Does nothing in a build with no endpoint. */
  report(error: unknown, context: ReportContext): void;
}

export interface ErrorReporterOptions {
  dsn: string;
  /** Imports the SDK. Never called when `dsn` is empty. */
  load: () => Promise<Sentry>;
  release: string | undefined;
  environment: string;
  /** Read when the SDK starts, which is always after mount. */
  platform: () => ReportingPlatform;
}

/** Errors held while the SDK loads. An error thrown during startup is
 *  the one most likely to matter, so a few are kept rather than lost. */
const MAX_PENDING = 20;

/** The release every event is tagged with. */
export const RELEASE = "streaks@0.1.0";

/** A host this build can run on. Fixed by the build, not by the device. */
export type ReportingPlatform = "web" | "electron" | "ios" | "android";

/** Electron's renderer keeps its own token in the user-agent string. */
const isElectron = (): boolean =>
  typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

type CapacitorGlobal = { getPlatform?: () => string };

/** The phone shell names itself. Undefined in a browser tab. */
const capacitorPlatform = (): "ios" | "android" | null => {
  const shell = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  const name = shell?.getPlatform?.();
  if (name === "ios") return "ios";
  if (name === "android") return "android";
  return null;
};

/**
 * Which host this is. Reads globals the shells inject, so it must run
 * after mount — during prerendering there is no window, and a value read
 * there would be baked into HTML that every host is served.
 */
export function reportingPlatform(): ReportingPlatform {
  if (typeof window === "undefined") return "web";
  if (isElectron()) return "electron";
  const phone = capacitorPlatform();
  if (phone) return phone;
  return "web";
}

export function createErrorReporter(options: ErrorReporterOptions): ErrorReporter {
  let started: Promise<boolean> | null = null;
  let sdk: Sentry | null = null;
  let pending: Array<{ error: unknown; context: ReportContext }> = [];

  const capture = (client: Sentry, error: unknown, context: ReportContext): void => {
    client.captureException(error, { tags: { source: context.source } });
  };

  const start = (): Promise<boolean> => {
    if (!options.dsn) return Promise.resolve(false);
    started ??= options
      .load()
      .then((client) => {
        const platform = options.platform();
        client.init({
          dsn: options.dsn,
          release: options.release,
          environment: options.environment,
          sendDefaultPii: false,
          sendClientReports: false,
          // The list replaces the SDK's defaults rather than adding to
          // them, which is what leaves out the ping on every page load,
          // the culture context, and the console and DOM breadcrumbs.
          defaultIntegrations: false,
          integrations: [
            client.eventFiltersIntegration(),
            client.functionToStringIntegration(),
            client.browserApiErrorsIntegration(),
            client.breadcrumbsIntegration({
              console: false,
              dom: false,
              sentry: false,
              fetch: true,
              xhr: true,
              history: true,
            }),
            client.globalHandlersIntegration(),
            client.linkedErrorsIntegration(),
            client.dedupeIntegration(),
            client.httpContextIntegration(),
          ],
          maxBreadcrumbs: 30,
          // Dropped here as well as in beforeSend, so a breadcrumb that
          // may not be sent is never even stored.
          beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
          beforeSend: (event) =>
            scrubEvent(event, { release: options.release, platform }),
          initialScope: { tags: { platform } },
        });
        sdk = client;
        const held = pending;
        pending = [];
        for (const item of held) capture(client, item.error, item.context);
        return true;
      })
      .catch(() => {
        // The SDK chunk itself failed to load: offline, or a deploy
        // removed it. Caught here so it never travels on as an error of
        // the app's own.
        pending = [];
        return false;
      });
    return started;
  };

  return {
    start,
    report(error, context) {
      if (!options.dsn) return;
      if (sdk) {
        capture(sdk, error, context);
        return;
      }
      if (pending.length < MAX_PENDING) pending.push({ error, context });
      void start();
    },
  };
}

/**
 * The SDK import, inside a condition on the inlined variable in the same
 * expression. With no endpoint the condition is the literal "", the
 * bundler folds the import away, and the SDK is not in the build at all.
 * The import names `./sdk`, not the package, so the chunk built when
 * there is an endpoint holds only what the reporter uses.
 */
const loadSdk = (): Promise<Sentry> =>
  process.env.NEXT_PUBLIC_SENTRY_DSN
    ? import("./sdk")
    : Promise.reject(new Error("error reporting is not configured"));

const reporter = createErrorReporter({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  load: loadSdk,
  release: RELEASE,
  environment: process.env.NODE_ENV ?? "development",
  platform: reportingPlatform,
});

/** Starts reporting, if this build has an endpoint. Call it from an
 *  effect — never during render, and never at module scope. */
export const startErrorReporting = (): Promise<boolean> => reporter.start();

/** Reports an error an error boundary or a listener caught. Does nothing
 *  in a build with no endpoint. */
export const reportClientError = (error: unknown, context: ReportContext): void =>
  reporter.report(error, context);
