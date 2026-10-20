import { test, expect } from "@playwright/test";

/*
 * Runs against the static export that ships (playwright.export.config.ts),
 * not `next dev`: the failure it guards against shows only in a production
 * build. A hydration mismatch in the root layout — on 2026-10-20 an empty
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN rendered as a "" text node in <head> — makes
 * React re-render the document on the client, and that drops every <link>
 * in <head>, the stylesheet included. The HTML arrives styled and turns
 * unstyled once the JavaScript runs.
 */
test("landing page keeps its stylesheet after hydration", async ({ page, baseURL }) => {
  const hydrationErrors: string[] = [];
  page.on("pageerror", (error) => {
    if (/React error #4(18|19|20|21|22|23|25)\b|hydrat/i.test(error.message)) {
      hydrationErrors.push(error.message);
    }
  });

  // Keep the run hermetic: the export calls the live API and analytics.
  const origin = new URL(baseURL ?? "http://127.0.0.1").origin;
  await page.route((url) => url.origin !== origin, (route) => route.abort());

  await page.goto("/", { waitUntil: "networkidle" });
  // React tags <body> with its fiber once it has hydrated (or re-rendered) it.
  await page.waitForFunction(() =>
    Object.keys(document.body).some((key) => key.startsWith("__reactFiber")),
  );

  expect
    .soft(await page.evaluate(() => document.styleSheets.length), "stylesheets after hydration")
    .toBeGreaterThan(0);
  expect(hydrationErrors, "hydration errors").toEqual([]);
});
