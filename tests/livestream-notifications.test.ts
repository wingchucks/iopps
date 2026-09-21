import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

// Livestream status and fallback behavior are covered by youtube-feed.test.ts.

test("community signup sends admin notification trigger through profile PATCH", () => {
  const signup = read("src/app/signup/page.tsx");
  const profile = read("src/app/api/profile/route.ts");

  assert.match(signup, /signupRole: role/);
  assert.match(signup, /type Role = "" \| "community" \| "organization"/);
  assert.match(signup, /displayName:\s*name/);
  assert.match(profile, /sendAdminNewSignup/);
  assert.match(profile, /adminNotifications/);
  assert.match(profile, /New individual signup/);
  assert.match(profile, /adminSignupNotifiedAt/);
});

test("admin notification emails cover signups, content, applications, and payments", () => {
  const email = read("src/lib/email.ts");
  const stripeWebhook = read("src/app/api/stripe/webhook/route.ts");
  const jobs = read("src/app/api/employer/jobs/route.ts");
  const events = read("src/app/api/employer/events/route.ts");
  const opportunities = read("src/lib/server/organization-opportunities.ts");
  const posts = read("src/app/api/posts/route.ts");
  const applications = read("src/app/api/applications/notify/route.ts");

  assert.match(email, /ADMIN_NOTIFICATION_EMAILS/);
  assert.match(email, /sendAdminNewSignup/);
  assert.match(email, /sendAdminContentPosted/);
  assert.match(email, /sendAdminApplicationNotification/);
  assert.match(email, /sendAdminPaymentNotification/);
  assert.match(stripeWebhook, /sendAdminPaymentNotification/);
  assert.match(jobs, /sendAdminContentPosted/);
  assert.match(events, /saveOrganizationOpportunity\(req, "events"\)/);
  assert.match(events, /saveOrganizationOpportunity\(req, "events", true\)/);
  assert.match(opportunities, /if \(result\.firstPublication && result\.record\)\s*\{[\s\S]*sendAdminContentPosted/);
  assert.match(posts, /sendAdminContentPosted/);
  assert.match(applications, /sendApplicationNotification/);
  assert.match(applications, /sendAdminApplicationNotification/);
});
