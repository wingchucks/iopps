import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApplicationDeliveryDocId,
  buildEmployerNotificationDeliveryPatch,
  resolveEmployerNotificationTargetId,
} from "../src/lib/application-notification-delivery.ts";

test("builds the deterministic application doc id used by the client", () => {
  assert.equal(
    buildApplicationDeliveryDocId("user_123", "job_456"),
    "user_123_job_456",
  );
});

test("falls back to employerId when orgId is blank", () => {
  assert.equal(
    resolveEmployerNotificationTargetId({ orgId: "", employerId: "employer_123" }),
    "employer_123",
  );
});

test("returns null when neither orgId nor employerId is available", () => {
  assert.equal(
    resolveEmployerNotificationTargetId({ orgId: "   ", employerId: "" }),
    null,
  );
});

test("builds a sent delivery patch with attempt and sent timestamps", () => {
  const attemptedAt = { seconds: 1 };
  const sentAt = { seconds: 2 };

  const patch = buildEmployerNotificationDeliveryPatch({
    attemptedAt,
    status: "sent",
    sentAt,
    employerEmailTarget: "jobs@example.com",
  });

  assert.deepEqual(patch, {
    "delivery.employerNotificationAttemptedAt": attemptedAt,
    "delivery.employerNotificationSentAt": sentAt,
    "delivery.employerNotificationStatus": "sent",
    "delivery.employerEmailTarget": "jobs@example.com",
  });
});

test("builds a failure delivery patch without a sent timestamp", () => {
  const attemptedAt = { seconds: 1 };

  const patch = buildEmployerNotificationDeliveryPatch({
    attemptedAt,
    status: "no_org_id",
    error: "Missing orgId and employerId",
  });

  assert.deepEqual(patch, {
    "delivery.employerNotificationAttemptedAt": attemptedAt,
    "delivery.employerNotificationStatus": "no_org_id",
    "delivery.employerNotificationError": "Missing orgId and employerId",
  });
});
