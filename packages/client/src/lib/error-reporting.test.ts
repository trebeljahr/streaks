import { describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/browser";
import {
  createErrorReporter,
  startErrorReporting,
} from "./error-reporting/reporter";
import type * as Sdk from "./error-reporting/sdk";

type InitOptions = {
  sendDefaultPii?: boolean;
  defaultIntegrations?: boolean;
  tracesSampleRate?: number;
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
};

/** The SDK surface `sdk.ts` re-exports, with every call recorded. */
function fakeSdk(): { sdk: typeof Sdk; init: ReturnType<typeof vi.fn>; capture: ReturnType<typeof vi.fn> } {
  const init = vi.fn();
  const capture = vi.fn();
  const integration = (): object => ({});
  const sdk = {
    init,
    captureException: capture,
    breadcrumbsIntegration: integration,
    browserApiErrorsIntegration: integration,
    dedupeIntegration: integration,
    eventFiltersIntegration: integration,
    functionToStringIntegration: integration,
    globalHandlersIntegration: integration,
    httpContextIntegration: integration,
    linkedErrorsIntegration: integration,
  } as unknown as typeof Sdk;
  return { sdk, init, capture };
}

describe("client error reporting", () => {
  it("loads nothing in a build without an endpoint", async () => {
    const load = vi.fn();
    const reporter = createErrorReporter({
      dsn: "",
      load,
      release: "streaks@0.1.0",
      environment: "test",
      platform: () => "web",
    });
    reporter.report(new Error("boom"), { source: "global" });
    await expect(reporter.start()).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
    // The module-level reporter reads NEXT_PUBLIC_SENTRY_DSN, unset here.
    await expect(startErrorReporting()).resolves.toBe(false);
  });

  it("sends an error caught while loading, without tracing or PII", async () => {
    const { sdk, init, capture } = fakeSdk();
    const reporter = createErrorReporter({
      dsn: "https://key@glitchtip.example/1",
      load: () => Promise.resolve(sdk),
      release: "streaks@0.1.0",
      environment: "test",
      platform: () => "web",
    });
    const error = new Error("boom");
    reporter.report(error, { source: "boundary" });
    await reporter.start();

    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0]?.[0] as InitOptions;
    expect(options.sendDefaultPii).toBe(false);
    expect(options.defaultIntegrations).toBe(false);
    expect(options.tracesSampleRate).toBeUndefined();
    expect(capture).toHaveBeenCalledWith(error, { tags: { source: "boundary" } });

    const sent = options.beforeSend?.({
      type: undefined,
      user: { email: "someone@example.com" },
      request: { url: "https://app.example/page?token=secret", headers: { Cookie: "s=1" } },
    } as ErrorEvent);
    expect(sent?.user).toBeUndefined();
    expect(sent?.request).toEqual({ url: "https://app.example/page" });
  });
});
