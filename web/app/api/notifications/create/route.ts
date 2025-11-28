import { NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedConversationId?: string;
  relatedEmployerId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only logged-in users can create notifications
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await auth.verifyIdToken(idToken);
    // Note: We verify the caller is authenticated but don't restrict which user
    // they can create notifications for, as notifications are often created for other users
    // (e.g., employer gets notified when member applies to job)
    // The Firestore rules on the triggering action (applications, messages, etc.)
    // provide the actual authorization

    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const body: CreateNotificationRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      );
    }

    // Create the notification
    const notificationData = {
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.message,
      read: false,
      link: body.link || null,
      relatedJobId: body.relatedJobId || null,
      relatedApplicationId: body.relatedApplicationId || null,
      relatedConversationId: body.relatedConversationId || null,
      relatedEmployerId: body.relatedEmployerId || null,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("notifications").add(notificationData);

    return NextResponse.json({
      success: true,
      notificationId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
