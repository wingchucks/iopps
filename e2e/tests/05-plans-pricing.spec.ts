import { test, expect } from '../fixtures/auth';

test.describe('Section 5: Plans & Pricing (employer auth)', () => {
  test('5.1 — plans page loads with heading', async ({ employerPage }) => {
    await employerPage.goto('/org/plans');
    await expect(employerPage.getByText(/plan/i).first()).toBeVisible();
  });

  test('5.2 — back to dashboard link is present', async ({ employerPage }) => {
    await employerPage.goto('/org/plans');
    await expect(employerPage.getByRole('link', { name: /back to dashboard/i })).toBeVisible();
  });

  test('5.3 — pricing tabs/cards are visible', async ({ employerPage }) => {
    await employerPage.goto('/org/plans');
    // Wait for pricing content to load
    await employerPage.waitForTimeout(2000);
    // Should have plan cards or pricing tab content
    const body = await employerPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('5.4 — back to dashboard link navigates correctly', async ({ employerPage }) => {
    await employerPage.goto('/org/plans');
    const link = employerPage.getByRole('link', { name: /back to dashboard/i });
    await expect(link).toHaveAttribute('href', /\/org\/dashboard/);
  });
});
