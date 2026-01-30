import { NextRequest, NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebase-admin";

// POST /api/admin/migrate-team-member-ids
// Migrates existing employers to add teamMemberIds array for security rules
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    // Check for admin auth - either Bearer token or one-time migration secret
    const authHeader = request.headers.get("authorization");
    const migrationSecret = request.headers.get("x-migration-secret");
    
    // Allow one-time migration with secret (remove after migration)
    const isSecretValid = migrationSecret === "iopps-team-migration-2026-01-30";
    
    if (!isSecretValid) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const token = authHeader.split("Bearer ")[1];
    
      // Verify admin token
      const { getAuth } = await import("firebase-admin/auth");
      const decodedToken = await getAuth().verifyIdToken(token);
    
      // Check if user is admin
      if (!decodedToken.admin) {
        // Also check user document for admin role
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();
        if (!userData || userData.role !== "admin") {
          return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }
      }
    }

    // Get all employers with teamMembers
    const employersSnapshot = await adminDb.collection("employers").get();
    
    let migrated = 0;
    let skipped = 0;
    let alreadyHasIds = 0;
    const errors: string[] = [];

    for (const doc of employersSnapshot.docs) {
      const data = doc.data();
      
      // Skip if no teamMembers
      if (!data.teamMembers || !Array.isArray(data.teamMembers) || data.teamMembers.length === 0) {
        skipped++;
        continue;
      }

      // Check if teamMemberIds already exists and matches
      const existingIds = data.teamMemberIds || [];
      const memberIds = data.teamMembers.map((m: { id: string }) => m.id).filter(Boolean);
      
      // Check if already synced
      if (existingIds.length === memberIds.length && 
          memberIds.every((id: string) => existingIds.includes(id))) {
        alreadyHasIds++;
        continue;
      }

      try {
        // Update with teamMemberIds
        await adminDb.collection("employers").doc(doc.id).update({
          teamMemberIds: memberIds,
        });
        migrated++;
      } catch (err) {
        errors.push(`Failed to migrate ${doc.id}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration complete",
      stats: {
        total: employersSnapshot.size,
        migrated,
        skipped,
        alreadyHasIds,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check migration status
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const employersSnapshot = await adminDb.collection("employers").get();
    
    let withTeamMembers = 0;
    let withTeamMemberIds = 0;
    let needsMigration = 0;

    for (const doc of employersSnapshot.docs) {
      const data = doc.data();
      
      if (data.teamMembers && Array.isArray(data.teamMembers) && data.teamMembers.length > 0) {
        withTeamMembers++;
        
        if (data.teamMemberIds && Array.isArray(data.teamMemberIds) && data.teamMemberIds.length > 0) {
          withTeamMemberIds++;
        } else {
          needsMigration++;
        }
      }
    }

    return NextResponse.json({
      total: employersSnapshot.size,
      withTeamMembers,
      withTeamMemberIds,
      needsMigration,
      migrationRequired: needsMigration > 0,
    });

  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Status check failed", details: String(error) },
      { status: 500 }
    );
  }
}
