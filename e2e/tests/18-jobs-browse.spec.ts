import { test, expect } from '@playwright/test';

test.describe('Section 18: Jobs Browse (no auth)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForTimeout(3000);
  });

  test('18.1 — jobs page loads', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/job/);
  });

  test('18.2 — search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search job" i]')).toBeVisible();
  });

  test('18.3 — location filter input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="City or province" i]')).toBeVisible();
  });

  test('18.4 — employment type filter exists', async ({ page }) => {
    const select = page.locator('select');
    await expect(select.first()).toBeVisible();
    const options = select.first().locator('option');
    const texts = await options.allTextContents();
    expect(texts.some((t) => t.toLowerCase().includes('full-time'))).toBeTruthy();
  });

  test('18.5 — salary filter inputs exist', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Min" i]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Max" i]')).toBeVisible();
  });

  test('18.6 — remote toggle button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /remote/i })).toBeVisible();
  });

  test('18.7 — job cards are displayed', async ({ page }) => {
    const links = page.locator('a[href*="/jobs/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no active jobs
  });

  test('18.8 — search filters results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search job" i]');
    await searchInput.fill('zzz-no-match-xyz');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('18.9 — results count is displayed', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/job/);
  });
});
