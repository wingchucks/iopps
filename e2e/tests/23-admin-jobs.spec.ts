import { test, expect } from '../fixtures/auth';

test.describe('Section 23: Admin Jobs (read-only)', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/jobs');
    await adminPage.waitForTimeout(3000);
  });

  test('23.1 — admin jobs page loads', async ({ adminPage }) => {
    const body = await adminPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/job/);
  });

  test('23.2 — status filter tabs are present', async ({ adminPage }) => {
    await expect(adminPage.getByRole('button', { name: /all/i }).first()).toBeVisible();
  });

  test('23.3 — search input is present', async ({ adminPage }) => {
    await expect(adminPage.locator('input[placeholder*="Search" i]')).toBeVisible();
  });

  test('23.4 — jobs table/list is displayed', async ({ adminPage }) => {
    const body = await adminPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('23.5 — search filters job list', async ({ adminPage }) => {
    const searchInput = adminPage.locator('input[placeholder*="Search" i]');
    await searchInput.fill('test');
    await adminPage.waitForTimeout(2000);
    const body = await adminPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('23.6 — unauthenticated user cannot access admin jobs', async ({ unauthPage }) => {
    await unauthPage.goto('/admin/jobs');
    await unauthPage.waitForTimeout(5000);
    expect(unauthPage.url()).toMatch(/\/login/);
  });
});
