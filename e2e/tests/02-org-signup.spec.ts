import { test, expect } from '@playwright/test';

test.describe('Section 2: Organization Signup Form', () => {
  // Note: /org/signup is behind auth middleware and redirects unauthenticated users to /login.
  // These tests verify the redirect behavior and the login page signup link instead.

  test('2.1 — /org/signup redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/org/signup');
    await page.waitForTimeout(3000);
    expect(page.url()).toMatch(/\/login/);
  });

  test('2.2 — login page has "Sign up" link for new users', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/sign up/i).first()).toBeVisible();
  });

  test('2.3 — login page has "Create a free account" link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/create a free account/i)).toBeVisible();
  });

  test('2.4 — login form has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
  });

  test('2.5 — login form has Google OAuth button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('2.6 — login form has forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });

  test('2.7 — Sign In button is present', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
