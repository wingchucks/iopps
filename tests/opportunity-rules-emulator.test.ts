import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from "firebase-admin/app";
import { getFirestore as getAdminDb } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, getDoc, terminate } from "firebase/firestore";
const denied = (error: unknown) => (error as { code?: string }).code === "permission-denied";
test("opportunity drafts are server-only and owners cannot bypass publishing through Firestore", { skip: process.env.IOPPS_TEST_EMULATORS !== "true" }, async () => {
  const projectId = "demo-iopps-opportunity-rules";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const loaded = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: readFileSync("firestore.rules", "utf8") }] } }) });
  assert.equal(loaded.status, 200, await loaded.text());
  const admin = initializeAdmin({ projectId }, "opportunity-rules"), server = getAdminDb(admin);
  const apps = ["opportunity-owner", "opportunity-other", "opportunity-public"].map(name => initializeApp({ projectId, apiKey: "fictional-key" }, name));
  const clients = apps.map(app => { const db = getFirestore(app); connectFirestoreEmulator(db, "127.0.0.1", 8080); return db; });
  const identities = apps.slice(0, 2).map(app => { const auth = getAuth(app); connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); return auth; });
  const [owner] = await Promise.all(identities.map(auth => signInAnonymously(auth)));
  const uid = owner.user.uid;
  try {
    await server.doc(`members/${uid}`).set({ orgId: uid, orgRole: "owner", role: "employer" });
    for (const collection of ["events", "scholarships"]) {
      await server.doc(`${collection}/test`).set({ title: "Private draft", orgId: uid, status: "draft", active: false });
      assert.equal((await getDoc(doc(clients[0], collection, "test"))).data()?.title, "Private draft");
      for (const client of clients.slice(1)) await assert.rejects(getDoc(doc(client, collection, "test")), denied);
      await assert.rejects(updateDoc(doc(clients[0], collection, "test"), { status: "active", active: true }), denied);
      await assert.rejects(setDoc(doc(clients[0], collection, "bypass"), { orgId: uid, status: "active" }), denied);
    }
    await server.doc("organizationOpportunityDrafts/example").set({ orgId: uid, title: "Private content" });
    for (const client of clients) {
      await assert.rejects(getDoc(doc(client, "organizationOpportunityDrafts", "example")), denied);
      await assert.rejects(setDoc(doc(client, "organizationOpportunityDrafts", "example"), { orgId: uid, title: "Bypass" }), denied);
    }
    await server.doc(`members/${uid}`).update({ role: "admin" });
    await assert.rejects(updateDoc(doc(clients[0], "scholarships", "test"), { title: "Forged profile admin" }), denied);
  } finally {
    await Promise.all([server.doc(`members/${uid}`).delete(), server.doc("events/test").delete(), server.doc("scholarships/test").delete(), server.doc("organizationOpportunityDrafts/example").delete()]);
    await Promise.all(clients.map(terminate)); await Promise.all(apps.map(deleteApp)); await server.terminate(); await deleteAdmin(admin);
  }
});
