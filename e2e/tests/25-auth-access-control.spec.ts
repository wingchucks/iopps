import { test, expect } from '../fixtures/auth';

test.describe('Section 25: Auth & Access Control', () => {
  const protectedRoutes = [
    '/org/dashboard',
    '/org/dashboard/profile',
    '/org/dashboard/applications',
    '/org/dashboard/analytics',
    '/org/dashboard/talent',
  ];

  for (const route of protectedRoutes) {
    test(`25.x — unauthenticated → ${route} redirects to /login`, async ({ unauthPage }) => {
      await unauthPage.goto(route);
      await unauthPage.waitForTimeout(5000);
      expect(unauthPage.url()).toMatch(/\/login/);
    });
  }

  test('25.6 — authenticated employer can access dashboard', async ({ employerPage }) => {
    await employerPage.goto('/org/dashboard');
    await employerPage.waitForTimeout(3000);
    expect(employerPage.url()).toContain('/org/dashboard');
    // Should not be on login page
    expect(employerPage.url()).not.toContain('/login');
  });

  test('25.7 — authenticated admin can access admin employers', async ({ adminPage }) => {
    await adminPage.goto('/admin/employers');
    await adminPage.waitForTimeout(3000);
    expect(adminPage.url()).toContain('/admin/employers');
    expect(adminPage.url()).not.toContain('/login');
  });

  test('25.8 — public pages remain accessible without auth', async ({ unauthPage }) => {
    await unauthPage.goto('/for-employers');
    await unauthPage.waitForTimeout(3000);
    expect(unauthPage.url()).toContain('/for-employers');
    expect(unauthPage.url()).not.toContain('/login');
  });

  test('25.9 — public jobs page accessible without auth', async ({ unauthPage }) => {
    await unauthPage.goto('/jobs');
    await unauthPage.waitForTimeout(3000);
    expect(unauthPage.url()).toContain('/jobs');
    expect(unauthPage.url()).not.toContain('/login');
  });
});
