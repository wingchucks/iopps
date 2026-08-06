import test from "node:test";
import assert from "node:assert/strict";

import {
  NEW_EMPLOYER_STATUS,
  buildEmployerEmailVerificationUpdate,
  buildEmployerOnboardingCompletionUpdate,
  isEmployerApproved,
} from "../src/lib/server/employer-approval.ts";

test("new employer accounts always begin pending", () => {
  assert.equal(NEW_EMPLOYER_STATUS, "pending");
});

test("email verification does not approve an employer", () => {
  const updatedAt = { marker: "server-time" };
  const update = buildEmployerEmailVerificationUpdate(updatedAt);

  assert.deepEqual(update, { emailVerified: true, updatedAt });
  assert.equal("status" in update, false);
  assert.equal("approvedAt" in update, false);
});

test("onboarding completion does not approve an employer", () => {
  const updatedAt = { marker: "server-time" };
  const update = buildEmployerOnboardingCompletionUpdate(updatedAt);

  assert.deepEqual(update, { onboardingComplete: true, updatedAt });
  assert.equal("status" in update, false);
  assert.equal("approvedAt" in update, false);
});

test("only an explicit approved status passes the publishing approval check", () => {
  assert.equal(isEmployerApproved("approved"), true);
  assert.equal(isEmployerApproved(" Approved "), true);
  assert.equal(isEmployerApproved("pending"), false);
  assert.equal(isEmployerApproved("rejected"), false);
  assert.equal(isEmployerApproved(undefined), false);
});
