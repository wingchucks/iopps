import { NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Rate limit: max notifications per target user per minute
const RATE_LIMIT_PER_USER = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

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

// Validate that the sender has a legitimate relationship with the target
async function validateNotificationPermission(
  senderId: string,
  targetUserId: string,
  type: NotificationType,
  relatedData: { jobId?: string; applicationId?: string; conversationId?: string; employerId?: string }
): Promise<{ allowed: boolean; reason?: string }> {
  // Users can notify themselves
  if (senderId === targetUserId) {
    return { allowed: true };
  }

  // Check if sender is admin/moderator
  const senderDoc = await db!.collection("users").doc(senderId).get();
  const senderRole = senderDoc.data()?.role;
  if (senderRole === "admin" || senderRole === "moderator") {
    return { allowed: true };
  }

  // For application-related notifications, verify sender is either the applicant or job owner
  if (type === "new_application" || type === "application_status") {
    if (relatedData.applicationId) {
      const appDoc = await db!.collection("applications").doc(relatedData.applicationId).get();
      if (appDoc.exists) {
        const appData = appDoc.data();
        if (appData?.userId === senderId || appData?.employerId === senderId) {
          return { allowed: true };
        }
      }
    }
    if (relatedData.jobId) {
      const jobDoc = await db!.collection("jobs").doc(relatedData.jobId).get();
      if (jobDoc.exists && jobDoc.data()?.employerId === senderId) {
        return { allowed: true };
      }
    }
  }

  // For message-related notifications, verify sender is part of conversation
  if (type === "new_message" && relatedData.conversationId) {
    const convDoc = await db!.collection("conversations").doc(relatedData.conversationId).get();
    if (convDoc.exists) {
      const convData = convDoc.data();
      if (convData?.employerId === senderId || convData?.memberId === senderId) {
        return { allowed: true };
      }
    }
  }

  // For system and other notifications (employer_approved, employer_rejected, scholarship_status),
  // only admins/moderators can send - already checked above

  return { allowed: false, reason: "No valid relationship between sender and target" };
}

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!auth || !db) {
      console.error("Firebase Admin not initialized - check environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authentication - only logged-in users can create notifications
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    const body: CreateNotificationRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      );
    }

    // Rate limiting per target user to prevent notification spam
    const now = Date.now();
    const rateLimitKey = `notify:${body.userId}`;
    const rateLimit = rateLimitMap.get(rateLimitKey);

    if (rateLimit && now < rateLimit.resetTime) {
      if (rateLimit.count >= RATE_LIMIT_PER_USER) {
        console.warn(`[SECURITY] Rate limit exceeded for notifications to user ${body.userId} by sender ${decodedToken.uid}`);
        return NextResponse.json(
          { error: "Too many notifications. Please try again later." },
          { status: 429 }
        );
      }
      rateLimit.count++;
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // Validate sender has permission to notify target user
    const permission = await validateNotificationPermission(
      decodedToken.uid,
      body.userId,
      body.type,
      {
        jobId: body.relatedJobId,
        applicationId: body.relatedApplicationId,
        conversationId: body.relatedConversationId,
        employerId: body.relatedEmployerId,
      }
    );

    if (!permission.allowed) {
      console.warn(`[SECURITY] Unauthorized notification attempt: ${decodedToken.uid} -> ${body.userId}, reason: ${permission.reason}`);
      return NextResponse.json(
        { error: "You don't have permission to send notifications to this user" },
        { status: 403 }
      );
    }

    // Create the notification
    const notificationData = {
      userId: body.userId,
      senderId: decodedToken.uid, // Track who sent it for security
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
