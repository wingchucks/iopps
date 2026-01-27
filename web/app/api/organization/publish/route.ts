import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  checkProfileCompleteness,
  getMissingFieldsMessage,
} from "@/lib/validation/profile-completeness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Character limits for profile fields
const ABOUT_MAX_CHARS = 750;
const STORY_MAX_CHARS = 500;

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
      badgePreference,
      province,
      city,
      logoUrl,
      bannerUrl,
      description,
      story,
      website,
      enabledModules,
    } = body;

    console.log(`[PUBLISH] Received request for user ${userId}:`, {
      organizationName,
      orgType,
      province,
      city,
      hasLogo: !!logoUrl,
      hasBanner: !!bannerUrl,
      hasDescription: !!description,
      hasStory: !!story,
    });

    if (!organizationName || !orgType) {
      console.log(`[PUBLISH] Missing required fields - organizationName: "${organizationName}", orgType: "${orgType}"`);
      return NextResponse.json(
        { error: "Missing required fields: organizationName and orgType" },
        { status: 400 }
      );
    }

    // Validate field lengths (max limits)
    const aboutTrimmed = (description || "").trim();
    const storyTrimmed = (story || "").trim();

    if (aboutTrimmed.length > ABOUT_MAX_CHARS) {
      console.log(`[PUBLISH] About exceeds limit - ${aboutTrimmed.length} > ${ABOUT_MAX_CHARS}`);
      return NextResponse.json(
        {
          error: `About must be ${ABOUT_MAX_CHARS} characters or less (currently ${aboutTrimmed.length}).`,
          code: "ABOUT_TOO_LONG",
        },
        { status: 400 }
      );
    }

    if (storyTrimmed.length > STORY_MAX_CHARS) {
      console.log(`[PUBLISH] Story exceeds limit - ${storyTrimmed.length} > ${STORY_MAX_CHARS}`);
      return NextResponse.json(
        {
          error: `Our Story must be ${STORY_MAX_CHARS} characters or less (currently ${storyTrimmed.length}).`,
          code: "STORY_TOO_LONG",
        },
        { status: 400 }
      );
    }

    // Check profile completeness using centralized validation
    const profileData = {
      logoUrl,
      bannerUrl,
      description: aboutTrimmed,
      story: storyTrimmed,
    };
    const completeness = checkProfileCompleteness(profileData);

    console.log(`[PUBLISH] Completeness check:`, {
      isComplete: completeness.isComplete,
      missingFields: completeness.missingFields,
      score: completeness.score,
    });

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
      const currentStatus = existingData?.status || "incomplete";
      const isApproved = currentStatus === "approved";
      const isRejectedOrDeleted = currentStatus === "rejected" || currentStatus === "deleted";

      // Determine new status based on completeness (don't change if approved/rejected/deleted)
      let newStatus = currentStatus;
      const wasRejected = currentStatus === "rejected";
      const wasPending = currentStatus === "pending";

      if (!isApproved && !isRejectedOrDeleted) {
        newStatus = completeness.isComplete ? "pending" : "incomplete";
      }
      // If rejected, allow resubmission to pending
      if (wasRejected && completeness.isComplete) {
        newStatus = "pending";
      }

      // Determine publication status
      let publicationStatus: string;
      if (isApproved) {
        publicationStatus = "PUBLISHED";
      } else if (completeness.isComplete) {
        publicationStatus = "PENDING_APPROVAL";
      } else {
        publicationStatus = "DRAFT";
      }

      console.log(`[PUBLISH] Updating existing profile for ${userId}:`, {
        oldName: existingData?.organizationName,
        newName: organizationName,
        docId: existingId,
        currentStatus,
        newStatus,
        isApproved,
        publicationStatus,
      });

      // Determine submission tracking timestamps
      const submissionTracking: Record<string, any> = {};
      if (completeness.isComplete && newStatus === "pending") {
        if (wasRejected) {
          // Resubmission after rejection
          submissionTracking.resubmittedAt = now;
        } else if (!wasPending && !existingData?.submittedForReviewAt) {
          // First-time submission
          submissionTracking.submittedForReviewAt = now;
        }
      }

      await employerRef.update({
        organizationName,
        slug, // Ensure slug is saved
        orgType,
        badgePreference: badgePreference || 'AUTO',
        province: province || "",
        city: city || "",
        location: city && province ? `${city}, ${province}` : province || city || "",
        logoUrl: logoUrl || "",
        bannerUrl: bannerUrl || existingData?.bannerUrl || "",
        description: aboutTrimmed,
        story: storyTrimmed,
        links: { website: website || "" },
        enabledModules: enabledModules || [],
        // Set status based on completeness (preserve approved/rejected/deleted)
        status: newStatus,
        publicationStatus,
        directoryVisible: isApproved, // Only visible if already approved
        publishedAt: isApproved ? now : existingData?.publishedAt || null,
        updatedAt: now,
        // Track cover photo updates for cache busting
        ...(bannerUrl && bannerUrl !== existingData?.bannerUrl ? { bannerUpdatedAt: now } : {}),
        // Track submission times for approval workflow
        ...submissionTracking,
        // Clear rejection reason when resubmitting
        ...(wasRejected && completeness.isComplete ? { rejectionReason: null } : {}),
      });

      // Verify the update by reading the document back
      const verifyDoc = await employerRef.get();
      const verifyData = verifyDoc.data();
      console.log(`[PUBLISH] Verified after update - stored name: "${verifyData?.organizationName}"`);
    } else {
      // Create new profile
      slug = generateUniqueSlug(organizationName);

      // Determine status based on completeness
      const newStatus = completeness.isComplete ? "pending" : "incomplete";
      const publicationStatus = completeness.isComplete ? "PENDING_APPROVAL" : "DRAFT";

      console.log(`[PUBLISH] Creating new profile for ${userId}:`, {
        organizationName,
        newStatus,
        publicationStatus,
        isComplete: completeness.isComplete,
      });

      await employerRef.set({
        id: userId,
        userId,
        organizationName,
        slug,
        orgType,
        badgePreference: badgePreference || 'AUTO',
        province: province || "",
        city: city || "",
        location: city && province ? `${city}, ${province}` : province || city || "",
        logoUrl: logoUrl || "",
        bannerUrl: bannerUrl || "",
        description: aboutTrimmed,
        story: storyTrimmed,
        links: { website: website || "" },
        enabledModules: enabledModules || [],
        publicationStatus, // DRAFT if incomplete, PENDING_APPROVAL if complete
        directoryVisible: false, // Not visible until admin approves
        status: newStatus, // "incomplete" or "pending" based on completeness
        publishedAt: null, // Only set after admin approval
        createdAt: now,
        updatedAt: now,
        // Track submission time for approval workflow
        ...(completeness.isComplete ? { submittedForReviewAt: now } : {}),
        // Track cover photo updates for cache busting
        ...(bannerUrl ? { bannerUpdatedAt: now } : {}),
      });
    }

    // Determine if employer is approved for directory visibility
    const isApproved = employerDoc.exists
      ? (employerDoc.data()?.status || "pending") === "approved"
      : false;

    // Update directory index
    const directoryEntry = {
      id: existingId,
      orgId: existingId,
      name: organizationName,
      slug,
      orgType,
      badgePreference: badgePreference || 'AUTO',
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
      directoryVisible: isApproved, // Only visible if employer is approved
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

    // Ensure slug is never undefined
    if (!slug) {
      console.error(`[PUBLISH] ERROR: slug is undefined for user ${userId}, org "${organizationName}"`);
      slug = generateUniqueSlug(organizationName);
      // Update the employer doc with the generated slug
      await employerRef.update({ slug });
    }

    console.log(`[PUBLISH] User ${userId} published organization "${organizationName}" (${existingId}) with slug "${slug}"`);

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
