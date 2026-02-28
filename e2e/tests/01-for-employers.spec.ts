import { test, expect } from '@playwright/test';

test.describe('Section 1: For-Employers Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-employers');
  });

  test('1.1 — page loads with hero heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Partner with IOPPS', exact: true })).toBeVisible();
  });

  test('1.2 — hero CTA buttons are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Get Started' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Partners' })).toBeVisible();
  });

  test('1.3 — nav has Sign In and Join Free links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join Free' })).toBeVisible();
  });

  test('1.4 — value proposition grid is visible', async ({ page }) => {
    // The page has a 4-column grid of value propositions
    const sections = page.locator('section');
    await expect(sections.first()).toBeVisible();
  });

  test('1.5 — pricing section shows Standard and Premium tiers', async ({ page }) => {
    await expect(page.getByText('$1,250')).toBeVisible();
    await expect(page.getByText('$2,500')).toBeVisible();
  });

  test('1.6 — Standard tier has features list and CTA', async ({ page }) => {
    const standardSection = page.getByText('Standard').first().locator('..');
    await expect(page.getByText('$1,250')).toBeVisible();
  });

  test('1.7 — Premium tier has RECOMMENDED badge', async ({ page }) => {
    await expect(page.getByText('RECOMMENDED')).toBeVisible();
  });

  test('1.8 — Get Started links point to /org/signup', async ({ page }) => {
    const ctaLinks = page.getByRole('link', { name: 'Get Started' });
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(ctaLinks.nth(i)).toHaveAttribute('href', /\/org\/signup/);
    }
  });

  test('1.9 — Sign In link points to /login', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', /\/login/);
  });
});
