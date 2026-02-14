import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";

// Mark as dynamic
export const dynamic = "force-dynamic";

// Constants
const FREE_VISIBILITY_DAYS = 45;

/**
 * Generate a deterministic fingerprint for duplicate detection.
 */
function generateFingerprint(
  employerId: string,
  title: string,
  startDate: string | null,
  location: string
): string {
  const normalizedTitle = (title || "").toLowerCase().trim().replace(/\s+/g, " ");
  const normalizedLocation = (location || "").toLowerCase().trim().replace(/\s+/g, " ");
  const city = normalizedLocation.split(",")[0].trim();

  let dateStr = "";
  if (startDate) {
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) {
      dateStr = d.toISOString().split("T")[0];
    }
  }

  const fingerprintInput = `${employerId}|${normalizedTitle}|${dateStr}|${city}`;

  let hash = 5381;
  for (let i = 0; i < fingerprintInput.length; i++) {
    hash = (hash * 33) ^ fingerprintInput.charCodeAt(i);
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

/**
 * POST /api/conferences/publish
 * Publish a conference with server-side visibility enforcement
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    await initAdmin();
    const db = getFirestore();
    const auth = getAuth();

    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { conferenceId, willBeFeatured = false } = body;

    if (!conferenceId) {
      return NextResponse.json({ error: "Conference ID required" }, { status: 400 });
    }

    // Get the conference
    const conferenceRef = db.collection("conferences").doc(conferenceId);
    const conferenceDoc = await conferenceRef.get();

    if (!conferenceDoc.exists) {
      return NextResponse.json({ error: "Conference not found" }, { status: 404 });
    }

    const conference = conferenceDoc.data()!;

    // Verify ownership
    if (conference.employerId !== userId) {
      // Check if admin
      const userDoc = await db.collection("employers").doc(userId).get();
      const userData = userDoc.data();
      if (userData?.email !== "nathan.arias@iopps.ca") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Check if already published
    if (conference.publishedAt) {
      // Already published - just reactivate
      await conferenceRef.update({ active: true });
      return NextResponse.json({
        success: true,
        message: "Conference reactivated",
        alreadyPublished: true,
      });
    }

    // Generate fingerprint
    const startDate = conference.startDate?.toDate?.()
      ? conference.startDate.toDate().toISOString()
      : conference.startDate;

    const fingerprint = generateFingerprint(
      conference.employerId,
      conference.title,
      startDate,
      conference.location
    );

    // Check for duplicate repost (unless featuring)
    if (!willBeFeatured) {
      const historyDocId = `${conference.employerId}_${fingerprint}`;
      const historyRef = db.collection("conference_fingerprint_history").doc(historyDocId);
      const historyDoc = await historyRef.get();

      if (historyDoc.exists) {
        const historyData = historyDoc.data()!;
        const expiresAt = historyData.freeVisibilityExpiresAt?.toDate?.()
          ? historyData.freeVisibilityExpiresAt.toDate()
          : new Date(historyData.freeVisibilityExpiresAt);

        if (historyData.freeVisibilityUsed && expiresAt <= new Date()) {
          return NextResponse.json({
            success: false,
            blocked: true,
            reason: "This conference has already received its free 45-day visibility period.",
            originalConferenceId: historyData.conferenceId,
            originalTitle: historyData.title,
          }, { status: 403 });
        }
      }
    }

    // Set visibility fields
    const now = new Date();
    const freeVisibilityExpiresAt = new Date(now);
    freeVisibilityExpiresAt.setDate(freeVisibilityExpiresAt.getDate() + FREE_VISIBILITY_DAYS);

    // Update conference
    await conferenceRef.update({
      active: true,
      publishedAt: now,
      freeVisibilityExpiresAt,
      eventFingerprint: fingerprint,
      freeVisibilityUsed: true,
      visibilityTier: willBeFeatured ? "featured" : "standard",
    });

    // Record fingerprint history
    const historyDocId = `${conference.employerId}_${fingerprint}`;
    await db.collection("conference_fingerprint_history").doc(historyDocId).set({
      employerId: conference.employerId,
      fingerprint,
      firstPublishedAt: now,
      freeVisibilityExpiresAt,
      freeVisibilityUsed: true,
      conferenceId,
      title: conference.title,
    });

    return NextResponse.json({
      success: true,
      message: "Conference published successfully",
      freeVisibilityExpiresAt: freeVisibilityExpiresAt.toISOString(),
      fingerprint,
    });

  } catch (error) {
    console.error("Error publishing conference:", error);
    return NextResponse.json(
      { error: "Failed to publish conference" },
      { status: 500 }
    );
  }
}
