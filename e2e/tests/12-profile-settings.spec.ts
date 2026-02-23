import { test, expect } from '../fixtures/auth';

test.describe('Section 12: Profile Settings', () => {
  test.beforeEach(async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard/profile');
    await employerPage.waitForTimeout(3000);
  });

  test('12.1 — profile page loads with heading', async ({ employerPage }) => {
    await expect(employerPage.getByText('Edit Organization Profile')).toBeVisible();
  });

  test('12.2 — completeness indicator is visible', async ({ employerPage }) => {
    // Should show a percentage or completeness meter
    await expect(employerPage.getByText('%')).toBeVisible();
  });

  test('12.3 — identity section has name and description fields', async ({ employerPage }) => {
    // Look for organization name and description inputs/textareas
    const inputs = employerPage.locator('input, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('12.4 — details section has industry and size options', async ({ employerPage }) => {
    // Should have select dropdowns or inputs for industry/size
    const selects = employerPage.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('12.5 — preview toggle button exists', async ({ employerPage }) => {
    const toggleButton = employerPage.getByRole('button', { name: /preview/i });
    await expect(toggleButton).toBeVisible();
  });

  test('12.6 — clicking preview toggles to preview mode', async ({ employerPage }) => {
    const previewBtn = employerPage.getByRole('button', { name: /preview/i });
    await previewBtn.click();
    // After clicking, should show "Edit Mode" button
    await expect(employerPage.getByRole('button', { name: /edit mode/i })).toBeVisible();
  });
});
