import test from "node:test";
import assert from "node:assert/strict";
import { buildSetupRecoveryUserDoc } from "../src/lib/setup-user-recovery.ts";

test("builds a safe incomplete user document when setup opens without a Firestore user doc", () => {
  const doc = buildSetupRecoveryUserDoc({
    uid: "TrWmeSY3bpRdIDncP7l90gHk2Dg2",
    email: "glenballantyne@hotmail.com",
    displayName: "Glen Ballantyne",
    photoURL: null,
  });

  assert.equal(doc.uid, "TrWmeSY3bpRdIDncP7l90gHk2Dg2");
  assert.equal(doc.email, "glenballantyne@hotmail.com");
  assert.equal(doc.displayName, "Glen Ballantyne");
  assert.equal(doc.firstName, "Glen");
  assert.equal(doc.lastName, "Ballantyne");
  assert.equal(doc.role, "member");
  assert.equal(doc.accountType, "community_member");
  assert.equal(doc.profileComplete, false);
  assert.equal(doc.disabled, false);
});

test("recovers display names safely when Firebase Auth has no name", () => {
  const doc = buildSetupRecoveryUserDoc({
    uid: "abc123",
    email: "person@example.com",
    displayName: null,
    photoURL: "https://example.com/avatar.png",
  });

  assert.equal(doc.displayName, "person");
  assert.equal(doc.firstName, "person");
  assert.equal(doc.lastName, "");
  assert.equal(doc.photoURL, "https://example.com/avatar.png");
});
