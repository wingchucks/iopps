import { NextRequest, NextResponse } from "next/server";
import { ANONYMOUS_MEMBER_NAME } from "@/lib/account-labels";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";
import { verifyAuthToken } from "@/lib/api-auth";
import { salaryRangeError } from "@/lib/salary-range";
import { personalProfileUpdates, profileFieldLimitError } from "@/lib/profile-fields";
import { sendAdminNewSignup } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const access = await verifyAuthToken(req);
  if (!access.success) return access.response;
  const uid = access.decodedToken.uid;

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
  const access = await verifyAuthToken(req);
  if (!access.success) return access.response;
  const uid = access.decodedToken.uid;

  try {
    const input = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    const salaryError = salaryRangeError(input.salaryRange);
    if (salaryError) return NextResponse.json({ error: salaryError }, { status: 400 });
    const signupRole = input.signupRole;
    const data = personalProfileUpdates(input);
    const tooLong = profileFieldLimitError(data);
    if (tooLong) return NextResponse.json({ error: "This profile field is too long.", field: tooLong }, { status: 400 });

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

    const displayName = shouldNotifyCommunitySignup
      ? typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : authUser?.displayName || authUser?.email?.split("@")[0] || ANONYMOUS_MEMBER_NAME
      : ANONYMOUS_MEMBER_NAME;

    await userRef.set(
      {
        ...data,
        ...(signupRole === "organization" ? { signupIntent: "organization" } : {}),
        ...(shouldNotifyCommunitySignup ? { adminSignupNotifiedAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    // Notify admin when a community member signs up/completes onboarding.
    if (shouldNotifyCommunitySignup) {
      await db.collection("adminNotifications").add({
        title: "New individual signup",
        message: `${displayName} joined IOPPS.ca.`,
        type: "success",
        read: false,
        userId: uid,
        contactEmail: authUser?.email || "",
        createdAt: new Date().toISOString(),
      });
    }
    // Notify admin when a community member completes onboarding
    if (shouldNotifyCommunitySignup) {
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
