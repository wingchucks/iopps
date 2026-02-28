import { test, expect } from '../fixtures/auth';

test.describe('Section 19: Job Detail', () => {
  // Job detail is behind ProtectedRoute — requires auth

  // Helper: navigate to the first available job detail page
  async function goToFirstJob(page: import('@playwright/test').Page) {
    await page.goto('/jobs');
    await page.waitForTimeout(4000);

    const jobLinks = page.locator('a[href*="/jobs/"]');
    const count = await jobLinks.count();
    if (count === 0) return null;

    const href = await jobLinks.first().getAttribute('href');
    await page.goto(href!);
    await page.waitForTimeout(5000);
    return href;
  }

  test('19.1 — job detail page loads for authenticated user', async ({ employerPage }) => {
    const href = await goToFirstJob(employerPage);
    if (!href) {
      test.skip(true, 'No jobs available to test detail page');
      return;
    }

    const h1 = await employerPage.textContent('h1');
    expect(h1).toBeTruthy();
  });

  test('19.2 — job detail has back to jobs link', async ({ employerPage }) => {
    const href = await goToFirstJob(employerPage);
    if (!href) {
      test.skip(true, 'No jobs available');
      return;
    }

    await expect(employerPage.getByText(/back to jobs/i)).toBeVisible();
  });

  test('19.3 — job detail shows job information sections', async ({ employerPage }) => {
    const href = await goToFirstJob(employerPage);
    if (!href) {
      test.skip(true, 'No jobs available');
      return;
    }

    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/description|about|detail|requirement|responsibilit/);
  });

  test('19.4 — nonexistent job shows not-found state', async ({ employerPage }) => {
    await employerPage.goto('/jobs/definitely-not-a-real-job-slug-xyz');
    await employerPage.waitForTimeout(5000);
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/not found|error|404|doesn.*exist|no job/);
  });

  test('19.5 — unauthenticated user gets redirected from job detail', async ({ unauthPage }) => {
    // First find a job URL from the public browse page
    await unauthPage.goto('/jobs');
    await unauthPage.waitForTimeout(3000);
    const jobLinks = unauthPage.locator('a[href*="/jobs/"]');
    const count = await jobLinks.count();
    if (count === 0) {
      test.skip(true, 'No jobs available');
      return;
    }
    const href = await jobLinks.first().getAttribute('href');
    await unauthPage.goto(href!);
    await unauthPage.waitForTimeout(5000);
    expect(unauthPage.url()).toMatch(/\/login/);
  });
});
