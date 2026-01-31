import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// GET /api/admin/audit-scholarship-links
// Check which scholarships are missing application URLs
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const snapshot = await db.collection("scholarships").get();
    
    const scholarships = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || data.name,
        applicationUrl: data.applicationUrl || data.applyUrl || data.url || null,
        applicationMethod: data.applicationMethod || null,
        applicationEmail: data.applicationEmail || null,
        websiteUrl: data.websiteUrl || data.website || null,
        active: data.active,
      };
    });

    const withLinks = scholarships.filter(s => s.applicationUrl);
    const missingLinks = scholarships.filter(s => !s.applicationUrl);
    
    // Count by application method
    const byMethod: Record<string, number> = {};
    scholarships.forEach(s => {
      const method = s.applicationMethod || 'none';
      byMethod[method] = (byMethod[method] || 0) + 1;
    });
    
    // Flag scholarships that might allow internal applications
    const potentialInternalApps = scholarships.filter(s => 
      !s.applicationMethod || 
      (s.applicationMethod !== 'external_link' && s.applicationMethod !== 'email')
    );

    return NextResponse.json({
      total: scholarships.length,
      withLinks: withLinks.length,
      missingLinks: missingLinks.length,
      byMethod,
      potentialInternalApps: potentialInternalApps.length,
      needsReview: potentialInternalApps,
      missing: missingLinks,
      all: scholarships,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
