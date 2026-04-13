import { expect, test } from "@playwright/test";

test("schools page presents the school showcase without a public claim CTA", async ({ page }) => {
  await page.goto("/schools");

  await expect(page.getByRole("heading", { name: /^Schools$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Claim your school profile" })).toHaveCount(0);
  await expect(page.getByText("National showcase", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/programs, supports, and career pathways in one place/i),
  ).toBeVisible();

  const hasOverflow = await page.evaluate(() => {
    const { documentElement, body } = document;
    return Math.max(
      documentElement.scrollWidth - documentElement.clientWidth,
      body ? body.scrollWidth - documentElement.clientWidth : 0,
    ) > 2;
  });

  expect(hasOverflow).toBeFalsy();
});
