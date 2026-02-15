import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Admin email (should match your admin check elsewhere)
const ADMIN_EMAIL = "nathan.arias@iopps.ca";

/**
 * GET /api/admin/conference-visibility?conferenceId=xxx
 * Debug endpoint to view conference visibility status
 */
export async function GET(request: NextRequest) {
  try {
    await initAdmin();
    const db = getFirestore();
    const auth = getAuth();

    // Verify admin authentication
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

    // Check admin status
    const userRecord = await auth.getUser(decodedToken.uid);
    if (userRecord.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conferenceId = searchParams.get("conferenceId");

    if (!conferenceId) {
      // List all conferences with visibility info
      const conferencesSnap = await db.collection("conferences")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const conferences = conferencesSnap.docs.map(doc => {
        const data = doc.data();
        const now = new Date();

        // Compute visibility tier
        let computedTier = "standard";
        if (data.featured) {
          const featuredExpires = data.featuredExpiresAt?.toDate?.() || null;
          if (!featuredExpires || featuredExpires > now) {
            computedTier = "featured";
          } else {
            // Featured expired
            const freeExpires = data.freeVisibilityExpiresAt?.toDate?.() || null;
            if (freeExpires && freeExpires <= now) {
              computedTier = "demoted";
            }
          }
        } else {
          const freeExpires = data.freeVisibilityExpiresAt?.toDate?.() || null;
          if (freeExpires && freeExpires <= now) {
            computedTier = "demoted";
          }
        }

        return {
          id: doc.id,
          title: data.title,
          employerId: data.employerId,
          active: data.active,
          publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
          freeVisibilityExpiresAt: data.freeVisibilityExpiresAt?.toDate?.()?.toISOString() || null,
          featuredExpiresAt: data.featuredExpiresAt?.toDate?.()?.toISOString() || null,
          fingerprint: data.eventFingerprint || null,
          featured: data.featured || false,
          storedTier: data.visibilityTier || null,
          computedTier,
          visibleInListings: computedTier !== "demoted" && data.active,
        };
      });

      return NextResponse.json({
        count: conferences.length,
        conferences,
      });
    }

    // Get specific conference
    const conferenceDoc = await db.collection("conferences").doc(conferenceId).get();

    if (!conferenceDoc.exists) {
      return NextResponse.json({ error: "Conference not found" }, { status: 404 });
    }

    const data = conferenceDoc.data()!;
    const now = new Date();

    // Compute visibility tier
    let computedTier = "standard";
    let reason = "Default - not yet published or no visibility data";

    if (data.featured) {
      const featuredExpires = data.featuredExpiresAt?.toDate?.() || null;
      if (!featuredExpires || featuredExpires > now) {
        computedTier = "featured";
        reason = featuredExpires
          ? `Featured until ${featuredExpires.toISOString()}`
          : "Featured (no expiry set)";
      } else {
        const freeExpires = data.freeVisibilityExpiresAt?.toDate?.() || null;
        if (freeExpires && freeExpires <= now) {
          computedTier = "demoted";
          reason = `Featured expired ${featuredExpires.toISOString()}, free visibility expired ${freeExpires.toISOString()}`;
        } else {
          reason = `Featured expired ${featuredExpires.toISOString()}, free visibility active until ${freeExpires?.toISOString() || "unknown"}`;
        }
      }
    } else if (data.publishedAt) {
      const freeExpires = data.freeVisibilityExpiresAt?.toDate?.() || null;
      if (freeExpires && freeExpires <= now) {
        computedTier = "demoted";
        reason = `Free visibility expired ${freeExpires.toISOString()}`;
      } else {
        reason = `Free visibility active until ${freeExpires?.toISOString() || "unknown"}`;
      }
    }

    // Get fingerprint history
    let fingerprintHistory = null;
    if (data.eventFingerprint && data.employerId) {
      const historyDocId = `${data.employerId}_${data.eventFingerprint}`;
      const historyDoc = await db.collection("conference_fingerprint_history").doc(historyDocId).get();
      if (historyDoc.exists) {
        const historyData = historyDoc.data()!;
        fingerprintHistory = {
          firstPublishedAt: historyData.firstPublishedAt?.toDate?.()?.toISOString() || null,
          freeVisibilityExpiresAt: historyData.freeVisibilityExpiresAt?.toDate?.()?.toISOString() || null,
          freeVisibilityUsed: historyData.freeVisibilityUsed,
          originalConferenceId: historyData.conferenceId,
          originalTitle: historyData.title,
        };
      }
    }

    return NextResponse.json({
      id: conferenceId,
      title: data.title,
      employerId: data.employerId,
      active: data.active,
      startDate: data.startDate?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      freeVisibilityExpiresAt: data.freeVisibilityExpiresAt?.toDate?.()?.toISOString() || null,
      featuredExpiresAt: data.featuredExpiresAt?.toDate?.()?.toISOString() || null,
      fingerprint: data.eventFingerprint || null,
      featured: data.featured || false,
      featurePlan: data.featurePlan || null,
      storedVisibilityTier: data.visibilityTier || null,
      computedVisibilityTier: computedTier,
      visibilityReason: reason,
      visibleInListings: computedTier !== "demoted" && data.active,
      fingerprintHistory,
    });

  } catch (error) {
    console.error("Error in conference visibility debug:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
