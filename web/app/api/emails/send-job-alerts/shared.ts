import { adminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";
import { wrapEmail, jobCardHtml, getUnsubscribeUrl } from "@/lib/emails/templates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface JobAlert {
  id: string;
  userId: string;
  email?: string;
  keywords?: string[];
  location?: string;
  employmentType?: string;
  remoteOnly?: boolean;
  frequency: "instant" | "daily" | "weekly";
  active: boolean;
  lastSent?: Date;
  createdAt: Date;
}

interface Job {
  id: string;
  title: string;
  employer: string;
  employerLogo?: string;
  location?: string;
  employmentType?: string;
  remote?: boolean;
  description?: string;
  active: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get lookback date based on frequency */
export function getLookbackDate(frequency: "instant" | "daily" | "weekly"): Date {
  const now = new Date();
  switch (frequency) {
    case "instant":
      return new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes
    case "daily":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
    case "weekly":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
  }
}

/** Check if a job matches alert criteria */
export function matchesAlert(job: Job, alert: JobAlert): boolean {
  if (alert.keywords?.length) {
    const searchText = `${job.title} ${job.description || ""}`.toLowerCase();
    const hasKeyword = alert.keywords.some((kw) =>
      searchText.includes(kw.toLowerCase()),
    );
    if (!hasKeyword) return false;
  }

  if (alert.location && job.location) {
    if (!job.location.toLowerCase().includes(alert.location.toLowerCase()))
      return false;
  }

  if (alert.employmentType && job.employmentType) {
    if (job.employmentType.toLowerCase() !== alert.employmentType.toLowerCase())
      return false;
  }

  if (alert.remoteOnly && !job.remote) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Email sender
// ---------------------------------------------------------------------------

/** Send job alert email to a user */
export async function sendJobAlertEmail(
  email: string,
  jobs: Job[],
  frequency: string,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const displayJobs = jobs.slice(0, 10);
  const jobCards = displayJobs
    .map((job) =>
      jobCardHtml({
        title: job.title,
        employer: job.employer,
        location: job.location,
        url: `${SITE_URL}/jobs/${job.id}`,
      }),
    )
    .join("");

  const moreCount = jobs.length - displayJobs.length;
  const moreText =
    moreCount > 0
      ? `<p style="color:#888;font-size:13px;text-align:center;margin-top:16px;">+ ${moreCount} more matching jobs on IOPPS</p>`
      : "";

  const content = `
    <h2 style="color:#e0e0e0;margin:0 0 8px;">Your Job Matches</h2>
    <p style="color:#aaa;margin:0 0 24px;font-size:14px;">${jobs.length} new job${jobs.length !== 1 ? "s" : ""} matching your alerts (${frequency})</p>
    ${jobCards}
    ${moreText}
    <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr><td style="background-color:#d97706;border-radius:8px;padding:12px 28px;">
    <a href="${SITE_URL}/jobs" style="color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Browse All Jobs</a>
    </td></tr></table>
  `;

  const unsubscribeUrl = getUnsubscribeUrl(email, "job_alerts");
  const html = wrapEmail("New Jobs Matching Your Alerts", content, unsubscribeUrl);

  try {
    await resend.emails.send({
      from: "IOPPS Job Alerts <alerts@iopps.ca>",
      to: email,
      subject: `${jobs.length} New Job${jobs.length !== 1 ? "s" : ""} Matching Your Alerts`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send job alert email:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core processing
// ---------------------------------------------------------------------------

/** Process job alerts for a given frequency */
export async function processJobAlerts(
  frequency: "instant" | "daily" | "weekly",
): Promise<{ sent: number; errors: number; totalAlerts: number }> {
  if (!adminDb) throw new Error("Database not initialized");

  const lookback = getLookbackDate(frequency);

  // Fetch active alerts for this frequency
  const alertsSnap = await adminDb
    .collection("jobAlerts")
    .where("active", "==", true)
    .where("frequency", "==", frequency)
    .get();

  if (alertsSnap.empty) return { sent: 0, errors: 0, totalAlerts: 0 };

  // Fetch recent active jobs
  const jobsSnap = await adminDb
    .collection("jobs")
    .where("active", "==", true)
    .where("createdAt", ">=", lookback)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  if (jobsSnap.empty) return { sent: 0, errors: 0, totalAlerts: alertsSnap.size };

  const jobs: Job[] = jobsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title || "",
      employer: d.employer || d.employerName || "",
      employerLogo: d.employerLogo,
      location: d.location,
      employmentType: d.employmentType,
      remote: d.remote,
      description: d.description,
      active: d.active,
      createdAt: d.createdAt?.toDate?.() || new Date(),
    };
  });

  // Group alerts by email so each user receives a single consolidated email
  const alertsByEmail = new Map<
    string,
    { alerts: JobAlert[]; userId: string }
  >();

  for (const doc of alertsSnap.docs) {
    const data = doc.data();
    const alert: JobAlert = {
      id: doc.id,
      userId: data.userId,
      email: data.email,
      keywords: data.keywords,
      location: data.location,
      employmentType: data.employmentType,
      remoteOnly: data.remoteOnly,
      frequency: data.frequency,
      active: data.active,
      lastSent: data.lastSent?.toDate?.(),
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };

    const alertEmail = data.email as string | undefined;
    if (!alertEmail) continue;

    if (!alertsByEmail.has(alertEmail)) {
      alertsByEmail.set(alertEmail, { alerts: [], userId: data.userId });
    }
    alertsByEmail.get(alertEmail)!.alerts.push(alert);
  }

  let sent = 0;
  let errors = 0;

  for (const [email, { alerts, userId }] of alertsByEmail) {
    // Deduplicate matching jobs across all alerts for this user
    const matchingJobs = new Map<string, Job>();
    for (const alert of alerts) {
      for (const job of jobs) {
        if (matchesAlert(job, alert) && !matchingJobs.has(job.id)) {
          matchingJobs.set(job.id, job);
        }
      }
    }

    if (matchingJobs.size === 0) continue;

    const success = await sendJobAlertEmail(
      email,
      Array.from(matchingJobs.values()),
      frequency,
    );

    if (success) {
      sent++;

      // Update lastSent on all alerts for this user
      const batch = adminDb.batch();
      for (const alert of alerts) {
        batch.update(adminDb.collection("jobAlerts").doc(alert.id), {
          lastSent: new Date(),
        });
      }
      await batch.commit();

      // Log email for auditing
      await adminDb.collection("emailLogs").add({
        type: "job_alert",
        frequency,
        to: email,
        userId,
        jobCount: matchingJobs.size,
        sentAt: new Date(),
        status: "sent",
      });
    } else {
      errors++;
    }
  }

  return { sent, errors, totalAlerts: alertsSnap.size };
}
