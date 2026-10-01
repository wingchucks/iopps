import test from "node:test";
import assert from "node:assert/strict";
import { passwordResetErrorMessage } from "../src/app/auth/action/password-reset-error.ts";

test("reset errors distinguish provider policy, expired links and recoverable connection failures", () => {
  assert.match(passwordResetErrorMessage({ code: "auth/weak-password" }), /password requirements/);
  assert.match(passwordResetErrorMessage({ code: "auth/password-does-not-meet-requirements" }), /password requirements/);
  for (const code of ["auth/expired-action-code", "auth/invalid-action-code"]) {
    assert.match(passwordResetErrorMessage({ code }), /Request a new reset link/);
  }
  const network = passwordResetErrorMessage({ code: "auth/network-request-failed" });
  assert.match(network, /connection and try again/);
  assert.doesNotMatch(network, /password requirements|new reset link/);
  assert.match(passwordResetErrorMessage({ code: "auth/too-many-requests" }), /Wait a few minutes/);
});

test("account and unexpected reset failures offer support without exposing provider details", () => {
  for (const code of ["auth/user-disabled", "auth/user-not-found", "auth/operation-not-allowed", "auth/internal-error"]) {
    const message = passwordResetErrorMessage({ code, message: "private-user@example.test fictional-reset-code" });
    assert.match(message, /Contact page/);
    assert.doesNotMatch(message, /private-user|fictional-reset-code|stronger password/);
  }
  assert.match(passwordResetErrorMessage(null), /Try again/);
  assert.match(passwordResetErrorMessage(new Error("sensitive provider response")), /Try again/);
});
