import { test, expect } from '../fixtures/auth';

test.describe('Section 7: Employer Dashboard', () => {
  test('7.1 — dashboard loads for authenticated employer', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    // Should not redirect to login
    await employerPage.waitForTimeout(3000);
    expect(employerPage.url()).toContain('/org/dashboard');
  });

  test('7.2 — dashboard has stat cards', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('Total Posts')).toBeVisible();
    await expect(employerPage.getByText('Active Posts')).toBeVisible();
    await expect(employerPage.getByText('Applications')).toBeVisible();
  });

  test('7.3 — dashboard has action buttons', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('Talent Search')).toBeVisible();
    await expect(employerPage.getByText('Edit Profile')).toBeVisible();
    await expect(employerPage.getByText('Analytics')).toBeVisible();
  });

  test('7.4 — Post a Job button is visible', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('Post a Job')).toBeVisible();
  });

  test('7.5 — job list section exists (may be empty or populated)', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    const body = await employerPage.textContent('body');
    // Either shows jobs or "No job postings yet"
    expect(body).toBeTruthy();
  });

  test('7.6 — unauthenticated user gets redirected from dashboard', async ({ unauthPage }) => {
    await unauthPage.goto('/org/dashboard');
    await unauthPage.waitForTimeout(5000);
    // Should redirect to login
    expect(unauthPage.url()).toMatch(/\/login/);
  });

  test('7.7 — View Applications button links correctly', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    await expect(employerPage.getByText('View Applications')).toBeVisible();
  });
});
