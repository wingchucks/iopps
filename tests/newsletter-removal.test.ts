import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const removedRoutes = [
  "src/app/admin/email/page.tsx",
  "src/app/admin/email/[campaignId]/page.tsx",
  "src/app/admin/email/compose/page.tsx",
  "src/app/admin/email/preview/[campaignId]/page.tsx",
  "src/app/admin/email/templates/page.tsx",
  "src/app/api/admin/backfill-newsletter/route.ts",
  "src/app/api/admin/email/campaigns/route.ts",
  "src/app/api/admin/email/campaigns/[campaignId]/route.ts",
  "src/app/api/admin/email/preview/route.ts",
  "src/app/api/admin/email/send/route.ts",
  "src/app/api/admin/email/templates/route.ts",
  "src/app/api/cron/send-newsletter/route.ts",
  "src/app/api/unsubscribe/route.ts",
  "src/app/unsubscribe/page.tsx",
  "web/app/admin/email/page.tsx",
  "web/app/admin/email/[campaignId]/page.tsx",
  "web/app/admin/email/compose/page.tsx",
  "web/app/admin/email/templates/page.tsx",
  "web/app/api/newsletter/subscribe/route.ts",
  "web/app/api/newsletter/unsubscribe/route.ts",
  "web/components/NewsletterSignup.tsx",
];

test("newsletter pages and sending endpoints are removed", () => {
  for (const path of removedRoutes) {
    assert.equal(existsSync(join(root, path)), false, `${path} should be removed`);
  }
});

test("newsletter is absent from signup and notification settings", () => {
  const signup = source("src/app/signup/page.tsx");
  const notifications = source("src/app/settings/notifications/page.tsx");
  const legacyHome = source("web/app/page.tsx");
  const legacyAdmin = source("web/app/admin/layout.tsx");
  const userTypes = source("packages/types/src/user.ts");
  const organizationTypes = source("packages/types/src/organization.ts");

  for (const file of [signup, notifications, legacyHome, legacyAdmin, userTypes, organizationTypes]) {
    assert.doesNotMatch(file, /newsletterOptIn|IOPPS Newsletter|Subscribe to IOPPS Newsletter|weeklyDigest|\/admin\/email/i);
  }
});

test("newsletter cron and admin navigation are removed", () => {
  const vercel = JSON.parse(source("vercel.json")) as { crons?: Array<{ path: string }> };
  const adminLayout = source("src/app/admin/layout.tsx");

  assert.equal(vercel.crons?.some((entry) => entry.path === "/api/cron/send-newsletter"), false);
  assert.doesNotMatch(adminLayout, /\/admin\/email/);
});

test("profile API refuses to persist legacy newsletter consent fields", () => {
  const profileApi = source("src/app/api/profile/route.ts");

  for (const field of ["newsletterOptIn", "newsletterOptInAt", "emailOptIn", "emailOptInAt"]) {
    assert.match(profileApi, new RegExp(`delete data\\.${field}`));
  }
});
