import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/csrf";

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

  const now = FieldValue.serverTimestamp();
  updates.push(
    memberRef.set({ emailVerified: true, updatedAt: now }, { merge: true }),
    db.collection("organizations").doc(employerId).set({
      emailVerified: true,
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    }, { merge: true }),
    db.collection("employers").doc(employerId).set({
      emailVerified: true,
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    }, { merge: true }),
  );

  await Promise.all(updates);
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
