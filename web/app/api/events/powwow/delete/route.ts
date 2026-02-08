import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!auth || !db) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get request body
    const body = await req.json();
    const { powwowId } = body;

    if (!powwowId) {
      return NextResponse.json({ error: "Missing powwowId" }, { status: 400 });
    }

    // Get the pow wow document
    const powwowDoc = await db.collection("powwows").doc(powwowId).get();
    if (!powwowDoc.exists) {
      return NextResponse.json({ error: "Pow wow not found" }, { status: 404 });
    }

    const powwowData = powwowDoc.data();

    // Check if user is admin/moderator
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const isAdminOrModerator = userData?.role === "admin" || userData?.role === "moderator";

    // Check if user is owner of the pow wow
    const isOwner = powwowData?.employerId === userId;

    // Only allow deletion if user is owner or admin/moderator
    if (!isOwner && !isAdminOrModerator) {
      return NextResponse.json(
        { error: "You don't have permission to delete this pow wow" },
        { status: 403 }
      );
    }

    // Delete the pow wow
    await db.collection("powwows").doc(powwowId).delete();

    return NextResponse.json({
      success: true,
      message: "Pow wow deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting pow wow:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
