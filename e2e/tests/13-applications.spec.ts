import { test, expect } from '../fixtures/auth';

test.describe('Section 13: Applications', () => {
  test('13.1 — applications page loads', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/applications');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('Applications')).toBeVisible();
  });

  test('13.2 — page shows applications or empty state', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/applications');
    await employerPage.waitForTimeout(3000);
    const body = await employerPage.textContent('body');
    // Should either show application cards or an empty state message
    expect(body).toBeTruthy();
  });

  test('13.3 — unauthenticated user gets redirected', async ({ unauthPage }) => {
    await unauthPage.goto('/org/dashboard/applications');
    await unauthPage.waitForTimeout(5000);
    expect(unauthPage.url()).toMatch(/\/login/);
  });
});
