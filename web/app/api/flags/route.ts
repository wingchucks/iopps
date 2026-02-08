import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Valid content types and reasons
const VALID_CONTENT_TYPES = ['job', 'vendor', 'product', 'member', 'employer', 'post', 'comment'];
const VALID_REASONS = ['spam', 'inappropriate', 'misleading', 'offensive', 'scam', 'duplicate', 'cultural_concern', 'other'];
const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];
const VALID_ACTIONS = ['none', 'warned', 'removed', 'banned'];

// Submit a new content flag (public - no auth required for anonymous reports)
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await request.json();
    const {
      contentType,
      contentId,
      contentTitle,
      contentPreview,
      reporterEmail,
      reporterName,
      reason,
      reasonDetails,
    } = body;

    // Validate required fields
    if (!contentType || !contentId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: contentType, contentId, reason" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid contentType. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reason
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate and sanitize reasonDetails
    let sanitizedReasonDetails: string | null = null;
    if (reasonDetails) {
      if (typeof reasonDetails !== 'string') {
        return NextResponse.json(
          { error: "reasonDetails must be a string" },
          { status: 400 }
        );
      }
      // Trim whitespace and strip HTML tags
      sanitizedReasonDetails = reasonDetails.trim().replace(/<[^>]*>/g, '');
      if (sanitizedReasonDetails.length === 0) {
        return NextResponse.json(
          { error: "reasonDetails cannot be empty" },
          { status: 400 }
        );
      }
      if (sanitizedReasonDetails.length > 1000) {
        return NextResponse.json(
          { error: "reasonDetails must be 1000 characters or fewer" },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (reporterEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reporterEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    // Check if user is authenticated (optional)
    let reporterId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && auth) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await auth.verifyIdToken(token);
        reporterId = decodedToken.uid;
      } catch {
        // Ignore auth errors - allow anonymous reports
      }
    }

    // Check for duplicate flags from the same reporter
    if (reporterId || reporterEmail) {
      const existingQuery = db.collection("contentFlags")
        .where("contentType", "==", contentType)
        .where("contentId", "==", contentId)
        .where("status", "==", "pending");

      if (reporterId) {
        const existingReporterFlags = await existingQuery.where("reporterId", "==", reporterId).get();
        if (!existingReporterFlags.empty) {
          return NextResponse.json(
            { error: "You have already reported this content" },
            { status: 400 }
          );
        }
      } else if (reporterEmail) {
        const existingEmailFlags = await existingQuery.where("reporterEmail", "==", reporterEmail).get();
        if (!existingEmailFlags.empty) {
          return NextResponse.json(
            { error: "You have already reported this content" },
            { status: 400 }
          );
        }
      }
    }

    // Create the flag
    const flagRef = await db.collection("contentFlags").add({
      contentType,
      contentId,
      contentTitle: contentTitle || null,
      contentPreview: contentPreview || null,
      reporterId: reporterId || null,
      reporterEmail: reporterEmail || null,
      reporterName: reporterName || null,
      reason,
      reasonDetails: sanitizedReasonDetails,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      moderatorNotes: null,
      actionTaken: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      flagId: flagRef.id,
      message: "Content has been flagged for review. Thank you for helping keep our community safe.",
    });
  } catch (error) {
    console.error("Error submitting content flag:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

// Get content flags (admin/moderator only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) return authResult.response;

    if (!db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const userId = authResult.decodedToken.uid;

    // Verify admin/moderator role
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const contentType = searchParams.get("contentType");
    const limitParam = searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : 50;

    // Build query - handle potentially empty/missing collection
    let flags: Array<Record<string, unknown>> = [];
    const counts = {
      total: 0,
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };

    try {
      // First check if collection has any documents
      const collectionRef = db.collection("contentFlags");
      const checkSnap = await collectionRef.limit(1).get();

      if (!checkSnap.empty) {
        // Collection exists and has documents - run the full query
        let queryRef = collectionRef.orderBy("createdAt", "desc");

        if (status && VALID_STATUSES.includes(status)) {
          queryRef = queryRef.where("status", "==", status);
        }

        if (contentType && VALID_CONTENT_TYPES.includes(contentType)) {
          queryRef = queryRef.where("contentType", "==", contentType);
        }

        const flagsSnap = await queryRef.limit(limitNum).get();

        flags = flagsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString(),
          reviewedAt: doc.data().reviewedAt?.toDate?.()?.toISOString(),
        }));

        // Get counts by status
        const allFlagsSnap = await collectionRef.get();
        counts.total = allFlagsSnap.size;

        allFlagsSnap.forEach((doc) => {
          const s = doc.data().status as keyof typeof counts;
          if (counts[s] !== undefined) {
            counts[s]++;
          }
        });
      }
      // If collection is empty, flags and counts remain at defaults (empty/zero)
    } catch (queryError) {
      // Log but don't fail - treat query errors on empty collection as empty result
      console.warn("Query error (possibly missing index or empty collection):", queryError);
    }

    return NextResponse.json({ flags, counts });
  } catch (error) {
    console.error("Error fetching content flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch flags" },
      { status: 500 }
    );
  }
}

// Update flag status (admin/moderator only)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) return authResult.response;

    if (!db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const userId = authResult.decodedToken.uid;

    // Verify admin/moderator role
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { flagId, status, moderatorNotes, actionTaken } = body;

    if (!flagId) {
      return NextResponse.json({ error: "Missing flagId" }, { status: 400 });
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate action if provided
    if (actionTaken && !VALID_ACTIONS.includes(actionTaken)) {
      return NextResponse.json(
        { error: `Invalid actionTaken. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify flag exists
    const flagDoc = await db.collection("contentFlags").doc(flagId).get();
    if (!flagDoc.exists) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status) {
      updateData.status = status;
      if (status !== "pending" && !flagDoc.data()?.reviewedAt) {
        updateData.reviewedAt = FieldValue.serverTimestamp();
        updateData.reviewedBy = userId;
      }
    }

    if (moderatorNotes !== undefined) {
      updateData.moderatorNotes = moderatorNotes;
    }

    if (actionTaken) {
      updateData.actionTaken = actionTaken;
    }

    await db.collection("contentFlags").doc(flagId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating content flag:", error);
    return NextResponse.json(
      { error: "Failed to update flag" },
      { status: 500 }
    );
  }
}
