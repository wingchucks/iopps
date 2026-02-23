import { test, expect } from '../fixtures/auth';

test.describe('Section 16: Public Organization Profile', () => {
  // The wingchucks employer org slug is the UID
  const orgSlug = '2PAiIDcCYBfe0itB4mKF73fZxeI3';

  test('16.1 — org profile page loads for authenticated user', async ({ employerPage }) => {
    await employerPage.goto(`/org/${orgSlug}`);
    await employerPage.waitForTimeout(5000);
    // Should show org details, not "Organization Not Found"
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).not.toMatch(/not found/);
  });

  test('16.2 — org profile shows content sections', async ({ employerPage }) => {
    await employerPage.goto(`/org/${orgSlug}`);
    await employerPage.waitForTimeout(5000);
    const body = await employerPage.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });

  test('16.3 — org profile is visible to unauthenticated users', async ({ unauthPage }) => {
    await unauthPage.goto(`/org/${orgSlug}`);
    await unauthPage.waitForTimeout(5000);
    // Public page — should not redirect to login
    expect(unauthPage.url()).toContain(`/org/${orgSlug}`);
  });

  test('16.4 — follow button visible for authenticated user', async ({ employerPage }) => {
    await employerPage.goto(`/org/${orgSlug}`);
    await employerPage.waitForTimeout(5000);
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/follow/);
  });

  test('16.5 — nonexistent org shows 404 or error', async ({ unauthPage }) => {
    await unauthPage.goto('/org/definitely-not-a-real-org-slug-xyz');
    await unauthPage.waitForTimeout(5000);
    const body = await unauthPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/not found|doesn.*exist|browse partners/);
  });

  test('16.6 — not-found page has Browse Partners link', async ({ unauthPage }) => {
    await unauthPage.goto('/org/definitely-not-a-real-org-slug-xyz');
    await unauthPage.waitForTimeout(5000);
    await expect(unauthPage.getByText(/browse partners/i)).toBeVisible();
  });
});
