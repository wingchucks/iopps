import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/csrf";
import { assertUserCanAccessApp, AccountAccessError } from "@/lib/server/account-access";

const COOKIE_NAME = "__session";
const MAX_AGE = 60 * 60; // 1 hour (token gets refreshed every 55 min)

async function syncAcceptedEmployerState(uid: string, emailVerified: boolean) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const memberRef = db.collection("members").doc(uid);
  const [userDoc, memberDoc] = await Promise.all([userRef.get(), memberRef.get()]);
  const userData = userDoc.data() ?? {};
  const memberData = memberDoc.data() ?? {};

  const employerId =
    (typeof userData.employerId === "string" && userData.employerId) ||
    (typeof userData.orgId === "string" && userData.orgId) ||
    (typeof memberData.orgId === "string" && memberData.orgId) ||
    uid;

  const role =
    (typeof userData.role === "string" && userData.role) ||
    (typeof memberData.role === "string" && memberData.role) ||
    "";

  const updates: Promise<unknown>[] = [
    userRef.set({ emailVerified, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ];

  if (!emailVerified || role !== "employer") {
    await Promise.all(updates);
    return;
  }

  updates.push(memberRef.set({ emailVerified: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  await Promise.all(updates);
  const orgId = typeof memberData.orgId === "string" && memberData.orgId ? memberData.orgId : employerId;
  await db.runTransaction(async tx => {
    const refs = [db.collection("organizations").doc(orgId), db.collection("employers").doc(employerId)];
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const status = snapshot.data()?.status;
      // Email confirmation can accept a new account; it cannot undo moderation.
      const accept = !status || status === "pending";
      tx.update(snapshot.ref, {
        emailVerified: true, updatedAt: FieldValue.serverTimestamp(),
        ...(accept ? { status: "approved", approvedAt: FieldValue.serverTimestamp() } : {}),
      });
    }
  });
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token with Firebase Admin
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    await assertUserCanAccessApp(decoded);
    await syncAcceptedEmployerState(decoded.uid, decoded.email_verified === true);

    const res = NextResponse.json({ status: "ok", uid: decoded.uid });
    res.cookies.set(COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });

    return res;
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Session POST error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
