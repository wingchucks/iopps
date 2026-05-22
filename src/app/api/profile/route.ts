import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";
import { sendAdminNewSignup } from "@/lib/email";

export const runtime = "nodejs";

async function verifyToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const token = auth.split("Bearer ")[1];
    const app = getApps()[0];
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getAdminDb();
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const signupRole = data.signupRole;
    // Strip dangerous fields
    delete data.role;
    delete data.uid;
    delete data.email;
    delete data.signupRole;
    delete data.adminSignupNotifiedAt;

    const db = getAdminDb();
    const isNew = data.onboardingComplete === true;
    const userRef = db.collection("users").doc(uid);
    const existingUser = await userRef.get();
    const existingData = existingUser.data() ?? {};
    const shouldNotifyCommunitySignup =
      (signupRole === "community" || isNew) &&
      existingData.adminSignupNotifiedAt == null;

    let authUser: Awaited<ReturnType<ReturnType<typeof getAuth>["getUser"]>> | null = null;
    if (shouldNotifyCommunitySignup) {
      authUser = await getAuth(getApps()[0]).getUser(uid);
    }

    await userRef.set(
      {
        ...data,
        ...(shouldNotifyCommunitySignup ? { adminSignupNotifiedAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    // Notify admin when a community member completes onboarding
    if (shouldNotifyCommunitySignup) {
      const displayName =
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName.trim()
          : authUser?.displayName || authUser?.email?.split("@")[0] || "Community Member";
      sendAdminNewSignup({
        name: displayName,
        email: authUser?.email || "",
        type: "community",
        uid,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
