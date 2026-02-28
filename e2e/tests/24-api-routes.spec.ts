import { test, expect } from '@playwright/test';

test.describe('Section 24: API Routes (GET only)', () => {
  test('24.1 — GET /api/jobs returns 200 with jobs array', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/jobs`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('jobs');
    expect(Array.isArray(body.jobs)).toBeTruthy();
    expect(body).toHaveProperty('count');
    expect(typeof body.count).toBe('number');
  });

  test('24.2 — GET /api/jobs returns job objects with expected fields', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/jobs`);
    const body = await response.json();
    if (body.jobs.length > 0) {
      const job = body.jobs[0];
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('title');
    }
  });

  test('24.3 — GET /api/jobs with employerName filter works', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/jobs?employerName=nonexistent`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.jobs)).toBeTruthy();
  });

  test('24.4 — GET /api/employer/check without auth returns 401', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/employer/check`);
    expect(response.status()).toBe(401);
  });
});
