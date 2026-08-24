import { test, expect } from "@playwright/test";
import { signUpViaUI } from "./helpers";
import { cleanDatabase, closeDbConnection } from "./db-utils";

const TEST_USER = {
  name: "Profile User",
  email: `profile-${Date.now()}@example.com`,
  password: "SecurePassword123!",
};

test.beforeAll(async () => {
  await cleanDatabase();
});

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaUI(page, {
      ...TEST_USER,
      email: `profile-${Date.now()}@example.com`,
    });
    await page.goto("/profile");
  });

  test("shows profile page with user name", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("main").getByText(TEST_USER.name)).toBeVisible();
  });

  test("can edit bio", async ({ page }) => {
    await page.getByTestId("profile-edit").click();
    await page.getByTestId("profile-bio-input").fill("Hello, I am a test user!");
    await page.getByTestId("profile-save").click();

    await expect(page.getByTestId("profile-bio")).toContainText(
      "Hello, I am a test user!",
    );
  });
});
