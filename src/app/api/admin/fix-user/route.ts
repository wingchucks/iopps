import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { verifySuperAdminToken } from "@/lib/api-auth";
import { isSuperAdminAccount } from "@/lib/server/super-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const viewer = await verifySuperAdminToken(request);
  if (!viewer.success) return viewer.response;

  try {
    const { uid, password, role } = await request.json();
    if (!uid || typeof uid !== "string") return NextResponse.json({ error: "uid required" }, { status: 400 });
    if (role !== undefined && role !== "admin") {
      return NextResponse.json({ error: "This endpoint repairs ordinary admin accounts only" }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    if (await isSuperAdminAccount(uid, auth)) {
      return NextResponse.json({ error: "Cannot modify super admin account" }, { status: 403 });
    }
    const target = await auth.getUser(uid);

    const updates: Record<string, string> = {};
    if (password) updates.password = password;

    // Update Firebase Auth
    if (password) await auth.updateUser(uid, updates);

    // Set custom claims
    await auth.setCustomUserClaims(uid, { ...target.customClaims, admin: true, role: "admin" });
    await auth.revokeRefreshTokens(uid);

    // Update Firestore role
    await db.collection("users").doc(uid).set({ role: "admin" }, { merge: true });

    return NextResponse.json({ success: true, uid });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
