import { expect, type Page } from "@playwright/test";

/** Signup lands on /dashboard, which forwards to Today. */
const HOME = /\/(dashboard|today)\/?$/;

export async function signUpViaUI(
  page: Page,
  opts: { name: string; email: string; password: string },
) {
  await page.goto("/signup");
  await page.getByTestId("signup-name").fill(opts.name);
  await page.getByTestId("signup-email").fill(opts.email);
  await page.getByTestId("signup-password").fill(opts.password);
  await page.getByTestId("signup-confirm-password").fill(opts.password);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL(HOME, { timeout: 10_000 });
}

export async function signInViaUI(
  page: Page,
  opts: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(opts.email);
  await page.getByTestId("login-password").fill(opts.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(HOME, { timeout: 10_000 });
}

/**
 * Run onboarding with a one-minute minimum, so an e2e session can cross it
 * without the spec sitting there for two real minutes.
 */
export async function completeOnboarding(
  page: Page,
  presetKeys: readonly string[] = ["piano"],
  minimumMinutes = 1,
): Promise<void> {
  await page.goto("/onboarding");
  await page.getByTestId("preset-grid").waitFor();

  // The stepper only responds once React has attached. Asserting its
  // starting value first means a click cannot land on inert markup and
  // silently leave the practice on its default two-minute minimum.
  const minimum = page.getByTestId("minimum-value");
  await expect(minimum).toHaveText("2");

  for (const key of presetKeys) {
    await page.getByTestId(`preset-${key}`).click();
  }
  for (let i = 2; i > minimumMinutes; i -= 1) {
    await page.getByTestId("minimum-down").click();
  }
  await expect(minimum).toHaveText(String(minimumMinutes));

  await page.getByTestId("onboarding-continue").click();
  await page.waitForURL(/\/today\/?$/, { timeout: 10_000 });
}

/** Sign-out lives on Settings; the app has no persistent top nav. */
export async function signOutViaUI(page: Page) {
  await page.goto("/settings");
  await page.getByTestId("sign-out").click();
  await page.waitForURL(/\/login\/?$/, { timeout: 10_000 });
}
