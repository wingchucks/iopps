/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase-admin";
import type { JobAlert, JobAlertFrequency, JobPosting } from "@/lib/types";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { verifyCronSecret } from "@/lib/cron-auth";

// Mark this route as dynamic
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout

interface AlertWithEmail extends JobAlert {
  memberEmail: string;
}

interface MatchedAlert {
  alert: AlertWithEmail;
  matchingJobs: JobPosting[];
}

export async function POST(request: NextRequest) {
  // Verify cron secret for scheduled calls - REQUIRED in all environments
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // Check if Firebase Admin is initialized
  if (!db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const frequency: JobAlertFrequency = body.frequency || "daily";

    // Get the time threshold based on frequency
    const now = new Date();
    let lookbackMs: number;
    switch (frequency) {
      case "instant":
        lookbackMs = 60 * 60 * 1000; // 1 hour
        break;
      case "daily":
        lookbackMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case "weekly":
        lookbackMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      default:
        lookbackMs = 24 * 60 * 60 * 1000;
    }
    const lookbackDate = new Date(now.getTime() - lookbackMs);

    // Get all active alerts with this frequency
    const alertsSnapshot = await db
      .collection("jobAlerts")
      .where("active", "==", true)
      .where("frequency", "==", frequency)
      .get();

    if (alertsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: `No active ${frequency} alerts`,
        processed: 0,
      });
    }

    // Get recent active jobs
    const jobsSnapshot = await db
      .collection("jobs")
      .where("active", "==", true)
      .where("createdAt", ">=", lookbackDate)
      .orderBy("createdAt", "desc")
      .limit(100) // Limit to prevent overwhelming emails
      .get();

    if (jobsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No new jobs to alert about",
        processed: 0,
      });
    }

    const jobs: JobPosting[] = jobsSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as JobPosting[];

    // Get member emails for all alerts
    const memberIds = new Set<string>();
    alertsSnapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.memberId) memberIds.add(data.memberId);
    });

    // Fetch user emails
    const memberEmails: Record<string, string> = {};
    for (const memberId of memberIds) {
      try {
        const userDoc = await db.collection("users").doc(memberId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.email) {
            memberEmails[memberId] = userData.email;
          }
        }
      } catch (error) {
        console.error(`Error fetching user ${memberId}:`, error);
      }
    }

    // Process alerts and match jobs
    const matchedAlerts: MatchedAlert[] = [];

    for (const alertDoc of alertsSnapshot.docs) {
      const alertData = alertDoc.data() as Omit<JobAlert, "id">;
      const alert: AlertWithEmail = {
        id: alertDoc.id,
        ...alertData,
        memberEmail: memberEmails[alertData.memberId] || "",
      };

      if (!alert.memberEmail) {
        continue;
      }

      // Check if we should skip based on lastSent
      if (alert.lastSent) {
        const lastSentDate =
          alert.lastSent instanceof Date
            ? alert.lastSent
            : new Date((alert.lastSent as any).seconds * 1000);

        // For instant alerts, check if we've sent within the last hour
        if (frequency === "instant" && now.getTime() - lastSentDate.getTime() < 30 * 60 * 1000) {
          continue; // Skip if sent within last 30 minutes for instant
        }
      }

      // Find matching jobs for this alert
      const matchingJobs = jobs.filter((job) => matchJobToAlert(job, alert));

      if (matchingJobs.length > 0) {
        matchedAlerts.push({ alert, matchingJobs });
      }
    }

    if (matchedAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No matching jobs for any alerts",
        processed: 0,
      });
    }

    // Group alerts by member email to send consolidated emails
    const emailGroups: Record<string, MatchedAlert[]> = {};
    for (const match of matchedAlerts) {
      const email = match.alert.memberEmail;
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push(match);
    }

    // Send emails
    const resend = new Resend(process.env.RESEND_API_KEY);
    let emailsSent = 0;
    let alertsProcessed = 0;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured - skipping email send");
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Email API not configured",
        wouldHaveSent: Object.keys(emailGroups).length,
      });
    }

    for (const [email, alerts] of Object.entries(emailGroups)) {
      try {
        // Collect all unique jobs across all alerts for this user
        const allJobs = new Map<string, JobPosting>();
        for (const match of alerts) {
          for (const job of match.matchingJobs) {
            allJobs.set(job.id, job);
          }
        }
        const uniqueJobs = Array.from(allJobs.values());

        // Generate email content
        const subject = getEmailSubject(frequency, uniqueJobs.length);
        const htmlContent = getJobAlertEmailHTML(uniqueJobs, frequency, alerts);
        const textContent = getJobAlertEmailText(uniqueJobs, frequency);

        // Send email
        const { error } = await resend.emails.send({
          from: "IOPPS Job Alerts <alerts@iopps.ca>",
          to: [email],
          subject,
          html: htmlContent,
          text: textContent,
        });

        if (error) {
          console.error(`Error sending email to ${email}:`, error);
          continue;
        }

        emailsSent++;

        // Update lastSent for all alerts sent to this user
        for (const match of alerts) {
          try {
            await db.collection("jobAlerts").doc(match.alert.id).update({
              lastSent: new Date(),
            });
            alertsProcessed++;
          } catch (updateError) {
            console.error(`Error updating alert ${match.alert.id}:`, updateError);
          }
        }
      } catch (emailError) {
        console.error(`Error processing email for ${email}:`, emailError);
      }
    }

    console.log(`Sent ${emailsSent} emails, processed ${alertsProcessed} alerts`);

    return NextResponse.json({
      success: true,
      emailsSent,
      alertsProcessed,
      frequency,
    });
  } catch (error) {
    console.error("Job alerts API error:", error);
    return NextResponse.json(
      { error: "Failed to process job alerts" },
      { status: 500 }
    );
  }
}

function matchJobToAlert(job: JobPosting, alert: JobAlert): boolean {
  // Keyword match (title or description)
  if (alert.keyword) {
    const keywords = alert.keyword.toLowerCase().split(/[,\s]+/).filter(Boolean);
    const searchText = `${job.title} ${job.description}`.toLowerCase();
    const hasKeywordMatch = keywords.some((kw) => searchText.includes(kw));
    if (!hasKeywordMatch) return false;
  }

  // Location match
  if (alert.location) {
    const alertLocation = alert.location.toLowerCase();
    const jobLocation = job.location?.toLowerCase() || "";
    if (!jobLocation.includes(alertLocation) && !alertLocation.includes(jobLocation)) {
      return false;
    }
  }

  // Employment type match
  if (alert.employmentType) {
    if (job.employmentType?.toLowerCase() !== alert.employmentType.toLowerCase()) {
      return false;
    }
  }

  // Remote only filter
  if (alert.remoteOnly && !job.remoteFlag) {
    return false;
  }

  // Indigenous preference filter
  if (alert.indigenousOnly && !job.indigenousPreference) {
    return false;
  }

  // Salary range filters
  if (alert.minSalary || alert.maxSalary) {
    const jobSalary = typeof job.salaryRange === "object" ? job.salaryRange : null;
    if (!jobSalary || !jobSalary.disclosed) {
      // If salary not disclosed and user wants salary filtering, skip
      if (alert.minSalary) return false;
    } else {
      if (alert.minSalary && jobSalary.max && jobSalary.max < alert.minSalary) {
        return false;
      }
      if (alert.maxSalary && jobSalary.min && jobSalary.min > alert.maxSalary) {
        return false;
      }
    }
  }

  return true;
}

function getEmailSubject(frequency: JobAlertFrequency, jobCount: number): string {
  const jobWord = jobCount === 1 ? "job" : "jobs";
  switch (frequency) {
    case "instant":
      return `New Job Alert: ${jobCount} ${jobWord} matching your criteria`;
    case "daily":
      return `Your Daily Job Digest: ${jobCount} new ${jobWord}`;
    case "weekly":
      return `Your Weekly Job Digest: ${jobCount} new ${jobWord}`;
    default:
      return `Job Alert: ${jobCount} new ${jobWord} on IOPPS`;
  }
}

function getJobAlertEmailHTML(
  jobs: JobPosting[],
  frequency: JobAlertFrequency,
  alerts: MatchedAlert[]
): string {
  const digestType =
    frequency === "instant"
      ? "Job Alert"
      : frequency === "daily"
      ? "Daily Digest"
      : "Weekly Digest";

  const jobCards = jobs
    .slice(0, 10) // Limit to 10 jobs in email
    .map((job) => {
      const salaryText = getSalaryText(job);
      const safeTitle = escapeHtml(job.title);
      const safeEmployer = escapeHtml(job.employerName || "");
      const safeLocation = escapeHtml(job.location || "");

      return `
        <tr>
          <td style="padding: 20px; border-bottom: 1px solid #2d2d35;">
            <h3 style="margin: 0 0 8px; font-size: 18px; color: #f1f5f9;">
              <a href="https://iopps.ca/jobs/${job.id}" style="color: #14B8A6; text-decoration: none;">${safeTitle}</a>
            </h3>
            <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">${safeEmployer}</p>
            <div style="display: flex; gap: 16px; font-size: 13px; color: #64748b;">
              <span>📍 ${safeLocation}</span>
              <span>💼 ${escapeHtml(job.employmentType || "")}</span>
              ${salaryText ? `<span>💰 ${salaryText}</span>` : ""}
              ${job.remoteFlag ? '<span style="color: #14B8A6;">🏠 Remote</span>' : ""}
            </div>
            <div style="margin-top: 16px;">
              <a href="https://iopps.ca/jobs/${job.id}" style="display: inline-block; padding: 10px 20px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View Job</a>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  const moreJobsText =
    jobs.length > 10
      ? `<tr><td style="padding: 20px; text-align: center; color: #94a3b8;">... and ${jobs.length - 10} more jobs. <a href="https://iopps.ca/jobs" style="color: #14B8A6;">View all jobs</a></td></tr>`
      : "";

  const alertNames = alerts
    .map((a) => a.alert.alertName || "Job Alert")
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3)
    .join(", ");

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
              <h1 style="margin: 0; font-size: 28px; color: #fff;">${digestType}</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">${jobs.length} new job${jobs.length === 1 ? "" : "s"} matching "${escapeHtml(alertNames)}"</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${jobCards}
                ${moreJobsText}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; text-align: center;">
              <a href="https://iopps.ca/jobs" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">Browse All Jobs</a>
            </td>
          </tr>
          <tr>
            <td style="background: #16161b; padding: 24px; text-align: center; border-top: 1px solid #2d2d35;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Indigenous Opportunities Platform (IOPPS)</p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                <a href="https://iopps.ca/member/alerts" style="color: #14B8A6;">Manage your alerts</a> ·
                <a href="https://iopps.ca/unsubscribe" style="color: #14B8A6;">Unsubscribe</a>
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

function getJobAlertEmailText(jobs: JobPosting[], frequency: JobAlertFrequency): string {
  const digestType =
    frequency === "instant"
      ? "Job Alert"
      : frequency === "daily"
      ? "Daily Digest"
      : "Weekly Digest";

  const jobList = jobs
    .slice(0, 10)
    .map((job) => {
      const salaryText = getSalaryText(job);
      return `
${job.title}
${job.employerName || ""}
Location: ${job.location} | Type: ${job.employmentType}${salaryText ? ` | Salary: ${salaryText}` : ""}${job.remoteFlag ? " | Remote" : ""}
View: https://iopps.ca/jobs/${job.id}
`;
    })
    .join("\n---\n");

  return `${digestType} - ${jobs.length} New Job${jobs.length === 1 ? "" : "s"}

${jobList}

${jobs.length > 10 ? `... and ${jobs.length - 10} more jobs.\n\n` : ""}
Browse all jobs: https://iopps.ca/jobs
Manage your alerts: https://iopps.ca/member/alerts

---
Indigenous Opportunities Platform (IOPPS)`;
}

function getSalaryText(job: JobPosting): string {
  if (!job.salaryRange) return "";
  if (typeof job.salaryRange === "string") return job.salaryRange;
  if (!job.salaryRange.disclosed) return "";

  const { min, max, currency = "CAD" } = job.salaryRange;
  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
  }
  if (min) return `$${min.toLocaleString()}+ ${currency}`;
  if (max) return `Up to $${max.toLocaleString()} ${currency}`;
  return "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
