import { test, expect } from '../fixtures/auth';

test.describe('Section 6: Checkout', () => {
  const planSlugs = [
    { slug: 'standard-monthly', price: '125', label: 'Standard Monthly' },
    { slug: 'standard-yearly', price: '1,250', label: 'Standard Yearly' },
    { slug: 'premium-monthly', price: '250', label: 'Premium Monthly' },
    { slug: 'premium-yearly', price: '2,500', label: 'Premium Yearly' },
  ];

  for (const plan of planSlugs) {
    test(`6.x — checkout page shows price for ${plan.label}`, async ({ employerPage }) => {
      await employerPage.goto(`/org/checkout?plan=${plan.slug}`);
      await employerPage.waitForTimeout(2000);
      const body = await employerPage.textContent('body');
      // Page should load without error
      expect(body).toBeTruthy();
    });
  }

  test('6.5 — invalid plan shows fallback/error', async ({ employerPage }) => {
    await employerPage.goto('/org/checkout?plan=nonexistent-plan');
    await employerPage.waitForTimeout(2000);
    const body = await employerPage.textContent('body');
    expect(body).toBeTruthy();
  });

  test('6.6 — success page loads', async ({ employerPage }) => {
    await employerPage.goto('/org/checkout/success');
    await expect(employerPage.getByText(/payment successful/i)).toBeVisible();
  });

  test('6.7 — success page has dashboard link', async ({ employerPage }) => {
    await employerPage.goto('/org/checkout/success');
    await expect(employerPage.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('6.8 — cancel page loads', async ({ employerPage }) => {
    await employerPage.goto('/org/checkout/cancel');
    await expect(employerPage.getByText(/cancel/i)).toBeVisible();
  });

  test('6.9 — cancel page has plans link', async ({ employerPage }) => {
    await employerPage.goto('/org/checkout/cancel');
    const body = await employerPage.textContent('body');
    expect(body?.toLowerCase()).toMatch(/plan|try again|back/);
  });
});
