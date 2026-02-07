import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const ALL_CATEGORIES = [
  "account",
  "profile",
  "jobApplications",
  "savedJobs",
  "scholarshipApplications",
  "conversations",
  "notifications",
  "educationInquiries",
  "eventRsvps",
  "connections",
  "endorsements",
  "posts",
  "settings",
  "notificationPreferences",
  "jobAlerts",
  "savedTraining",
];

function escCsv(val: unknown): string {
  const s = String(val ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

// Export member data (OCAP/CARE compliant data portability)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) return authResult.response;

    if (!db) {
      return NextResponse.json({ error: "Not initialized" }, { status: 500 });
    }

    const userId = authResult.decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const categoriesParam = searchParams.get("categories");
    const selectedCategories = categoriesParam
      ? categoriesParam.split(",").filter((c) => ALL_CATEGORIES.includes(c))
      : ALL_CATEGORIES;

    const has = (cat: string) => selectedCategories.includes(cat);

    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId: userId,
    };

    // 1. User account data
    if (has("account")) {
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
    }

    // 2. Member profile data
    if (has("profile")) {
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
    }

    // 3. Job applications
    if (has("jobApplications")) {
      const applicationsSnap = await db
        .collection("jobApplications")
        .where("memberId", "==", userId)
        .get();

      exportData.jobApplications = applicationsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          jobId: data.jobId,
          status: data.status,
          coverLetter: data.coverLetter || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 4. Saved jobs
    if (has("savedJobs")) {
      const savedJobsSnap = await db
        .collection("savedJobs")
        .where("memberId", "==", userId)
        .get();

      exportData.savedJobs = savedJobsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          jobId: data.jobId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 5. Scholarship applications
    if (has("scholarshipApplications")) {
      const scholarshipAppsSnap = await db
        .collection("scholarshipApplications")
        .where("memberId", "==", userId)
        .get();

      exportData.scholarshipApplications = scholarshipAppsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          scholarshipId: data.scholarshipId,
          status: data.status,
          essay: data.essay || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 6. Messages (conversations)
    if (has("conversations")) {
      const conversationsSnap = await db
        .collection("conversations")
        .where("participantIds", "array-contains", userId)
        .get();

      exportData.conversations = conversationsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          participantIds: data.participantIds,
          lastMessage: data.lastMessage || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 7. Notifications
    if (has("notifications")) {
      const notificationsSnap = await db
        .collection("notifications")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      exportData.notifications = notificationsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: data.isRead,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 8. Student inquiries (education pillar)
    if (has("educationInquiries")) {
      const inquiriesSnap = await db
        .collection("studentInquiries")
        .where("studentId", "==", userId)
        .get();

      exportData.educationInquiries = inquiriesSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          schoolId: data.schoolId,
          subject: data.subject,
          message: data.message,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 9. Event RSVPs
    if (has("eventRsvps")) {
      const rsvpsSnap = await db
        .collection("eventRsvps")
        .where("userId", "==", userId)
        .get();

      exportData.eventRsvps = rsvpsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          eventId: data.eventId,
          eventType: data.eventType,
          status: data.status,
          createdAt: data.rsvpDate?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 10. Connection requests (social)
    if (has("connections")) {
      const connectionsSnap = await db
        .collection("connectionRequests")
        .where("requesterId", "==", userId)
        .get();

      const receivedConnectionsSnap = await db
        .collection("connectionRequests")
        .where("recipientId", "==", userId)
        .get();

      exportData.connections = {
        sent: connectionsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            recipientId: data.recipientId,
            status: data.status,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          };
        }),
        received: receivedConnectionsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            requesterId: data.requesterId,
            status: data.status,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          };
        }),
      };
    }

    // 11. Endorsements (NEW)
    if (has("endorsements")) {
      const receivedSnap = await db
        .collection("endorsements")
        .where("endorseeId", "==", userId)
        .get();

      const givenSnap = await db
        .collection("endorsements")
        .where("endorserId", "==", userId)
        .get();

      exportData.endorsements = {
        received: receivedSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            endorserId: data.endorserId,
            skill: data.skill,
            message: data.message || null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          };
        }),
        given: givenSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            endorseeId: data.endorseeId,
            skill: data.skill,
            message: data.message || null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          };
        }),
      };
    }

    // 12. Social posts (NEW)
    if (has("posts")) {
      const postsSnap = await db
        .collection("posts")
        .where("authorId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

      exportData.posts = postsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          content: data.content || null,
          type: data.type || null,
          likes: data.likes || 0,
          commentCount: data.commentCount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 13. Member settings (NEW)
    if (has("settings")) {
      const settingsDoc = await db
        .collection("member_settings")
        .doc(userId)
        .get();
      if (settingsDoc.exists) {
        exportData.settings = settingsDoc.data();
      }
    }

    // 14. Notification preferences (NEW)
    if (has("notificationPreferences")) {
      const notifPrefsDoc = await db
        .collection("notificationPreferences")
        .doc(userId)
        .get();
      if (notifPrefsDoc.exists) {
        exportData.notificationPreferences = notifPrefsDoc.data();
      }
    }

    // 15. Job alerts (NEW)
    if (has("jobAlerts")) {
      const jobAlertsSnap = await db
        .collection("jobAlerts")
        .where("memberId", "==", userId)
        .get();

      exportData.jobAlerts = jobAlertsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          keywords: data.keywords || null,
          location: data.location || null,
          category: data.category || null,
          frequency: data.frequency || null,
          active: data.active ?? true,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // 16. Saved training programs (NEW)
    if (has("savedTraining")) {
      const savedTrainingSnap = await db
        .collection("savedTraining")
        .where("memberId", "==", userId)
        .get();

      exportData.savedTraining = savedTrainingSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          programId: data.programId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      });
    }

    // Return as JSON or CSV
    if (format === "csv") {
      const csvRows: string[] = [];

      // Account & Profile section
      csvRows.push("Section,Field,Value");
      if (exportData.account) {
        const acct = exportData.account as Record<string, unknown>;
        csvRows.push(`Account,Email,${escCsv(acct.email)}`);
        csvRows.push(`Account,Display Name,${escCsv(acct.displayName)}`);
        csvRows.push(`Account,Role,${escCsv(acct.role)}`);
      }

      if (exportData.profile) {
        const profile = exportData.profile as Record<string, unknown>;
        csvRows.push(`Profile,Display Name,${escCsv(profile.displayName)}`);
        csvRows.push(`Profile,Location,${escCsv(profile.location)}`);
        csvRows.push(`Profile,Bio,${escCsv(profile.bio)}`);
        csvRows.push(`Profile,Skills,${escCsv(Array.isArray(profile.skills) ? profile.skills.join(", ") : "")}`);
        csvRows.push(`Profile,Indigenous Affiliation,${escCsv(profile.indigenousAffiliation)}`);
      }

      // Job Applications
      if (exportData.jobApplications) {
        csvRows.push("");
        csvRows.push("Job Applications");
        csvRows.push("ID,Job ID,Status,Created At");
        (exportData.jobApplications as Array<Record<string, unknown>>).forEach((app) => {
          csvRows.push(`${escCsv(app.id)},${escCsv(app.jobId)},${escCsv(app.status)},${escCsv(app.createdAt)}`);
        });
      }

      // Saved Jobs
      if (exportData.savedJobs) {
        csvRows.push("");
        csvRows.push("Saved Jobs");
        csvRows.push("ID,Job ID,Created At");
        (exportData.savedJobs as Array<Record<string, unknown>>).forEach((job) => {
          csvRows.push(`${escCsv(job.id)},${escCsv(job.jobId)},${escCsv(job.createdAt)}`);
        });
      }

      // Scholarship Applications
      if (exportData.scholarshipApplications) {
        csvRows.push("");
        csvRows.push("Scholarship Applications");
        csvRows.push("ID,Scholarship ID,Status,Created At");
        (exportData.scholarshipApplications as Array<Record<string, unknown>>).forEach((app) => {
          csvRows.push(`${escCsv(app.id)},${escCsv(app.scholarshipId)},${escCsv(app.status)},${escCsv(app.createdAt)}`);
        });
      }

      // Conversations
      if (exportData.conversations) {
        csvRows.push("");
        csvRows.push("Conversations");
        csvRows.push("ID,Participants,Last Message,Created At");
        (exportData.conversations as Array<Record<string, unknown>>).forEach((conv) => {
          csvRows.push(`${escCsv(conv.id)},${escCsv(Array.isArray(conv.participantIds) ? conv.participantIds.join("; ") : "")},${escCsv(conv.lastMessage)},${escCsv(conv.createdAt)}`);
        });
      }

      // Notifications
      if (exportData.notifications) {
        csvRows.push("");
        csvRows.push("Notifications");
        csvRows.push("ID,Type,Title,Message,Read,Created At");
        (exportData.notifications as Array<Record<string, unknown>>).forEach((n) => {
          csvRows.push(`${escCsv(n.id)},${escCsv(n.type)},${escCsv(n.title)},${escCsv(n.message)},${escCsv(n.isRead)},${escCsv(n.createdAt)}`);
        });
      }

      // Education Inquiries
      if (exportData.educationInquiries) {
        csvRows.push("");
        csvRows.push("Education Inquiries");
        csvRows.push("ID,School ID,Subject,Message,Status,Created At");
        (exportData.educationInquiries as Array<Record<string, unknown>>).forEach((inq) => {
          csvRows.push(`${escCsv(inq.id)},${escCsv(inq.schoolId)},${escCsv(inq.subject)},${escCsv(inq.message)},${escCsv(inq.status)},${escCsv(inq.createdAt)}`);
        });
      }

      // Event RSVPs
      if (exportData.eventRsvps) {
        csvRows.push("");
        csvRows.push("Event RSVPs");
        csvRows.push("ID,Event ID,Event Type,Status,Created At");
        (exportData.eventRsvps as Array<Record<string, unknown>>).forEach((rsvp) => {
          csvRows.push(`${escCsv(rsvp.id)},${escCsv(rsvp.eventId)},${escCsv(rsvp.eventType)},${escCsv(rsvp.status)},${escCsv(rsvp.createdAt)}`);
        });
      }

      // Connections
      if (exportData.connections) {
        const conn = exportData.connections as Record<string, Array<Record<string, unknown>>>;
        csvRows.push("");
        csvRows.push("Connections Sent");
        csvRows.push("ID,Recipient ID,Status,Created At");
        (conn.sent || []).forEach((c) => {
          csvRows.push(`${escCsv(c.id)},${escCsv(c.recipientId)},${escCsv(c.status)},${escCsv(c.createdAt)}`);
        });
        csvRows.push("");
        csvRows.push("Connections Received");
        csvRows.push("ID,Requester ID,Status,Created At");
        (conn.received || []).forEach((c) => {
          csvRows.push(`${escCsv(c.id)},${escCsv(c.requesterId)},${escCsv(c.status)},${escCsv(c.createdAt)}`);
        });
      }

      // Endorsements
      if (exportData.endorsements) {
        const end = exportData.endorsements as Record<string, Array<Record<string, unknown>>>;
        csvRows.push("");
        csvRows.push("Endorsements Received");
        csvRows.push("ID,Endorser ID,Skill,Message,Created At");
        (end.received || []).forEach((e) => {
          csvRows.push(`${escCsv(e.id)},${escCsv(e.endorserId)},${escCsv(e.skill)},${escCsv(e.message)},${escCsv(e.createdAt)}`);
        });
        csvRows.push("");
        csvRows.push("Endorsements Given");
        csvRows.push("ID,Endorsee ID,Skill,Message,Created At");
        (end.given || []).forEach((e) => {
          csvRows.push(`${escCsv(e.id)},${escCsv(e.endorseeId)},${escCsv(e.skill)},${escCsv(e.message)},${escCsv(e.createdAt)}`);
        });
      }

      // Posts
      if (exportData.posts) {
        csvRows.push("");
        csvRows.push("Social Posts");
        csvRows.push("ID,Content,Type,Likes,Comments,Created At");
        (exportData.posts as Array<Record<string, unknown>>).forEach((p) => {
          csvRows.push(`${escCsv(p.id)},${escCsv(p.content)},${escCsv(p.type)},${escCsv(p.likes)},${escCsv(p.commentCount)},${escCsv(p.createdAt)}`);
        });
      }

      // Job Alerts
      if (exportData.jobAlerts) {
        csvRows.push("");
        csvRows.push("Job Alerts");
        csvRows.push("ID,Keywords,Location,Category,Frequency,Active,Created At");
        (exportData.jobAlerts as Array<Record<string, unknown>>).forEach((a) => {
          csvRows.push(`${escCsv(a.id)},${escCsv(a.keywords)},${escCsv(a.location)},${escCsv(a.category)},${escCsv(a.frequency)},${escCsv(a.active)},${escCsv(a.createdAt)}`);
        });
      }

      // Saved Training
      if (exportData.savedTraining) {
        csvRows.push("");
        csvRows.push("Saved Training Programs");
        csvRows.push("ID,Program ID,Created At");
        (exportData.savedTraining as Array<Record<string, unknown>>).forEach((t) => {
          csvRows.push(`${escCsv(t.id)},${escCsv(t.programId)},${escCsv(t.createdAt)}`);
        });
      }

      // Settings & Notification Preferences are nested objects — export as JSON-in-CSV
      if (exportData.settings) {
        csvRows.push("");
        csvRows.push("Settings");
        csvRows.push("Data");
        csvRows.push(escCsv(JSON.stringify(exportData.settings)));
      }

      if (exportData.notificationPreferences) {
        csvRows.push("");
        csvRows.push("Notification Preferences");
        csvRows.push("Data");
        csvRows.push(escCsv(JSON.stringify(exportData.notificationPreferences)));
      }

      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="iopps-data-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Default: Return as JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="iopps-data-export-${new Date().toISOString().split("T")[0]}.json"`,
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
