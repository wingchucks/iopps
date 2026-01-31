import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// POST /api/admin/fix-scholarships
// Activates all scholarships and updates past deadlines
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    // Simple secret check
    const secret = request.headers.get("x-admin-secret");
    if (secret !== "fix-scholarships-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await db.collection("scholarships").get();
    const now = new Date();
    const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    
    let activated = 0;
    let deadlineUpdated = 0;
    const updates: string[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updateData: Record<string, any> = {};
      
      // Activate if not active
      if (data.active !== true) {
        updateData.active = true;
        activated++;
      }
      
      // Check deadline
      let deadline: Date | null = null;
      try {
        if (data.deadline) {
          if (typeof data.deadline === 'string') {
            deadline = new Date(data.deadline);
          } else if (data.deadline.toDate) {
            deadline = data.deadline.toDate();
          } else if (data.deadline._seconds) {
            deadline = new Date(data.deadline._seconds * 1000);
          }
        }
      } catch {
        deadline = null;
      }
      
      // If deadline is past or invalid, set to 6 months from now
      if (!deadline || isNaN(deadline.getTime()) || deadline < now) {
        updateData.deadline = sixMonthsFromNow.toISOString().split('T')[0]; // YYYY-MM-DD format
        deadlineUpdated++;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.collection("scholarships").doc(doc.id).update(updateData);
        updates.push(`${doc.id}: ${JSON.stringify(updateData)}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: snapshot.size,
      activated,
      deadlineUpdated,
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
    const now = new Date();
    
    let active = 0;
    let inactive = 0;
    let futureDeadline = 0;
    let pastDeadline = 0;
    let invalidDeadline = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (data.active === true) active++;
      else inactive++;
      
      let deadline: Date | null = null;
      try {
        if (data.deadline) {
          if (typeof data.deadline === 'string') {
            deadline = new Date(data.deadline);
          } else if (data.deadline.toDate) {
            deadline = data.deadline.toDate();
          } else if (data.deadline._seconds) {
            deadline = new Date(data.deadline._seconds * 1000);
          }
        }
      } catch {
        deadline = null;
      }
      
      if (!deadline || isNaN(deadline.getTime())) {
        invalidDeadline++;
      } else if (deadline < now) {
        pastDeadline++;
      } else {
        futureDeadline++;
      }
    }

    return NextResponse.json({
      total: snapshot.size,
      active,
      inactive,
      futureDeadline,
      pastDeadline,
      invalidDeadline,
      expectedVisible: Math.min(active, futureDeadline),
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
