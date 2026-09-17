import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from "firebase-admin/app";
import { getFirestore as getAdminDb } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, getDoc, terminate } from "firebase/firestore";

const denied = (error: unknown) => (error as { code?: string }).code === "permission-denied";
test("listing review rules protect drafts, feedback and immutable public profiles", { skip: process.env.IOPPS_TEST_EMULATORS !== "true" }, async () => {
  const projectId = "demo-iopps-review-rules";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const loaded = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: readFileSync("firestore.rules", "utf8") }] } }),
  });
  assert.equal(loaded.status, 200, await loaded.text());
  const admin = initializeAdmin({ projectId }, "review-rules");
  const server = getAdminDb(admin);
  const apps = ["review-owner", "review-other", "review-public"].map(name => initializeApp({ projectId, apiKey: "fictional-emulator-key" }, name));
  const clients = apps.map(app => { const db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080); return db; });
  const identities = apps.slice(0, 2).map(app => { const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); return auth; });
  const [owner] = await Promise.all(identities.map(auth => signInAnonymously(auth)));
  const uid = owner.user.uid;
  try {
    await server.doc(`members/${uid}`).set({ orgId: uid, role: "employer", orgRole: "owner" });
    for (const collection of ["organizations", "employers"]) {
      await server.doc(`${collection}/${uid}`).set({ name: "Fictional reviewed business", directoryReview: { status: "approved", revision: 1, approvedRevision: 1, feedback: "PRIVATE_FEEDBACK" } });
      assert.equal((await getDoc(doc(clients[0], collection, uid))).data()?.name, "Fictional reviewed business");
      for (const client of clients.slice(1)) await assert.rejects(getDoc(doc(client, collection, uid)), denied);
      for (const updates of [{ name: "Unreviewed change" }, { directoryReview: { status: "approved", revision: 2, approvedRevision: 2 } }, { type: "school" }, { slug: "bypass" }, { onboardingComplete: true }, { emailVerified: true }]) {
        await assert.rejects(updateDoc(doc(clients[0], collection, uid), updates), denied);
      }
      await assert.rejects(setDoc(doc(clients[1], collection, identities[1].currentUser!.uid), { name: "Bypass signup", onboardingComplete: true }), denied);
    }
    await updateDoc(doc(clients[0], "organizations", uid), { emailTemplates: { interview: "A private template" }, updatedAt: new Date() });
    await assert.rejects(getDoc(doc(clients[2], "organizations", uid, "listingReviews", "audit")), denied);
    await server.doc(`members/${uid}`).update({ role: "admin" });
    for (const collection of ["organizations", "employers"]) await assert.rejects(setDoc(doc(clients[0], collection, "client-admin-bypass"), { name: "Forged reviewed listing", directoryReview: { status: "approved", revision: 1, approvedRevision: 1 } }), denied);
  } finally {
    for (const collection of ["members", "organizations", "employers"]) await server.recursiveDelete(server.doc(`${collection}/${uid}`));
    await Promise.all(clients.map(terminate)); await Promise.all(apps.map(deleteApp)); await server.terminate(); await deleteAdmin(admin);
  }
});
