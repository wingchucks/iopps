import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { ScheduledInterview, ScheduledInterviewType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET - List interviews for employer
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

    // Verify employer
    const employerDoc = await db.collection("employers").doc(userId).get();
    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    // Get filter params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const applicationId = searchParams.get("applicationId");

    let query = db
      .collection("scheduledInterviews")
      .where("employerId", "==", userId)
      .orderBy("scheduledAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    if (applicationId) {
      query = db
        .collection("scheduledInterviews")
        .where("applicationId", "==", applicationId)
        .orderBy("scheduledAt", "desc");
    }

    const snapshot = await query.get();
    const interviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}

// POST - Create a new interview
export async function POST(request: NextRequest) {
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

    // Verify employer
    const employerDoc = await db.collection("employers").doc(userId).get();
    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      applicationId,
      scheduledAt,
      duration,
      type,
      location,
      meetingUrl,
      phoneNumber,
      notes,
      interviewerName,
      interviewerEmail,
    } = body;

    // Validate required fields
    if (!applicationId || !scheduledAt || !duration || !type) {
      return NextResponse.json(
        { error: "Missing required fields: applicationId, scheduledAt, duration, type" },
        { status: 400 }
      );
    }

    // Get application details
    const applicationDoc = await db.collection("applications").doc(applicationId).get();
    if (!applicationDoc.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const application = applicationDoc.data();

    // Verify this application belongs to the employer's job
    const jobDoc = await db.collection("jobs").doc(application?.jobId).get();
    if (!jobDoc.exists || jobDoc.data()?.employerId !== userId) {
      return NextResponse.json({ error: "Not authorized to schedule for this application" }, { status: 403 });
    }

    // Get candidate details
    const memberDoc = await db.collection("members").doc(application?.userId).get();
    const member = memberDoc.data();

    const interview: Omit<ScheduledInterview, "id"> = {
      applicationId,
      jobId: application?.jobId,
      employerId: userId,
      candidateId: application?.userId,
      candidateName: member?.fullName || application?.applicantName || "Unknown",
      candidateEmail: member?.email || application?.email || "",
      jobTitle: jobDoc.data()?.title || "Unknown Position",
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
      duration: parseInt(duration),
      type: type as ScheduledInterviewType,
      location,
      meetingUrl,
      phoneNumber,
      status: "scheduled",
      notes,
      interviewerName,
      interviewerEmail,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection("scheduledInterviews").add(interview);

    // Update application status to "interviewing"
    await db.collection("applications").doc(applicationId).update({
      status: "interviewing",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create notification for the candidate
    await db.collection("notifications").add({
      userId: application?.userId,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: `You have an interview scheduled for ${jobDoc.data()?.title} on ${new Date(scheduledAt).toLocaleString()}`,
      read: false,
      data: {
        interviewId: docRef.id,
        applicationId,
        jobId: application?.jobId,
        scheduledAt,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      interview: {
        id: docRef.id,
        ...interview,
      },
    });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 });
  }
}

// PUT - Update an interview
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

    const body = await request.json();
    const { interviewId, ...updates } = body;

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID required" }, { status: 400 });
    }

    // Get the interview
    const interviewDoc = await db.collection("scheduledInterviews").doc(interviewId).get();
    if (!interviewDoc.exists) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = interviewDoc.data();

    // Verify ownership
    if (interview?.employerId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only allow certain fields to be updated
    const allowedFields = [
      "scheduledAt",
      "duration",
      "type",
      "location",
      "meetingUrl",
      "phoneNumber",
      "notes",
      "interviewerName",
      "interviewerEmail",
      "status",
      "cancelReason",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "scheduledAt") {
          updateData[field] = Timestamp.fromDate(new Date(updates[field]));
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    // Handle cancellation
    if (updates.status === "cancelled") {
      updateData.cancelledAt = FieldValue.serverTimestamp();

      // Create notification for candidate
      await db.collection("notifications").add({
        userId: interview?.candidateId,
        type: "interview_cancelled",
        title: "Interview Cancelled",
        message: `Your interview for ${interview?.jobTitle} has been cancelled.${updates.cancelReason ? ` Reason: ${updates.cancelReason}` : ""}`,
        read: false,
        data: {
          interviewId,
          applicationId: interview?.applicationId,
          jobId: interview?.jobId,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Handle rescheduling
    if (updates.status === "rescheduled" && updates.scheduledAt) {
      // Create notification for candidate
      await db.collection("notifications").add({
        userId: interview?.candidateId,
        type: "interview_rescheduled",
        title: "Interview Rescheduled",
        message: `Your interview for ${interview?.jobTitle} has been rescheduled to ${new Date(updates.scheduledAt).toLocaleString()}`,
        read: false,
        data: {
          interviewId,
          applicationId: interview?.applicationId,
          jobId: interview?.jobId,
          newScheduledAt: updates.scheduledAt,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await db.collection("scheduledInterviews").doc(interviewId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating interview:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

// DELETE - Delete an interview
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("id");

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID required" }, { status: 400 });
    }

    // Get the interview
    const interviewDoc = await db.collection("scheduledInterviews").doc(interviewId).get();
    if (!interviewDoc.exists) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interview = interviewDoc.data();

    // Verify ownership
    if (interview?.employerId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.collection("scheduledInterviews").doc(interviewId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 });
  }
}
