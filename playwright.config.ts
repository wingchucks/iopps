import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Page reads can hydrate/write records. Never default browser tests to production
// or silently load a credential-bearing dotenv file. Use the isolated QA runner.
for (const name of ['.env', '.env.local', '.env.test', '.env.test.local', '.env.production', '.env.production.local', '.env.development', '.env.development.local']) {
  if (fs.existsSync(path.resolve(__dirname, name))) throw new Error(`Refusing browser QA with ${name}`);
}
for (const name of ['FIREBASE_SERVICE_ACCOUNT_BASE64', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT', 'GOOGLE_APPLICATION_CREDENTIALS', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'SMTP_PASSWORD']) {
  if (process.env[name]) throw new Error(`Refusing browser QA with ${name}`);
}
if (process.env.IOPPS_TEST_EMULATORS !== 'true' || process.env.GCLOUD_PROJECT !== 'demo-iopps-preview'
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-iopps-preview' || process.env.NEXT_PUBLIC_USE_EMULATORS !== 'true'
  || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
  || process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199') {
  throw new Error('Browser QA requires the isolated demo Firebase emulators');
}
const base = new URL(process.env.TEST_BASE_URL || 'about:blank');
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || !base.port || base.username || base.password
  || base.pathname !== '/' || base.search || base.hash) throw new Error('TEST_BASE_URL must be the owned loopback QA server origin');

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Fixture suites share one isolated demo database.
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: base.origin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './e2e/global-setup.ts',

  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /26-responsive-design/,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /26-responsive-design/,
    },
  ],
});
