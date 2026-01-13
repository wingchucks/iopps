import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Generate URL-friendly slug from organization name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

// Generate unique slug with random suffix
function generateUniqueSlug(name: string): string {
  const baseSlug = generateSlug(name);
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
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

    // Get request body with profile data
    const body = await req.json();
    const {
      organizationName,
      orgType,
      province,
      city,
      logoUrl,
      website,
      enabledModules,
    } = body;

    if (!organizationName || !orgType) {
      return NextResponse.json(
        { error: "Missing required fields: organizationName and orgType" },
        { status: 400 }
      );
    }

    // Check if employer document exists (by ID or by userId field)
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

    const now = FieldValue.serverTimestamp();
    let slug: string;

    if (employerDoc.exists) {
      // Update existing profile
      const existingData = employerDoc.data();
      slug = existingData?.slug || generateUniqueSlug(organizationName);

      await employerRef.update({
        organizationName,
        orgType,
        province: province || "",
        city: city || "",
        location: city && province ? `${city}, ${province}` : province || city || "",
        logoUrl: logoUrl || "",
        links: { website: website || "" },
        enabledModules: enabledModules || [],
        publicationStatus: "PUBLISHED",
        directoryVisible: true,
        publishedAt: now,
        updatedAt: now,
      });
    } else {
      // Create new profile
      slug = generateUniqueSlug(organizationName);

      await employerRef.set({
        id: userId,
        userId,
        organizationName,
        slug,
        orgType,
        province: province || "",
        city: city || "",
        location: city && province ? `${city}, ${province}` : province || city || "",
        logoUrl: logoUrl || "",
        links: { website: website || "" },
        enabledModules: enabledModules || [],
        publicationStatus: "PUBLISHED",
        directoryVisible: true,
        status: "approved",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update directory index
    const directoryEntry = {
      id: existingId,
      orgId: existingId,
      name: organizationName,
      slug,
      orgType,
      province: province || null,
      city: city || null,
      enabledModules: enabledModules || [],
      primaryCTAType: enabledModules?.includes("sell")
        ? "OFFERINGS"
        : enabledModules?.includes("hire")
        ? "JOBS"
        : enabledModules?.includes("educate")
        ? "PROGRAMS"
        : enabledModules?.includes("host")
        ? "EVENTS"
        : "WEBSITE",
      logoUrl: logoUrl || null,
      isIndigenousOwned: orgType === "INDIGENOUS_BUSINESS",
      directoryVisible: true,
      counts: {
        jobsCount: 0,
        programsCount: 0,
        scholarshipsCount: 0,
        offeringsCount: 0,
        eventsCount: 0,
        fundingCount: 0,
      },
      updatedAt: now,
    };

    await db.collection("directory_index").doc(existingId).set(directoryEntry);

    console.log(`[PUBLISH] User ${userId} published organization "${organizationName}" (${existingId})`);

    return NextResponse.json({
      success: true,
      message: "Organization published successfully",
      profileId: existingId,
      slug,
    });
  } catch (error) {
    console.error("Error publishing organization:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
