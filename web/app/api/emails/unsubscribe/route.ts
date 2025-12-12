import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import * as crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Verify an unsubscribe token
function verifyUnsubscribeToken(token: string, email: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [userId, signature] = decoded.split(":");

    if (!userId || !signature) return null;

    // Verify signature (check current day and previous day for timezone edge cases)
    const secret = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "fallback-secret";

    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const dayTimestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - dayOffset;
      const data = `${userId}:${email}:${dayTimestamp}`;
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(data);
      const expectedSignature = hmac.digest("hex").substring(0, 16);

      if (signature === expectedSignature) {
        return userId;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// POST - One-click unsubscribe (from email link)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, type } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    // Verify the token
    const userId = verifyUnsubscribeToken(token, email);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Determine what to unsubscribe from
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    switch (type) {
      case "all":
        updates.unsubscribedAll = true;
        break;
      case "job_alerts":
        updates.jobAlertsEnabled = false;
        break;
      case "conferences":
        updates.conferenceUpdates = false;
        break;
      case "powwows":
        updates.powwowUpdates = false;
        break;
      case "shop":
        updates.shopUpdates = false;
        break;
      case "digest":
        updates.weeklyDigest = false;
        break;
      default:
        // Default to unsubscribing from all marketing
        updates.unsubscribedAll = true;
    }

    // Update or create preferences
    const prefsRef = db.collection("emailPreferences").doc(userId);
    const prefsDoc = await prefsRef.get();

    if (prefsDoc.exists) {
      await prefsRef.update(updates);
    } else {
      await prefsRef.set({
        userId,
        unsubscribedAll: type === "all",
        jobAlertsEnabled: type !== "job_alerts",
        conferenceUpdates: type !== "conferences",
        conferenceFrequency: "weekly",
        conferenceCategories: [],
        powwowUpdates: type !== "powwows",
        powwowFrequency: "weekly",
        powwowRegions: [],
        shopUpdates: type !== "shop",
        shopFrequency: "weekly",
        shopCategories: [],
        weeklyDigest: type !== "digest",
        applicationUpdates: true,
        messageNotifications: true,
        createdAt: new Date(),
        ...updates,
      });
    }

    // Also deactivate job alerts if unsubscribing from job alerts or all
    if (type === "job_alerts" || type === "all") {
      const alertsQuery = db.collection("jobAlerts").where("memberId", "==", userId);
      const alertsSnap = await alertsQuery.get();

      const batch = db.batch();
      alertsSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { active: false });
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}

// GET - Check unsubscribe status (for the unsubscribe page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    const userId = verifyUnsubscribeToken(token, email);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email,
    });
  } catch (error) {
    console.error("Unsubscribe verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify unsubscribe link" },
      { status: 500 }
    );
  }
}
