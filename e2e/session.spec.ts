import { test, expect } from "@playwright/test";
import { signUpViaUI, completeOnboarding } from "./helpers";
import { cleanDatabase, closeDbConnection } from "./db-utils";

test.beforeAll(async () => {
  await cleanDatabase();
});

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("The core loop", () => {
  // Two of these wait out a real one-minute minimum. Playwright's default
  // 30s per-test budget cannot cover that, and the machine may be loaded.
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await signUpViaUI(page, {
      name: "Session User",
      email: `session-${Date.now()}@example.com`,
      password: "SecurePassword123!",
    });
    await completeOnboarding(page, ["piano"], 1);
  });

  test("starting a practice opens the running screen and counts up", async ({
    page,
  }) => {
    await page.getByTestId("practice-list").waitFor();
    await page.getByRole("button", { name: "Start Piano" }).click();
    await page.waitForURL(/\/session\/?$/);

    const elapsed = page.getByTestId("elapsed");
    await expect(elapsed).toBeVisible();
    await expect(elapsed).toHaveText(/^00:0\d$/);

    // Counting up, never down.
    await expect(async () => {
      const text = await elapsed.textContent();
      expect(Number(text?.slice(3))).toBeGreaterThan(1);
    }).toPass({ timeout: 5_000 });
  });

  test("pausing holds the clock and resuming releases it", async ({ page }) => {
    await page.getByRole("button", { name: "Start Piano" }).click();
    await page.waitForURL(/\/session\/?$/);

    await page.waitForTimeout(1_500);
    await page.getByTestId("pause").click();
    const held = await page.getByTestId("elapsed").textContent();

    await page.waitForTimeout(1_500);
    await expect(page.getByTestId("elapsed")).toHaveText(held ?? "");

    await page.getByTestId("pause").click();
    await expect(async () => {
      const text = await page.getByTestId("elapsed").textContent();
      expect(text).not.toBe(held);
    }).toPass({ timeout: 5_000 });
  });

  test("crossing the minimum secures the day, and finishing credits it", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Start Piano" }).click();
    await page.waitForURL(/\/session\/?$/);

    // The minimum is one minute; the pill appears the moment it is crossed,
    // and from then on the screen has nothing left to fail at.
    await expect(page.getByTestId("day-secured")).toBeVisible({
      timeout: 110_000,
    });
    await expect(page.getByTestId("day-secured")).toContainText("Day secured");

    await page.getByTestId("finish").click();
    await page.waitForURL(/\/session\/complete\/?$/);

    // One tap logs it — there is no separate save step.
    await page.getByTestId("mood-4").click();
    await expect(page.getByTestId("mood-4")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByTestId("done").click();
    await page.waitForURL(/\/today\/?$/);

    // The day now reads as done rather than as something still owed.
    await expect(page.getByText(/Done today/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
