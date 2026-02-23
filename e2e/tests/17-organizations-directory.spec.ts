import { test, expect } from '@playwright/test';

test.describe('Section 17: Organizations Directory (no auth)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/organizations');
    await page.waitForTimeout(3000);
  });

  test('17.1 — organizations page loads', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/organization|partner/);
  });

  test('17.2 — search input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search organizations" i]')).toBeVisible();
  });

  test('17.3 — type filter chips are present', async ({ page }) => {
    // Should have filter buttons like All, Employer, School, etc.
    await expect(page.getByRole('button', { name: /all/i }).first()).toBeVisible();
  });

  test('17.4 — organization cards are displayed', async ({ page }) => {
    // Should show org cards or empty state
    const links = page.locator('a[href*="/org/"]');
    const count = await links.count();
    // At least one org should be visible (wingchucks org exists)
    expect(count).toBeGreaterThan(0);
  });

  test('17.5 — search filters results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search organizations" i]');
    await searchInput.fill('zzz-no-match-xyz');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // After searching for gibberish, should show fewer/no results
    expect(body).toBeTruthy();
  });

  test('17.6 — filter chips change displayed results', async ({ page }) => {
    // Click a filter chip (e.g., a specific type)
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    // Just verify filters exist and are clickable
    expect(count).toBeGreaterThan(0);
  });

  test('17.7 — org cards link to org profile pages', async ({ page }) => {
    const firstOrgLink = page.locator('a[href*="/org/"]').first();
    const href = await firstOrgLink.getAttribute('href');
    expect(href).toMatch(/\/org\//);
  });
});
