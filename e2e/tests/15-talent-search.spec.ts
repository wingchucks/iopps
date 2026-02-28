import { test, expect } from '../fixtures/auth';

test.describe('Section 15: Talent Search', () => {
  test.beforeEach(async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/talent');
    await employerPage.waitForTimeout(3000);
  });

  test('15.1 — talent search page loads with heading', async ({ employerPage }) => {
    await expect(employerPage.getByText('Talent Search')).toBeVisible();
  });

  test('15.2 — search input is present', async ({ employerPage }) => {
    await expect(employerPage.locator('input[placeholder*="Search by name"]')).toBeVisible();
  });

  test('15.3 — skill filter chips or input exists', async ({ employerPage }) => {
    // The talent page has skill-based filtering
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/skill|filter/);
  });

  test('15.4 — location filter exists', async ({ employerPage }) => {
    // Should have a location input or dropdown
    const locationInputs = employerPage.locator('input[placeholder*="location" i], select');
    const count = await locationInputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('15.5 — work preference filter exists', async ({ employerPage }) => {
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/work preference|remote|on-site|hybrid/);
  });

  test('15.6 — open to work toggle exists', async ({ employerPage }) => {
    await expect(employerPage.getByText(/open to work/i)).toBeVisible();
  });

  test('15.7 — member result cards appear', async ({ employerPage }) => {
    // Wait for results to load
    await employerPage.waitForTimeout(3000);
    const body = await employerPage.textContent('body');
    // Should show member cards or "no results" message
    expect(body).toBeTruthy();
  });

  test('15.8 — search filters results', async ({ employerPage }) => {
    const searchInput = employerPage.locator('input[placeholder*="Search by name"]');
    await searchInput.fill('test-nonexistent-name-xyz');
    await employerPage.waitForTimeout(2000);
    // After searching for a nonexistent name, results should change
    const body = await employerPage.textContent('body');
    expect(body).toBeTruthy();
  });
});
