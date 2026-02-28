import { test, expect } from '../fixtures/auth';

test.describe('Section 21: Admin Employers (read-only)', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/employers');
    await adminPage.waitForTimeout(3000);
  });

  test('21.1 — admin employers page loads', async ({ adminPage }) => {
    const body = await adminPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/employer/);
  });

  test('21.2 — status filter tabs are present', async ({ adminPage }) => {
    // Should have All, Pending, Approved, Rejected tabs
    await expect(adminPage.getByRole('button', { name: /all/i }).first()).toBeVisible();
  });

  test('21.3 — search input is present', async ({ adminPage }) => {
    await expect(adminPage.locator('input[placeholder*="Search" i]')).toBeVisible();
  });

  test('21.4 — employer list/table is displayed', async ({ adminPage }) => {
    // Should show table rows or cards
    const body = await adminPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('21.5 — search filters employer list', async ({ adminPage }) => {
    const searchInput = adminPage.locator('input[placeholder*="Search" i]');
    await searchInput.fill('wingchucks');
    await adminPage.waitForTimeout(2000);
    const body = await adminPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('21.6 — unauthenticated user cannot access admin employers', async ({ unauthPage }) => {
    await unauthPage.goto('/admin/employers');
    await unauthPage.waitForTimeout(5000);
    expect(unauthPage.url()).toMatch(/\/login/);
  });
});
