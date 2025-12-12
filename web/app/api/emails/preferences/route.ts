import { NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase-admin";
import type { EmailPreferences } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Default preferences for new users
const DEFAULT_PREFERENCES: Omit<EmailPreferences, "id" | "userId" | "createdAt" | "updatedAt"> = {
  unsubscribedAll: false,
  jobAlertsEnabled: true,
  conferenceUpdates: true,
  conferenceFrequency: "weekly",
  conferenceCategories: [],
  powwowUpdates: true,
  powwowFrequency: "weekly",
  powwowRegions: [],
  shopUpdates: true,
  shopFrequency: "weekly",
  shopCategories: [],
  weeklyDigest: true,
  applicationUpdates: true,
  messageNotifications: true,
};

// GET - Retrieve user's email preferences
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Get or create preferences
    const prefsDoc = await db.collection("emailPreferences").doc(userId).get();

    if (prefsDoc.exists) {
      return NextResponse.json({
        preferences: {
          id: prefsDoc.id,
          ...prefsDoc.data(),
        },
      });
    }

    // Create default preferences for new user
    const newPrefs = {
      userId,
      ...DEFAULT_PREFERENCES,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("emailPreferences").doc(userId).set(newPrefs);

    return NextResponse.json({
      preferences: {
        id: userId,
        ...newPrefs,
      },
    });
  } catch (error) {
    console.error("Error fetching email preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch email preferences" },
      { status: 500 }
    );
  }
}

// PUT - Update user's email preferences
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json();

    // Validate and sanitize input
    const allowedFields = [
      "unsubscribedAll",
      "jobAlertsEnabled",
      "conferenceUpdates",
      "conferenceFrequency",
      "conferenceCategories",
      "powwowUpdates",
      "powwowFrequency",
      "powwowRegions",
      "shopUpdates",
      "shopFrequency",
      "shopCategories",
      "weeklyDigest",
      "applicationUpdates",
      "messageNotifications",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    // Check if document exists
    const prefsRef = db.collection("emailPreferences").doc(userId);
    const prefsDoc = await prefsRef.get();

    if (prefsDoc.exists) {
      await prefsRef.update(updates);
    } else {
      // Create with defaults + updates
      await prefsRef.set({
        userId,
        ...DEFAULT_PREFERENCES,
        ...updates,
        createdAt: new Date(),
      });
    }

    // Fetch updated document
    const updatedDoc = await prefsRef.get();

    return NextResponse.json({
      success: true,
      preferences: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error updating email preferences:", error);
    return NextResponse.json(
      { error: "Failed to update email preferences" },
      { status: 500 }
    );
  }
}
