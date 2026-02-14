import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// POST /api/admin/fix-scholarship-methods
// Sets applicationMethod='external_link' on all scholarships that have applicationUrl
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "fix-methods-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await db.collection("scholarships").get();
    let updated = 0;
    const updates: { id: string; title: string; before: string | null; after: string }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // If scholarship has applicationUrl but applicationMethod is not 'external_link'
      if (data.applicationUrl && data.applicationMethod !== "external_link") {
        await db.collection("scholarships").doc(doc.id).update({
          applicationMethod: "external_link",
        });
        updates.push({
          id: doc.id,
          title: data.title || data.name,
          before: data.applicationMethod || null,
          after: "external_link",
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      total: snapshot.size,
      updated,
      updates,
    });

  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      { error: "Fix failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check current status
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await db.collection("scholarships").get();
    
    const byMethod: Record<string, number> = {};
    const needsFix: { id: string; title: string; method: string | null; hasUrl: boolean }[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const method = data.applicationMethod || 'none';
      byMethod[method] = (byMethod[method] || 0) + 1;
      
      // Flag any that have URL but wrong method
      if (data.applicationUrl && data.applicationMethod !== "external_link") {
        needsFix.push({
          id: doc.id,
          title: data.title || data.name,
          method: data.applicationMethod || null,
          hasUrl: !!data.applicationUrl,
        });
      }
    });

    return NextResponse.json({
      total: snapshot.size,
      byMethod,
      needsFix: needsFix.length,
      scholarshipsNeedingFix: needsFix,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
