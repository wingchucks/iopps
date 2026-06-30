import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("YouTube livestream route always checks current live search before manual fallback", () => {
  const route = read("src/app/api/livestreams/youtube/route.ts");

  assert.doesNotMatch(route, /STgbVkwfuYA/, "stale hard-coded live video must not remain");
  assert.match(route, /eventType:\s*"live"/);
  assert.match(route, /maxResults:\s*"3"/);
  assert.match(route, /Manual IDs are emergency fallbacks only/);
  assert.doesNotMatch(route, /shouldUseManualLiveIds/);

  const liveSearchIndex = route.indexOf('eventType: "live"');
  const manualFallbackIndex = route.indexOf("getManualLiveFallback");
  assert.ok(liveSearchIndex > -1, "must search YouTube for live videos");
  assert.ok(manualFallbackIndex > -1, "manual fallback still exists for emergencies");
  assert.ok(liveSearchIndex < route.lastIndexOf("getManualLiveFallback"), "live search should happen before fallback is selected");
});

test("community signup sends admin notification trigger through profile PATCH", () => {
  const signup = read("src/app/signup/page.tsx");
  const profile = read("src/app/api/profile/route.ts");

  assert.match(signup, /signupRole:\s*"community"/);
  assert.match(signup, /displayName:\s*name/);
  assert.match(profile, /sendAdminNewSignup/);
  assert.match(profile, /adminNotifications/);
  assert.match(profile, /New community signup/);
  assert.match(profile, /adminSignupNotifiedAt/);
});

test("admin notification emails cover signups, content, applications, and payments", () => {
  const email = read("src/lib/email.ts");
  const stripeWebhook = read("src/app/api/stripe/webhook/route.ts");
  const jobs = read("src/app/api/employer/jobs/route.ts");
  const events = read("src/app/api/employer/events/route.ts");
  const posts = read("src/app/api/posts/route.ts");
  const applications = read("src/app/api/applications/notify/route.ts");

  assert.match(email, /ADMIN_NOTIFICATION_EMAILS/);
  assert.match(email, /sendAdminNewSignup/);
  assert.match(email, /sendAdminContentPosted/);
  assert.match(email, /sendAdminApplicationNotification/);
  assert.match(email, /sendAdminPaymentNotification/);
  assert.match(stripeWebhook, /sendAdminPaymentNotification/);
  assert.match(jobs, /sendAdminContentPosted/);
  assert.match(events, /sendAdminContentPosted/);
  assert.match(posts, /sendAdminContentPosted/);
  assert.match(applications, /sendApplicationNotification/);
  assert.match(applications, /sendAdminApplicationNotification/);
});
