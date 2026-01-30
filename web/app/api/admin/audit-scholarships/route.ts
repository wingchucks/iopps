import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// GET /api/admin/audit-scholarships
// Shows all scholarships and why they're hidden/visible
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await db.collection("scholarships").get();
    const now = new Date();
    
    const scholarships = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Parse deadline
      let deadline: Date | null = null;
      if (data.deadline) {
        if (typeof data.deadline === 'string') {
          deadline = new Date(data.deadline);
        } else if (data.deadline.toDate) {
          deadline = data.deadline.toDate();
        } else if (data.deadline._seconds) {
          deadline = new Date(data.deadline._seconds * 1000);
        }
      }
      
      const isExpired = deadline ? deadline < now : false;
      const isActive = data.active === true;
      const isVisible = isActive && !isExpired;
      
      let hiddenReason = null;
      if (!isVisible) {
        if (!isActive && isExpired) {
          hiddenReason = "inactive AND expired";
        } else if (!isActive) {
          hiddenReason = "inactive (active !== true)";
        } else if (isExpired) {
          hiddenReason = "expired deadline";
        }
      }
      
      return {
        id: doc.id,
        title: data.title || "Untitled",
        provider: data.provider || data.employerName || "Unknown",
        active: data.active,
        deadline: deadline?.toISOString() || null,
        deadlineRaw: data.deadline,
        isExpired,
        isVisible,
        hiddenReason,
      };
    });

    // Sort: visible first, then by title
    scholarships.sort((a, b) => {
      if (a.isVisible && !b.isVisible) return -1;
      if (!a.isVisible && b.isVisible) return 1;
      return (a.title || "").localeCompare(b.title || "");
    });

    const visible = scholarships.filter(s => s.isVisible);
    const hidden = scholarships.filter(s => !s.isVisible);
    const inactive = scholarships.filter(s => s.active !== true);
    const expired = scholarships.filter(s => s.isExpired);

    return NextResponse.json({
      summary: {
        total: scholarships.length,
        visible: visible.length,
        hidden: hidden.length,
        inactive: inactive.length,
        expired: expired.length,
      },
      visible: visible.map(s => ({ id: s.id, title: s.title, deadline: s.deadline })),
      hidden: hidden.map(s => ({ 
        id: s.id, 
        title: s.title, 
        reason: s.hiddenReason,
        active: s.active,
        deadline: s.deadline 
      })),
    });

  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: "Audit failed", details: String(error) },
      { status: 500 }
    );
  }
}
