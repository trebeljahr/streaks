import { test, expect } from "@playwright/test";
import { signUpViaUI, signInViaUI, signOutViaUI } from "./helpers";
import { cleanDatabase, closeDbConnection } from "./db-utils";

const TEST_USER = {
  name: "Test User",
  email: `test-${Date.now()}@example.com`,
  password: "SecurePassword123!",
};

test.beforeAll(async () => {
  await cleanDatabase();
});

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Authentication", () => {
  test("can sign up a new account", async ({ page }) => {
    await signUpViaUI(page, TEST_USER);
    await expect(page).toHaveURL("/dashboard");
  });

  test("can sign out", async ({ page }) => {
    await signInViaUI(page, TEST_USER);
    await signOutViaUI(page);
    await expect(page).toHaveURL("/login");
  });

  test("can sign in with existing account", async ({ page }) => {
    await signInViaUI(page, TEST_USER);
    await expect(page).toHaveURL("/dashboard");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("nobody@example.com");
    await page.getByTestId("login-password").fill("WrongPassword123!");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("redirects to login when accessing protected page without auth", async ({
    page,
  }) => {
    // Clear cookies to ensure unauthenticated state
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot password page shows confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByTestId("forgot-email").fill(TEST_USER.email);
    await page.getByTestId("forgot-submit").click();

    await expect(page.getByTestId("reset-sent")).toBeVisible();
  });
});
