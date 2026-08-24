import type { Page } from "@playwright/test";

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
  // Wait for navigation to dashboard
  await page.waitForURL("/dashboard", { timeout: 10_000 });
}

export async function signInViaUI(
  page: Page,
  opts: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(opts.email);
  await page.getByTestId("login-password").fill(opts.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/dashboard", { timeout: 10_000 });
}

export async function signOutViaUI(page: Page) {
  await page.getByTestId("sign-out").click();
  await page.waitForURL("/login", { timeout: 10_000 });
}
