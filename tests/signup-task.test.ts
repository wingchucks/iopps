import test from "node:test";
import assert from "node:assert/strict";
import { ORGANIZATION_TASK_MESSAGE, organizationTaskFor } from "../src/lib/signup-task.ts";
import { hasCompletedEmployerOnboarding } from "../src/lib/server/employer-auth.ts";

test("organization tasks are recognised from the signup redirect", () => {
  assert.equal(organizationTaskFor("/org/dashboard/events/new"), "event");
  assert.equal(organizationTaskFor("/org/dashboard/scholarships/new?x=1"), "scholarship");
  assert.equal(organizationTaskFor("/org/dashboard/jobs/new"), "job");
  assert.equal(organizationTaskFor("/org/checkout?plan=tier1"), "job");
  assert.equal(organizationTaskFor("/org/dashboard"), "organization");
  for (const redirect of ["/org/some-public-business", "/jobs/role", "//evil.example/org/dashboard", "https://evil.example/org/dashboard/events/new", "", null, undefined]) {
    assert.equal(organizationTaskFor(redirect), null, String(redirect));
  }
  assert.match(ORGANIZATION_TASK_MESSAGE.event, /organization account/);
  assert.match(ORGANIZATION_TASK_MESSAGE.event, /come straight back to your event/);
});

test("posting needs a named, typed organization; a completed legacy setup still counts", () => {
  const context = (organizationData: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    uid: "u", employerId: "u", orgId: "u", orgRole: "owner", organizationData, employerData: {}, userData: {}, memberData: {}, emailVerified: true, ...extra,
  });
  assert.equal(hasCompletedEmployerOnboarding(context({ name: "Fictional Hall", type: "employer" })), true);
  assert.equal(hasCompletedEmployerOnboarding(context({ name: "Fictional Hall" })), false, "a type is required");
  assert.equal(hasCompletedEmployerOnboarding(context({ type: "employer", name: " " })), false, "a name is required");
  assert.equal(hasCompletedEmployerOnboarding(context({}, { employerData: { onboardingComplete: true } })), true);
});
