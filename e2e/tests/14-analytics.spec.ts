import { test, expect } from '../fixtures/auth';

test.describe('Section 14: Analytics', () => {
  test.beforeEach(async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/analytics');
    await employerPage.waitForTimeout(3000);
  });

  test('14.1 — analytics page loads with heading', async ({ employerPage }) => {
    await expect(employerPage.getByText('Analytics')).toBeVisible();
  });

  test('14.2 — stat cards are visible', async ({ employerPage }) => {
    await expect(employerPage.getByText('Active Jobs')).toBeVisible();
    await expect(employerPage.getByText('Total Applications')).toBeVisible();
    await expect(employerPage.getByText('Profile Views')).toBeVisible();
  });

  test('14.3 — Avg Response Time stat is visible', async ({ employerPage }) => {
    await expect(employerPage.getByText('Avg Response Time')).toBeVisible();
  });

  test('14.4 — job performance table exists', async ({ employerPage }) => {
    await expect(employerPage.getByText('Job Performance')).toBeVisible();
  });

  test('14.5 — recent activity section exists', async ({ employerPage }) => {
    await expect(employerPage.getByText(/recent activity/i)).toBeVisible();
  });
});
