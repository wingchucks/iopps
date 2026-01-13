import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import type { ScheduledInterview, ScheduledInterviewType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "IOPPS <notifications@iopps.ca>";

// Generate ICS calendar content for email attachment
function generateICSContent(interview: {
  id: string;
  jobTitle: string;
  scheduledAt: Date;
  duration: number;
  type: ScheduledInterviewType;
  meetingUrl?: string;
  phoneNumber?: string;
  location?: string;
  interviewerName?: string;
  notes?: string;
}): string {
  const startDate = interview.scheduledAt;
  const endDate = new Date(startDate.getTime() + interview.duration * 60 * 1000);

  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const location = interview.type === "virtual"
    ? interview.meetingUrl || "Virtual Meeting"
    : interview.type === "phone"
    ? `Phone: ${interview.phoneNumber || "TBD"}`
    : interview.location || "TBD";

  const description = [
    `Interview for: ${interview.jobTitle}`,
    interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : "",
    interview.notes ? `Notes: ${interview.notes}` : "",
    interview.meetingUrl ? `Meeting URL: ${interview.meetingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IOPPS//Interview Scheduler//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${interview.id}@iopps.ca
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Interview - ${interview.jobTitle}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

// Send interview invitation email with calendar attachment
async function sendInterviewInviteEmail(
  candidateEmail: string,
  candidateName: string,
  interview: {
    id: string;
    jobTitle: string;
    scheduledAt: Date;
    duration: number;
    type: ScheduledInterviewType;
    meetingUrl?: string;
    phoneNumber?: string;
    location?: string;
    interviewerName?: string;
    interviewerEmail?: string;
    notes?: string;
  },
  employerName: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Interview Email] Skipped - RESEND_API_KEY not configured");
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const icsContent = generateICSContent(interview);

    const formattedDate = interview.scheduledAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = interview.scheduledAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const typeLabel = interview.type === "virtual" ? "Video Call" : interview.type === "phone" ? "Phone Call" : "In-Person";
    const locationInfo = interview.type === "virtual" && interview.meetingUrl
      ? `<a href="${interview.meetingUrl}" style="color: #14b8a6;">${interview.meetingUrl}</a>`
      : interview.type === "phone" && interview.phoneNumber
      ? `Phone: ${interview.phoneNumber}`
      : interview.type === "in-person" && interview.location
      ? interview.location
      : "Details to be confirmed";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <div style="background: #14b8a6; color: #0f172a; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px;">📅 Interview Scheduled</div>
    <h2 style="color: #14b8a6; margin-top: 0;">Interview Invitation</h2>
    <p>Hi ${candidateName},</p>
    <p>Great news! ${employerName} has scheduled an interview with you for the position of <strong>${interview.jobTitle}</strong>.</p>

    <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0;"><strong style="color: #94a3b8;">Date:</strong> ${formattedDate}</p>
      <p style="margin: 0 0 12px 0;"><strong style="color: #94a3b8;">Time:</strong> ${formattedTime}</p>
      <p style="margin: 0 0 12px 0;"><strong style="color: #94a3b8;">Duration:</strong> ${interview.duration} minutes</p>
      <p style="margin: 0 0 12px 0;"><strong style="color: #94a3b8;">Format:</strong> ${typeLabel}</p>
      <p style="margin: 0;"><strong style="color: #94a3b8;">Location:</strong> ${locationInfo}</p>
      ${interview.interviewerName ? `<p style="margin: 12px 0 0 0;"><strong style="color: #94a3b8;">Interviewer:</strong> ${interview.interviewerName}</p>` : ""}
    </div>

    ${interview.notes ? `<div style="background: #374151; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #14b8a6;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #14b8a6;">Notes from the employer:</p><p style="margin: 0;">${interview.notes}</p></div>` : ""}

    <p style="color: #94a3b8; font-size: 14px;">A calendar invitation is attached to this email. Add it to your calendar to receive reminders.</p>

    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/member/dashboard?tab=applications" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
    </p>

    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Good luck with your interview! 🍀</p>
  </div>
</body>
</html>`;

    const text = `Interview Scheduled\n\nHi ${candidateName},\n\n${employerName} has scheduled an interview with you for ${interview.jobTitle}.\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nDuration: ${interview.duration} minutes\nFormat: ${typeLabel}\n${interview.notes ? `\nNotes: ${interview.notes}` : ""}\n\nView in Dashboard: https://iopps.ca/member/dashboard?tab=applications`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [candidateEmail],
      subject: `📅 Interview Scheduled: ${interview.jobTitle} at ${employerName}`,
      html,
      text,
      attachments: [
        {
          filename: "interview-invite.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    console.log(`[Interview Email] Sent invitation to ${candidateEmail}`);
  } catch (error) {
    console.error("[Interview Email] Failed to send:", error);
  }
}

// Send interview cancellation email
async function sendInterviewCancelledEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  cancelReason?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <div style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px;">Interview Cancelled</div>
    <h2 style="color: #f87171; margin-top: 0;">Interview Cancelled</h2>
    <p>Hi ${candidateName},</p>
    <p>We regret to inform you that your scheduled interview for <strong>${jobTitle}</strong> has been cancelled.</p>
    ${cancelReason ? `<div style="background: #374151; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #94a3b8;">Reason:</p><p style="margin: 0;">${cancelReason}</p></div>` : ""}
    <p style="color: #94a3b8;">The employer may reach out to reschedule. In the meantime, you can view your applications in your dashboard.</p>
    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/member/dashboard?tab=applications" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Applications</a>
    </p>
  </div>
</body>
</html>`;

    const text = `Interview Cancelled\n\nHi ${candidateName},\n\nYour scheduled interview for ${jobTitle} has been cancelled.${cancelReason ? `\n\nReason: ${cancelReason}` : ""}\n\nView Applications: https://iopps.ca/member/dashboard?tab=applications`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [candidateEmail],
      subject: `Interview Cancelled: ${jobTitle}`,
      html,
      text,
    });

    console.log(`[Interview Email] Sent cancellation to ${candidateEmail}`);
  } catch (error) {
    console.error("[Interview Email] Failed to send cancellation:", error);
  }
}

// Send interview rescheduled email with new calendar invite
async function sendInterviewRescheduledEmail(
  candidateEmail: string,
  candidateName: string,
  interview: {
    id: string;
    jobTitle: string;
    scheduledAt: Date;
    duration: number;
    type: ScheduledInterviewType;
    meetingUrl?: string;
    phoneNumber?: string;
    location?: string;
    interviewerName?: string;
    notes?: string;
  },
  employerName: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const icsContent = generateICSContent(interview);

    const formattedDate = interview.scheduledAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = interview.scheduledAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const typeLabel = interview.type === "virtual" ? "Video Call" : interview.type === "phone" ? "Phone Call" : "In-Person";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <div style="background: #f59e0b; color: #0f172a; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px;">📅 Interview Rescheduled</div>
    <h2 style="color: #f59e0b; margin-top: 0;">Interview Rescheduled</h2>
    <p>Hi ${candidateName},</p>
    <p>Your interview for <strong>${interview.jobTitle}</strong> at ${employerName} has been rescheduled.</p>

    <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0;"><strong style="color: #f59e0b;">NEW DATE:</strong> ${formattedDate}</p>
      <p style="margin: 0 0 12px 0;"><strong style="color: #f59e0b;">NEW TIME:</strong> ${formattedTime}</p>
      <p style="margin: 0 0 12px 0;"><strong style="color: #94a3b8;">Duration:</strong> ${interview.duration} minutes</p>
      <p style="margin: 0;"><strong style="color: #94a3b8;">Format:</strong> ${typeLabel}</p>
    </div>

    <p style="color: #94a3b8; font-size: 14px;">An updated calendar invitation is attached. Please add it to your calendar.</p>

    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/member/dashboard?tab=applications" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
    </p>
  </div>
</body>
</html>`;

    const text = `Interview Rescheduled\n\nHi ${candidateName},\n\nYour interview for ${interview.jobTitle} at ${employerName} has been rescheduled.\n\nNEW DATE: ${formattedDate}\nNEW TIME: ${formattedTime}\nDuration: ${interview.duration} minutes\n\nView in Dashboard: https://iopps.ca/member/dashboard?tab=applications`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [candidateEmail],
      subject: `📅 Interview Rescheduled: ${interview.jobTitle}`,
      html,
      text,
      attachments: [
        {
          filename: "interview-invite-updated.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    console.log(`[Interview Email] Sent reschedule notification to ${candidateEmail}`);
  } catch (error) {
    console.error("[Interview Email] Failed to send reschedule:", error);
  }
}

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

    const interview = {
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
      status: "scheduled" as const,
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

    // Send email with calendar invite to candidate
    const employerData = employerDoc.data();
    const candidateEmail = member?.email || application?.memberEmail || application?.email;
    if (candidateEmail) {
      await sendInterviewInviteEmail(
        candidateEmail,
        interview.candidateName,
        {
          id: docRef.id,
          jobTitle: interview.jobTitle,
          scheduledAt: new Date(scheduledAt),
          duration: interview.duration,
          type: interview.type,
          meetingUrl,
          phoneNumber,
          location,
          interviewerName,
          interviewerEmail,
          notes,
        },
        employerData?.organizationName || employerData?.companyName || "Employer"
      );
    }

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

      // Send cancellation email
      if (interview?.candidateEmail) {
        await sendInterviewCancelledEmail(
          interview.candidateEmail,
          interview.candidateName || "Candidate",
          interview.jobTitle || "Position",
          updates.cancelReason
        );
      }
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

      // Send reschedule email with new calendar invite
      if (interview?.candidateEmail) {
        // Get employer info for the email
        const employerDoc = await db.collection("employers").doc(userId).get();
        const employerData = employerDoc.data();

        await sendInterviewRescheduledEmail(
          interview.candidateEmail,
          interview.candidateName || "Candidate",
          {
            id: interviewId,
            jobTitle: interview.jobTitle || "Position",
            scheduledAt: new Date(updates.scheduledAt),
            duration: updates.duration || interview.duration || 30,
            type: updates.type || interview.type || "virtual",
            meetingUrl: updates.meetingUrl || interview.meetingUrl,
            phoneNumber: updates.phoneNumber || interview.phoneNumber,
            location: updates.location || interview.location,
            interviewerName: updates.interviewerName || interview.interviewerName,
            notes: updates.notes || interview.notes,
          },
          employerData?.organizationName || employerData?.companyName || "Employer"
        );
      }
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
