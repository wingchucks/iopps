import test from "node:test";
import assert from "node:assert/strict";
import { persistEmployerNotificationDelivery } from "../src/lib/application-notification-delivery.ts";

test("delivery writes are readable as nested fields and cannot recreate applications", {
  skip: process.env.IOPPS_TEST_EMULATORS !== "true",
}, async () => {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
  const app = initializeApp({ projectId: "demo-iopps-preview" }, "delivery-persistence-test");
  const db = getFirestore(app);
  const ref = db.doc("applications/local-delivery-regression");
  try {
    await ref.set({ status: "submitted", delivery: { unrelated: "preserved" } });
    const attemptedAt = Timestamp.now();
    await persistEmployerNotificationDelivery(ref, {
      attemptedAt, sentAt: attemptedAt, status: "sent", employerEmailTarget: "qa@example.test",
    });
    const stored = (await ref.get()).data()!;
    assert.equal(stored.status, "submitted");
    assert.equal(stored.delivery.unrelated, "preserved");
    assert.equal(stored.delivery.employerNotificationStatus, "sent");
    assert.equal(stored.delivery.employerEmailTarget, "qa@example.test");
    assert.ok(stored.delivery.employerNotificationSentAt.isEqual(attemptedAt));
    assert.equal(Object.keys(stored).some(key => key.startsWith("delivery.")), false);
    await ref.delete();
    await assert.rejects(persistEmployerNotificationDelivery(ref, { attemptedAt, status: "sent" }));
    assert.equal((await ref.get()).exists, false);
  } finally {
    await ref.delete();
    await db.terminate();
    await deleteApp(app);
  }
});
