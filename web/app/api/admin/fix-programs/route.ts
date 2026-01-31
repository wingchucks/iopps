import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// POST /api/admin/fix-programs
// Sets isPublished=true on all programs
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "fix-programs-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await db.collection("education_programs").get();
    let updated = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.isPublished !== true) {
        await db.collection("education_programs").doc(doc.id).update({
          isPublished: true,
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      total: snapshot.size,
      updated,
    });

  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      { error: "Fix failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check status
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await db.collection("education_programs").get();
    let published = 0;
    let unpublished = 0;

    snapshot.docs.forEach(doc => {
      if (doc.data().isPublished === true) published++;
      else unpublished++;
    });

    return NextResponse.json({
      total: snapshot.size,
      published,
      unpublished,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
