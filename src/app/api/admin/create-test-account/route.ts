import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password, displayName, orgData } = await req.json();

  try {
    // 1. Create Firebase Auth user
    let uid: string;
    try {
      const existing = await getAuth().getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const user = await getAuth().createUser({ email, password, displayName });
      uid = user.uid;
    }

    // 2. Set custom claims
    await getAuth().setCustomUserClaims(uid, { employer: true, orgId: orgData.slug });

    const db = getAdminDb();
    const now = new Date().toISOString();

    // 3. Create users doc
    await db.collection("users").doc(uid).set({
      uid, name: displayName, email, role: "employer",
      employerId: orgData.slug, createdAt: now, updatedAt: now,
    }, { merge: true });

    // 4. Create members doc
    await db.collection("members").doc(uid).set({
      uid, name: displayName, email, orgId: orgData.slug,
      orgName: orgData.name, role: "employer", createdAt: now,
    }, { merge: true });

    // 5. Create employers doc
    await db.collection("employers").doc(orgData.slug).set({
      uid, email, orgId: orgData.slug, plan: orgData.plan || "free",
      subscriptionTier: orgData.plan || "free", createdAt: now, updatedAt: now,
    }, { merge: true });

    // 6. Create organizations doc
    await db.collection("organizations").doc(orgData.slug).set({
      id: orgData.slug, ...orgData,
      employerId: orgData.slug, uid,
      verified: orgData.indigenousOwned === true,
      onboardingComplete: true, createdAt: now, updatedAt: now,
    }, { merge: true });

    return NextResponse.json({ ok: true, uid, orgId: orgData.slug });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { uid } = await req.json();
  try {
    await getAuth().deleteUser(uid);
    return NextResponse.json({ ok: true, deleted: uid });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}