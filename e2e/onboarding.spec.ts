import { test, expect } from "@playwright/test";
import { signUpViaUI, completeOnboarding } from "./helpers";
import { cleanDatabase, closeDbConnection } from "./db-utils";

test.beforeAll(async () => {
  await cleanDatabase();
});

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaUI(page, {
      name: "Onboarding User",
      email: `onboarding-${Date.now()}@example.com`,
      password: "SecurePassword123!",
    });
  });

  test("a new account is invited to choose practices, not shown a deficit", async ({
    page,
  }) => {
    await expect(page.getByTestId("no-practices")).toBeVisible();
    await expect(page.getByTestId("quiet-section")).toHaveCount(0);
  });

  test("presets can be picked and the minimum adjusted without a keyboard", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(page.getByTestId("minimum-value")).toHaveText("2");

    await page.getByTestId("preset-piano").click();
    await page.getByTestId("preset-writing").click();
    await expect(page.getByTestId("onboarding-continue")).toHaveText(
      "Continue with 2",
    );

    await page.getByTestId("minimum-up").click();
    await expect(page.getByTestId("minimum-value")).toHaveText("3");
    await page.getByTestId("minimum-down").click();
    await page.getByTestId("minimum-down").click();
    await expect(page.getByTestId("minimum-value")).toHaveText("1");
  });

  test("chosen practices appear on Today", async ({ page }) => {
    await completeOnboarding(page, ["piano", "writing"]);
    await expect(page.getByTestId("practice-list")).toBeVisible();
    await expect(page.getByText("Piano")).toBeVisible();
    await expect(page.getByText("Writing")).toBeVisible();
  });
});
