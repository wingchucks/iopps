import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Export member data (GDPR compliant data portability)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth || !db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get format from query params (json or csv)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Collect all user data
    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId: userId,
    };

    // 1. User account data
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      exportData.account = {
        email: userData?.email || null,
        displayName: userData?.displayName || null,
        role: userData?.role || null,
        createdAt: userData?.createdAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: userData?.lastLoginAt?.toDate?.()?.toISOString() || null,
      };
    }

    // 2. Member profile data
    const memberDoc = await db.collection("members").doc(userId).get();
    if (memberDoc.exists) {
      const memberData = memberDoc.data();
      exportData.profile = {
        displayName: memberData?.displayName || null,
        tagline: memberData?.tagline || null,
        bio: memberData?.bio || null,
        location: memberData?.location || null,
        skills: memberData?.skills || [],
        experience: memberData?.experience || [],
        education: memberData?.education || [],
        portfolio: memberData?.portfolio || [],
        indigenousAffiliation: memberData?.indigenousAffiliation || null,
        availableForInterviews: memberData?.availableForInterviews || null,
        resumeUrl: memberData?.resumeUrl || null,
        coverLetterTemplate: memberData?.coverLetterTemplate || null,
        educationInterests: memberData?.educationInterests || null,
        educationHistory: memberData?.educationHistory || [],
        createdAt: memberData?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: memberData?.updatedAt?.toDate?.()?.toISOString() || null,
      };
    }

    // 3. Job applications
    const applicationsSnap = await db
      .collection("jobApplications")
      .where("memberId", "==", userId)
      .get();

    exportData.jobApplications = applicationsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        jobId: data.jobId,
        status: data.status,
        coverLetter: data.coverLetter || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 4. Saved jobs
    const savedJobsSnap = await db
      .collection("savedJobs")
      .where("memberId", "==", userId)
      .get();

    exportData.savedJobs = savedJobsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        jobId: data.jobId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 5. Scholarship applications
    const scholarshipAppsSnap = await db
      .collection("scholarshipApplications")
      .where("memberId", "==", userId)
      .get();

    exportData.scholarshipApplications = scholarshipAppsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scholarshipId: data.scholarshipId,
        status: data.status,
        essay: data.essay || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 6. Messages (conversations)
    const conversationsSnap = await db
      .collection("conversations")
      .where("participantIds", "array-contains", userId)
      .get();

    exportData.conversations = conversationsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        participantIds: data.participantIds,
        lastMessage: data.lastMessage || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 7. Notifications
    const notificationsSnap = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    exportData.notifications = notificationsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.isRead,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 8. Student inquiries (education pillar)
    const inquiriesSnap = await db
      .collection("studentInquiries")
      .where("studentId", "==", userId)
      .get();

    exportData.educationInquiries = inquiriesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        schoolId: data.schoolId,
        subject: data.subject,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // 9. Event RSVPs
    const rsvpsSnap = await db
      .collection("eventRsvps")
      .where("userId", "==", userId)
      .get();

    exportData.eventRsvps = rsvpsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        eventId: data.eventId,
        eventType: data.eventType,
        status: data.status,
        createdAt: data.rsvpDate?.toDate?.()?.toISOString() || null,
      };
    });

    // 10. Connection requests (social)
    const connectionsSnap = await db
      .collection("connectionRequests")
      .where("requesterId", "==", userId)
      .get();

    const receivedConnectionsSnap = await db
      .collection("connectionRequests")
      .where("recipientId", "==", userId)
      .get();

    exportData.connections = {
      sent: connectionsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          recipientId: data.recipientId,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      }),
      received: receivedConnectionsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          requesterId: data.requesterId,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      }),
    };

    // Return as JSON or CSV
    if (format === "csv") {
      // Convert to CSV format
      const csvRows: string[] = [];

      // Profile data as key-value pairs
      csvRows.push("Section,Field,Value");
      csvRows.push(`Account,Email,"${exportData.account ? (exportData.account as Record<string, unknown>).email || '' : ''}"`);
      csvRows.push(`Account,Display Name,"${exportData.account ? (exportData.account as Record<string, unknown>).displayName || '' : ''}"`);
      csvRows.push(`Account,Role,"${exportData.account ? (exportData.account as Record<string, unknown>).role || '' : ''}"`);

      if (exportData.profile) {
        const profile = exportData.profile as Record<string, unknown>;
        csvRows.push(`Profile,Display Name,"${profile.displayName || ''}"`);
        csvRows.push(`Profile,Location,"${profile.location || ''}"`);
        csvRows.push(`Profile,Bio,"${String(profile.bio || '').replace(/"/g, '""')}"`);
        csvRows.push(`Profile,Skills,"${Array.isArray(profile.skills) ? profile.skills.join(', ') : ''}"`);
        csvRows.push(`Profile,Indigenous Affiliation,"${profile.indigenousAffiliation || ''}"`);
      }

      // Applications
      csvRows.push("");
      csvRows.push("Job Applications");
      csvRows.push("ID,Job ID,Status,Created At");
      (exportData.jobApplications as Array<Record<string, unknown>>).forEach((app) => {
        csvRows.push(`"${app.id}","${app.jobId}","${app.status}","${app.createdAt}"`);
      });

      // Saved Jobs
      csvRows.push("");
      csvRows.push("Saved Jobs");
      csvRows.push("ID,Job ID,Created At");
      (exportData.savedJobs as Array<Record<string, unknown>>).forEach((job) => {
        csvRows.push(`"${job.id}","${job.jobId}","${job.createdAt}"`);
      });

      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="iopps-data-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default: Return as JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="iopps-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting member data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
