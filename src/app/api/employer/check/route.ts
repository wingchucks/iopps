import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Check members collection first
    const memberDoc = await adminDb.collection("members").doc(uid).get();
    if (memberDoc.exists) {
      const data = memberDoc.data()!;
      if (data.orgId) {
        return NextResponse.json({
          authorized: true,
          profile: {
            uid,
            email: data.email || "",
            displayName: data.displayName || "",
            orgId: data.orgId,
            orgRole: data.orgRole || "member",
          },
        });
      }
    }

    // Fallback: check users collection for employer
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (userData?.employerId && userData?.role === "employer") {
      return NextResponse.json({
        authorized: true,
        profile: {
          uid,
          email: userData.email || "",
          displayName: userData.displayName || "",
          orgId: userData.employerId,
          orgRole: "owner",
        },
      });
    }

    return NextResponse.json({ authorized: false }, { status: 403 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
