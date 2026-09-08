import test from "node:test";
import assert from "node:assert/strict";

test("Firebase client ignores surrounding deployment-variable whitespace", async () => {
  const values = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-local-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-iopps-preview.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-iopps-preview",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-iopps-preview.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:preview",
  };
  for (const [key, value] of Object.entries(values)) process.env[key] = ` ${value}\n`;
  const { default: app } = await import("../src/lib/firebase.ts");
  assert.equal(app.options.projectId, values.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  assert.equal(app.options.storageBucket, values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  assert.equal(app.options.apiKey, values.NEXT_PUBLIC_FIREBASE_API_KEY);
  assert.equal(app.options.authDomain, values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  assert.equal(app.options.messagingSenderId, "123");
  assert.equal(app.options.appId, values.NEXT_PUBLIC_FIREBASE_APP_ID);
  const { deleteApp } = await import("firebase/app");
  await deleteApp(app);
});
