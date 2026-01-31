import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// GET /api/admin/test-programs-query
// Test the exact query used by the programs page
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
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
