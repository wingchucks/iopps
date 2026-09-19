import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase-admin";
import { cleanClosedAccountUploads } from "@/lib/server/account-upload-cleanup";
import { isSuperAdminAccount } from "@/lib/server/super-admin";

export const runtime = "nodejs";

// Self-service closure is separate from administrators deleting other accounts.
export async function DELETE(request: NextRequest) {
  const viewer = await verifyAuthToken(request, { checkRevoked: true });
  if (!viewer.success) return viewer.response;
  const uid = viewer.decodedToken.uid;
  const authTime = viewer.decodedToken.auth_time;
  if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 300) {
    return NextResponse.json({ error: "Please sign in again before deleting your account." }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (body?.confirmDelete !== true) return NextResponse.json({ error: "Confirm account deletion." }, { status: 400 });
    const auth = getAdminAuth();
    if (await isSuperAdminAccount(uid, auth)) return NextResponse.json({ error: "The IOPPS owner account cannot be deleted here." }, { status: 403 });
    const db = getAdminDb();
    // Preserve a server-owned tombstone: a still-valid token must not recreate
    // the profile or regain database access during Auth cleanup.
    const closed = await db.runTransaction(async tx => {
      const [member, user, organization, employer] = await tx.getAll(db.doc(`members/${uid}`), db.doc(`users/${uid}`), db.doc(`organizations/${uid}`), db.doc(`employers/${uid}`));
      if (organization.exists || employer.exists || [member.data(), user.data()].some(data => data?.orgId && data.orgRole === "owner")) return false;
      tx.set(db.doc(`account_cleanup/${uid}`), { notBefore: new Date(Date.now() + 90 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() });
      tx.set(db.doc(`users/${uid}`), { status: "deleted", deletedAt: new Date().toISOString() });
      for (const collection of ["members", "member_settings", "notification_preferences"]) tx.delete(db.doc(`${collection}/${uid}`));
      return true;
    });
    if (!closed) return NextResponse.json({ error: "Contact IOPPS to transfer or close your organization before deleting its owner account." }, { status: 409 });
    await auth.deleteUser(uid);
    // Best effort immediately; the durable sweep also catches late uploads from old ID tokens.
    await cleanClosedAccountUploads(db, getStorage(getAdminApp()).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), auth, uid).catch(() => console.error("[account-cleanup] Queued upload cleanup needs retry"));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to finish account deletion. Please contact IOPPS if you cannot sign in." }, { status: 503 });
  }
}
