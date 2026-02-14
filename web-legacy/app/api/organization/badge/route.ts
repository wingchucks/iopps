import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { OrgType, OrganizationModule } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Derive orgType from modules (for auto-detection)
function deriveOrgType(modules: OrganizationModule[], badge: OrgType | 'AUTO'): OrgType {
  if (badge !== 'AUTO') return badge;

  // Auto-derive based on modules
  if (modules.includes('educate') && !modules.includes('hire') && !modules.includes('sell')) {
    return 'SCHOOL';
  }
  if (modules.includes('sell') && !modules.includes('hire')) {
    return 'INDIGENOUS_BUSINESS';
  }
  if (modules.includes('hire') && !modules.includes('sell')) {
    return 'EMPLOYER';
  }
  return 'OTHER'; // Multi-capability org
}

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
    const { badgePreference } = body;

    if (!badgePreference) {
      return NextResponse.json(
        { error: "Missing badgePreference" },
        { status: 400 }
      );
    }

    // Validate badge preference
    const validBadges = ['AUTO', 'EMPLOYER', 'INDIGENOUS_BUSINESS', 'SCHOOL', 'NONPROFIT', 'GOVERNMENT', 'OTHER'];
    if (!validBadges.includes(badgePreference)) {
      return NextResponse.json(
        { error: "Invalid badge preference" },
        { status: 400 }
      );
    }

    // Find employer document
    let employerRef = db.collection("employers").doc(userId);
    let employerDoc = await employerRef.get();
    let existingId = userId;

    // If not found by ID, search by userId field
    if (!employerDoc.exists) {
      const querySnapshot = await db
        .collection("employers")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        employerDoc = querySnapshot.docs[0];
        existingId = employerDoc.id;
        employerRef = db.collection("employers").doc(existingId);
      }
    }

    if (!employerDoc.exists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const existingData = employerDoc.data();
    const enabledModules = existingData?.enabledModules || [];
    const derivedOrgType = deriveOrgType(enabledModules, badgePreference);

    const now = FieldValue.serverTimestamp();

    // Update employer profile
    await employerRef.update({
      badgePreference,
      orgType: derivedOrgType,
      updatedAt: now,
    });

    // Update directory index
    await db.collection("directory_index").doc(existingId).update({
      badgePreference,
      orgType: derivedOrgType,
      isIndigenousOwned: derivedOrgType === 'INDIGENOUS_BUSINESS',
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      badgePreference,
      orgType: derivedOrgType,
    });
  } catch (error) {
    console.error("Error updating badge:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
