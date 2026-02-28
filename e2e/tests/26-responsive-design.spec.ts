import { test, expect } from '../fixtures/auth';

test.describe('Section 26: Responsive Design (mobile viewport)', () => {
  // These tests run with the mobile-chrome project (Pixel 5: 393×851)

  test('26.1 — employer dashboard renders on mobile', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    // Page should not overflow horizontally
    const bodyWidth = await employerPage.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await employerPage.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // small tolerance
  });

  test('26.2 — talent search renders on mobile', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/talent');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('Talent Search')).toBeVisible();
    const bodyWidth = await employerPage.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await employerPage.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('26.3 — organizations directory renders on mobile', async ({ page }) => {
    await page.goto('/organizations');
    await page.waitForTimeout(3000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('26.4 — jobs browse renders on mobile', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForTimeout(3000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('26.5 — for-employers landing renders on mobile', async ({ page }) => {
    await page.goto('/for-employers');
    await page.waitForTimeout(3000);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});
