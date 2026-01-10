import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import type { EmployerNotificationPreferences } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Default preferences for new employers
const defaultPreferences: EmployerNotificationPreferences = {
  newApplications: true,
  applicationStatusChanges: true,
  jobExpiring: true,
  scheduledJobPublished: true,
  teamInvitations: true,
  teamActivity: false,
  weeklyDigest: true,
  marketingEmails: false,
};

// GET - Get notification preferences
export async function GET(request: NextRequest) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the employer profile
    const employerRef = db.collection("employers").doc(userId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const data = employerDoc.data();
    const preferences = data?.notificationPreferences || defaultPreferences;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the employer profile
    const employerRef = db.collection("employers").doc(userId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "Invalid preferences data" }, { status: 400 });
    }

    // Validate all fields are booleans
    const validatedPreferences: Partial<EmployerNotificationPreferences> = {};
    const validKeys: (keyof EmployerNotificationPreferences)[] = [
      "newApplications",
      "applicationStatusChanges",
      "jobExpiring",
      "scheduledJobPublished",
      "teamInvitations",
      "teamActivity",
      "weeklyDigest",
      "marketingEmails",
    ];

    for (const key of validKeys) {
      if (typeof preferences[key] === "boolean") {
        validatedPreferences[key] = preferences[key];
      }
    }

    // Merge with existing preferences to preserve any not sent in this update
    const existingPreferences = employerDoc.data()?.notificationPreferences || defaultPreferences;
    const updatedPreferences = { ...existingPreferences, ...validatedPreferences };

    await employerRef.update({
      notificationPreferences: updatedPreferences,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
