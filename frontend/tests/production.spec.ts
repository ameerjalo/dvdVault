import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bytebooks.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminPass123!";

test.describe("ByteBooks production smoke", () => {
  test("storefront renders at least one product", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /discover books/i })).toBeVisible();

    const catalog = page.locator(".shop-grid");
    await expect(catalog).toBeVisible({ timeout: 15_000 });

    const cards = catalog.locator(".shop-card");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("admin login reveals the Dashboard link in the navbar", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto("/");
    const dashboardLink = page.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toBeVisible({ timeout: 10_000 });
  });
});
