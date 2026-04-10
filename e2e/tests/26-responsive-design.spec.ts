import { test, expect } from "@playwright/test";

const publicRoutes = [
  "/",
  "/jobs",
  "/schools",
  "/training",
  "/partners",
  "/businesses",
  "/education",
];

test("homepage mobile menu shows public discovery links and auth CTAs", async ({ page }) => {
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: /menu/i });
  const menuRoot = menuButton.locator("xpath=..");

  await menuButton.click();

  await expect(menuRoot.getByRole("link", { name: /^Jobs\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Events\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Scholarships\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Training\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Schools\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Businesses\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Partners\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Search\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Live\b/ })).toBeVisible();
  await expect(menuRoot.getByRole("link", { name: /^Pricing\b/ })).toBeVisible();
  await expect(menuRoot.locator('a[href="/login"]')).toHaveCount(1);
  await expect(menuRoot.locator('a[href="/signup"]')).toHaveCount(1);
});

test("signed-out jobs drawer does not expose private member utilities", async ({ page }) => {
  await page.goto("/jobs");
  const nav = page.locator("nav");

  await page.getByRole("button", { name: /toggle navigation menu/i }).click();

  await expect(nav.getByRole("link", { name: /^Jobs\b/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Saved" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Notifications" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(nav.locator('[href="/feed"]')).toHaveCount(0);
  await expect(nav.locator('[href="/profile"]')).toHaveCount(0);
  await expect(nav.locator('[href="/signin"]')).toHaveCount(0);
  await expect(nav.locator('[href="/login"]:visible').first()).toBeVisible();
  await expect(nav.locator('[data-nav-profile="true"] img')).toHaveCount(0);
});

test("public route metadata and mobile layout stay healthy", async ({ page }) => {
  await page.goto("/businesses");
  await expect(page).toHaveTitle(/Businesses|Employers/i);

  await page.goto("/education");
  await expect(page.locator('a[href="/programs"]')).toHaveCount(0);

  for (const route of publicRoutes) {
    await page.goto(route);
    const hasOverflow = await page.evaluate(() => {
      const { documentElement, body } = document;
      return Math.max(
        documentElement.scrollWidth - documentElement.clientWidth,
        body ? body.scrollWidth - documentElement.clientWidth : 0,
      ) > 2;
    });

    expect(hasOverflow, `Unexpected horizontal overflow on ${route}`).toBeFalsy();
  }
});
