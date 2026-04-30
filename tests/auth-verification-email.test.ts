import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAccountVerificationEmailContent,
  buildEmailVerificationContinueUrl,
  normalizeVerificationNextPath,
} from "../src/lib/auth-verification-email.ts";

test("builds email verification continue URLs on the IOPPS verify page", () => {
  assert.equal(
    buildEmailVerificationContinueUrl("https://www.iopps.ca", "/org/onboarding"),
    "https://www.iopps.ca/verify-email?next=%2Forg%2Fonboarding",
  );
});

test("normalizes unsafe verification redirects to the default setup path", () => {
  assert.equal(normalizeVerificationNextPath("https://example.com/phish"), "/setup");
  assert.equal(normalizeVerificationNextPath("//example.com/phish"), "/setup");
  assert.equal(normalizeVerificationNextPath(""), "/setup");
});

test("builds escaped account verification email content with the generated link", () => {
  const html = buildAccountVerificationEmailContent({
    displayName: "Jessica <Admin>",
    verificationLink: "https://example.com/action?mode=verifyEmail",
  });

  assert.match(html, /Jessica &lt;Admin&gt;/);
  assert.match(html, /https:\/\/example.com\/action\?mode=verifyEmail/);
  assert.doesNotMatch(html, /Jessica <Admin>/);
});
