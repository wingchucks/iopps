import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobAlert, JobPosting } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

interface JobWithAlert {
  alert: JobAlert;
  jobs: JobPosting[];
  userEmail: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (this should be called by a cron job)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { frequency = "daily" } = body; // "instant", "daily", or "weekly"

    // Get all active alerts for the specified frequency
    const alertsRef = collection(db, "jobAlerts");
    const alertsQuery = query(
      alertsRef,
      where("active", "==", true),
      where("frequency", "==", frequency)
    );

    const alertsSnap = await getDocs(alertsQuery);
    const alerts: JobAlert[] = alertsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<JobAlert, "id">),
    }));

    console.log(`Found ${alerts.length} active ${frequency} alerts`);

    // Get all jobs to match against alerts
    const jobsRef = collection(db, "jobs");
    const jobsQuery = query(
      jobsRef,
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const jobsSnap = await getDocs(jobsQuery);
    const allJobs: JobPosting[] = jobsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<JobPosting, "id">),
    }));

    // Get user emails
    const userIds = [...new Set(alerts.map((a) => a.memberId))];
    const userEmailMap = new Map<string, string>();

    for (const userId of userIds) {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("__name__", "==", userId));
      const userSnap = await getDocs(userQuery);

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.email) {
          userEmailMap.set(userId, userData.email);
        }
      }
    }

    // Match jobs to alerts
    const jobsToSend: JobWithAlert[] = [];

    for (const alert of alerts) {
      const userEmail = userEmailMap.get(alert.memberId);
      if (!userEmail) continue;

      // Filter jobs based on alert criteria
      const matchingJobs = allJobs.filter((job) => {
        // Only include jobs posted since last alert was sent
        if (alert.lastSent) {
          const lastSentDate = new Date(alert.lastSent.seconds * 1000);
          const jobCreatedDate = job.createdAt
            ? new Date(job.createdAt.seconds * 1000)
            : new Date();

          if (jobCreatedDate <= lastSentDate) {
            return false;
          }
        }

        // Keyword filtering
        if (alert.keyword) {
          const keyword = alert.keyword.toLowerCase();
          const searchText = `${job.title} ${job.description} ${job.employerName || ""}`.toLowerCase();
          if (!searchText.includes(keyword)) return false;
        }

        // Location filtering
        if (alert.location) {
          const location = alert.location.toLowerCase();
          if (!job.location.toLowerCase().includes(location)) return false;
        }

        // Employment type filtering
        if (alert.employmentType && alert.employmentType !== job.employmentType) {
          return false;
        }

        // Remote filtering
        if (alert.remoteOnly && !job.remoteFlag) {
          return false;
        }

        // Indigenous preference filtering
        if (alert.indigenousOnly && !job.indigenousPreference) {
          return false;
        }

        // Salary filtering
        if (alert.minSalary || alert.maxSalary) {
          if (!job.salaryRange) return false;

          const salaryNumbers = job.salaryRange.match(/\d+[,\d]*/g);
          if (!salaryNumbers || salaryNumbers.length === 0) return false;

          const jobSalaries = salaryNumbers.map((s) => {
            const num = parseFloat(s.replace(/,/g, ""));
            if (job.salaryRange?.toLowerCase().includes("k")) {
              return num * 1000;
            }
            return num;
          });

          const jobMinSalary = Math.min(...jobSalaries);
          const jobMaxSalary = Math.max(...jobSalaries);

          if (alert.minSalary && jobMaxSalary < alert.minSalary) return false;
          if (alert.maxSalary && jobMinSalary > alert.maxSalary) return false;
        }

        return true;
      });

      if (matchingJobs.length > 0) {
        jobsToSend.push({
          alert,
          jobs: matchingJobs,
          userEmail,
        });
      }
    }

    console.log(`Found ${jobsToSend.length} alerts with matching jobs`);

    // Send emails
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const { alert, jobs, userEmail } of jobsToSend) {
      try {
        // Skip if no RESEND_API_KEY
        if (!process.env.RESEND_API_KEY) {
          console.warn("RESEND_API_KEY not configured - skipping email send");
          results.skipped++;
          continue;
        }

        const subject =
          frequency === "instant"
            ? `New Job Alert: ${jobs.length} matching ${jobs.length === 1 ? "job" : "jobs"}`
            : `Job Alert Digest: ${jobs.length} new ${jobs.length === 1 ? "job" : "jobs"}`;

        const htmlContent = getJobAlertEmailHTML(alert, jobs, frequency);
        const textContent = getJobAlertEmailText(alert, jobs);

        const { error } = await resend.emails.send({
          from: "IOPPS Job Alerts <noreply@iopps.com>",
          to: [userEmail],
          subject,
          html: htmlContent,
          text: textContent,
        });

        if (error) {
          console.error(`Failed to send email to ${userEmail}:`, error);
          results.failed++;
        } else {
          // Update lastSent timestamp
          const alertRef = doc(db, "jobAlerts", alert.id);
          await updateDoc(alertRef, {
            lastSent: serverTimestamp(),
          });

          results.sent++;
        }
      } catch (error) {
        console.error(`Error sending alert to ${userEmail}:`, error);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      frequency,
      alertsChecked: alerts.length,
      ...results,
    });
  } catch (error) {
    console.error("Job alerts API error:", error);
    return NextResponse.json(
      { error: "Failed to process job alerts" },
      { status: 500 }
    );
  }
}

function getJobAlertEmailHTML(
  alert: JobAlert,
  jobs: JobPosting[],
  frequency: string
): string {
  const alertName = alert.alertName || "Your Job Alert";
  const safeAlertName = alertName.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const jobListHTML = jobs
    .map((job) => {
      const safeTitle = job.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeEmployer = (job.employerName || "Unknown Employer")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const safeLocation = job.location
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `
        <div style="background: #2d2d35; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px; font-size: 18px; color: #14B8A6;">
            <a href="https://iopps.com/jobs/${job.id}" style="color: #14B8A6; text-decoration: none;">${safeTitle}</a>
          </h3>
          <p style="margin: 0 0 8px; font-size: 14px; color: #cbd5e1;">${safeEmployer}</p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">📍 ${safeLocation}</p>
          ${job.employmentType ? `<p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">💼 ${job.employmentType}</p>` : ""}
          ${job.salaryRange ? `<p style="margin: 0 0 8px; font-size: 14px; color: #10b981;">💰 ${job.salaryRange}</p>` : ""}
          ${job.remoteFlag ? '<span style="display: inline-block; background: #3b82f6; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px; margin-right: 6px;">Remote</span>' : ""}
          ${job.indigenousPreference ? '<span style="display: inline-block; background: #8b5cf6; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px;">Indigenous Preference</span>' : ""}
        </div>
      `;
    })
    .join("");

  const frequencyText =
    frequency === "instant"
      ? "instant alert"
      : frequency === "daily"
      ? "daily digest"
      : "weekly digest";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; background: #0D0D0F;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #1a1a1f; border: 1px solid #2d2d35; border-radius: 16px;">
          <tr>
            <td style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: #fff;">New Job Opportunities</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">${safeAlertName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">
                We found ${jobs.length} new ${jobs.length === 1 ? "job" : "jobs"} matching your criteria:
              </p>
              ${jobListHTML}
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://iopps.com/jobs" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">View All Jobs</a>
              </div>
              <div style="background: #2d2d35; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #cbd5e1; font-weight: 600;">Alert Settings:</p>
                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Frequency: ${frequencyText}</p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #94a3b8;">
                  <a href="https://iopps.com/member/alerts" style="color: #14B8A6;">Manage your alerts</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #16161b; padding: 24px; text-align: center; border-top: 1px solid #2d2d35;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Indigenous Opportunities Platform (IOPPS)</p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                <a href="https://iopps.com/member/alerts" style="color: #14B8A6;">Manage Alerts</a> •
                <a href="https://iopps.com/contact" style="color: #14B8A6;">Contact Us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getJobAlertEmailText(alert: JobAlert, jobs: JobPosting[]): string {
  const alertName = alert.alertName || "Your Job Alert";

  const jobListText = jobs
    .map((job, index) => {
      return `${index + 1}. ${job.title}
   ${job.employerName || "Unknown Employer"}
   📍 ${job.location}
   ${job.employmentType ? `💼 ${job.employmentType}` : ""}
   ${job.salaryRange ? `💰 ${job.salaryRange}` : ""}
   ${job.remoteFlag ? "🏠 Remote" : ""}
   ${job.indigenousPreference ? "⭐ Indigenous Preference" : ""}
   View: https://iopps.com/jobs/${job.id}
`;
    })
    .join("\n");

  return `New Job Opportunities - ${alertName}

We found ${jobs.length} new ${jobs.length === 1 ? "job" : "jobs"} matching your criteria:

${jobListText}

View all jobs: https://iopps.com/jobs
Manage your alerts: https://iopps.com/member/alerts

---
Indigenous Opportunities Platform (IOPPS)`;
}
