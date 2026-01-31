import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// GET /api/admin/debug-programs
// Shows all program fields to debug why they're not showing
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await db.collection("education_programs").get();
    
    const programs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        schoolId: data.schoolId,
        isPublished: data.isPublished,
        isActive: data.isActive,
        status: data.status,
        category: data.category,
        level: data.level,
        // Show all keys present
        keys: Object.keys(data),
      };
    });

    return NextResponse.json({
      total: programs.length,
      programs,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
