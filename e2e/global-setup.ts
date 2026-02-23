import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';

const EMPLOYER_STATE = path.resolve(__dirname, 'auth-states/employer.json');
const ADMIN_STATE = path.resolve(__dirname, 'auth-states/admin.json');

async function loginAndSave(
  config: FullConfig,
  email: string,
  password: string,
  statePath: string,
  label: string,
) {
  const baseURL = config.projects[0].use.baseURL as string;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`[global-setup] Logging in as ${label} (${email})…`);
  await page.goto(`${baseURL}/login`);
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button:has-text("Sign In")');

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });
  console.log(`[global-setup] ${label} logged in → ${page.url()}`);

  // Small delay to let Firebase Auth persist session cookies/localStorage
  await page.waitForTimeout(2000);

  await context.storageState({ path: statePath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const employerEmail = process.env.TEST_EMPLOYER_EMAIL ?? 'wingchucks@gmail.com';
  const employerPassword = process.env.TEST_EMPLOYER_PASSWORD;
  const adminEmail = process.env.TEST_ADMIN_EMAIL ?? 'nathan.arias@iopps.ca';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!employerPassword || !adminPassword) {
    console.warn(
      '[global-setup] Missing TEST_EMPLOYER_PASSWORD or TEST_ADMIN_PASSWORD in .env.test. ' +
        'Authenticated tests will fail — only unauthenticated / public tests will work.',
    );
    return;
  }

  await loginAndSave(config, employerEmail, employerPassword, EMPLOYER_STATE, 'employer');
  await loginAndSave(config, adminEmail, adminPassword, ADMIN_STATE, 'admin');
}
