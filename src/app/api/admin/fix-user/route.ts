import { NextResponse, type NextRequest } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uid, password, role } = await request.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    const { getAuth } = await import("firebase-admin/auth");
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getAdminDb();

    const updates: Record<string, string> = {};
    if (password) updates.password = password;

    // Update Firebase Auth
    await auth.updateUser(uid, updates);

    // Set custom claims
    await auth.setCustomUserClaims(uid, { admin: true, role: "admin" });

    // Update Firestore role
    if (role) {
      await db.collection("users").doc(uid).set({ role }, { merge: true });
    }

    return NextResponse.json({ success: true, uid });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}