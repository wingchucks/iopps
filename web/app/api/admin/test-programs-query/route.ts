/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

// GET /api/admin/test-programs-query
// Test the exact query used by the programs page
export async function GET(req: NextRequest) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin" && userData?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Replicate the query from listEducationPrograms
    const snapshot = await db.collection("education_programs")
      .where("isPublished", "==", true)
      .orderBy("name", "asc")
      .get();
    
    const programs = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      isPublished: doc.data().isPublished,
    }));

    return NextResponse.json({
      total: programs.length,
      programs,
    });

  } catch (error: any) {
    // Check if it's an index error
    return NextResponse.json({ 
      error: String(error),
      code: error?.code,
      message: error?.message,
    }, { status: 500 });
  }
}
