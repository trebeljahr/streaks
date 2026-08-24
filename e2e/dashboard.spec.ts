import { test, expect } from "@playwright/test";
import { signUpViaUI } from "./helpers";
import { cleanDatabase, closeDbConnection } from "./db-utils";

const TEST_USER = {
  name: "Dashboard User",
  email: `dashboard-${Date.now()}@example.com`,
  password: "SecurePassword123!",
};

test.beforeAll(async () => {
  await cleanDatabase();
});

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Dashboard CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await signUpViaUI(page, {
      ...TEST_USER,
      email: `dashboard-${Date.now()}@example.com`,
    });
  });

  test("shows empty state initially", async ({ page }) => {
    await expect(page.getByTestId("no-items")).toBeVisible();
  });

  test("can create an item", async ({ page }) => {
    await page.getByTestId("item-title-input").fill("My first item");
    await page.getByTestId("item-description-input").fill("A description");
    await page.getByTestId("create-item-submit").click();

    await expect(page.getByTestId("items-list")).toBeVisible();
    await expect(page.getByText("My first item")).toBeVisible();
    await expect(page.getByText("A description")).toBeVisible();
  });

  test("can delete an item", async ({ page }) => {
    // Create an item first
    await page.getByTestId("item-title-input").fill("Item to delete");
    await page.getByTestId("create-item-submit").click();
    await expect(page.getByText("Item to delete")).toBeVisible();

    // Delete it
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByText("Item to delete")).not.toBeVisible();
  });
});
