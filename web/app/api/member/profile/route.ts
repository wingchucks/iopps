import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth";
import {
  getMemberProfile,
  updateMemberProfile,
  createMemberProfile,
} from "@/lib/firestore/members";

// ---------------------------------------------------------------------------
// Allowed fields for PATCH updates
// ---------------------------------------------------------------------------

const ALLOWED_PATCH_FIELDS: ReadonlySet<string> = new Set([
  "displayName",
  "avatarUrl",
  "coverPhotoUrl",
  "photoURL",
  "tagline",
  "bio",
  "location",
  "skills",
  "experience",
  "experienceSummary",
  "education",
  "educationSummary",
  "portfolio",
  "resumeUrl",
  "coverLetterTemplate",
  "indigenousAffiliation",
  "availableForInterviews",
  "messagingHandle",
  "nation",
  "territory",
  "band",
  "pronouns",
  "memberType",
  "openToWork",
  "jobTypes",
  "preferredLocations",
  "willingToRelocate",
  "experienceLevel",
  "industry",
  "quickApplyEnabled",
  "defaultCoverLetter",
  "wizardDismissed",
  "email",
]);

// ---------------------------------------------------------------------------
// GET /api/member/profile
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await verifyIdToken(request);
  if (!authResult.success) return authResult.response;

  const { uid } = authResult.decodedToken;

  try {
    const profile = await getMemberProfile(uid);

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[GET /api/member/profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/member/profile
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const authResult = await verifyIdToken(request);
  if (!authResult.success) return authResult.response;

  const { uid } = authResult.decodedToken;

  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Filter to only allowed fields to prevent privilege escalation
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Check if profile exists — create if missing
    const existing = await getMemberProfile(uid);

    if (existing) {
      await updateMemberProfile(uid, updates);
    } else {
      await createMemberProfile(uid, updates as Parameters<typeof createMemberProfile>[1]);
    }

    // Return the updated profile
    const updatedProfile = await getMemberProfile(uid);

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("[PATCH /api/member/profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
