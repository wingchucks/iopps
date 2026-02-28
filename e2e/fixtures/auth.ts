import { test as base, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const EMPLOYER_STATE = path.resolve(__dirname, '../auth-states/employer.json');
const ADMIN_STATE = path.resolve(__dirname, '../auth-states/admin.json');

function stateFileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

type AuthFixtures = {
  employerPage: Page;
  adminPage: Page;
  unauthPage: Page;
};

export const test = base.extend<AuthFixtures>({
  employerPage: async ({ browser }, use, testInfo) => {
    if (!stateFileExists(EMPLOYER_STATE)) {
      testInfo.skip(true, 'No employer auth state — set TEST_EMPLOYER_PASSWORD in .env.test');
      return;
    }
    const context = await browser.newContext({ storageState: EMPLOYER_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use, testInfo) => {
    if (!stateFileExists(ADMIN_STATE)) {
      testInfo.skip(true, 'No admin auth state — set TEST_ADMIN_PASSWORD in .env.test');
      return;
    }
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  unauthPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
