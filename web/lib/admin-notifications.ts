/**
 * Admin notification emails
 * Sends email notifications to admin for important platform events
 */

import { Resend } from "resend";

// Use environment variables with fallbacks for backwards compatibility
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "nathan.arias@iopps.ca";
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "IOPPS Notifications <notifications@iopps.ca>";

type NotificationType =
  | "new_employer"
  | "new_job"
  | "new_application"
  | "new_contact"
  | "new_user"
  | "employer_ready";

interface NotificationData {
  type: NotificationType;
  // Common fields
  title?: string;
  // Employer registration
  organizationName?: string;
  employerEmail?: string;
  // Job posting
  jobTitle?: string;
  employerName?: string;
  location?: string;
  // Application
  applicantName?: string;
  applicantEmail?: string;
  // Contact form
  contactName?: string;
  contactEmail?: string;
  subject?: string;
  message?: string;
  // User signup
  userEmail?: string;
  userName?: string;
}

/**
 * Send admin notification email
 * Silently fails if email is not configured - doesn't break the main flow
 */
export async function notifyAdmin(data: NotificationData): Promise<void> {
  // Skip if no API key configured
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin Notification] Skipped - RESEND_API_KEY not configured");
    }
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { subject, html, text } = buildEmail(data);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject,
      html,
      text,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[Admin Notification] Sent: ${data.type}`);
    }
  } catch (error) {
    // Log but don't throw - notifications shouldn't break main flows
    console.error("[Admin Notification] Failed to send:", error);
  }
}

function buildEmail(data: NotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  switch (data.type) {
    case "new_employer":
      return buildNewEmployerEmail(data);
    case "new_job":
      return buildNewJobEmail(data);
    case "new_application":
      return buildNewApplicationEmail(data);
    case "new_contact":
      return buildNewContactEmail(data);
    case "new_user":
      return buildNewUserEmail(data);
    case "employer_ready":
      return buildEmployerReadyEmail(data);
    default:
      return {
        subject: "IOPPS Notification",
        html: "<p>New activity on IOPPS</p>",
        text: "New activity on IOPPS",
      };
  }
}

function buildNewEmployerEmail(data: NotificationData) {
  const subject = `New Employer Registration: ${data.organizationName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <h2 style="color: #14b8a6; margin-top: 0;">New Employer Registration</h2>
    <p><strong>Organization:</strong> ${data.organizationName}</p>
    <p><strong>Email:</strong> ${data.employerEmail}</p>
    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/dashboard/employers" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review in Dashboard</a>
    </p>
  </div>
</body>
</html>`;
  const text = `New Employer Registration\n\nOrganization: ${data.organizationName}\nEmail: ${data.employerEmail}\n\nReview: https://iopps.ca/dashboard/employers`;
  return { subject, html, text };
}

function buildNewJobEmail(data: NotificationData) {
  const subject = `New Job Posted: ${data.jobTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <h2 style="color: #14b8a6; margin-top: 0;">New Job Posted</h2>
    <p><strong>Title:</strong> ${data.jobTitle}</p>
    <p><strong>Employer:</strong> ${data.employerName}</p>
    <p><strong>Location:</strong> ${data.location || "Not specified"}</p>
    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/jobs" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Jobs</a>
    </p>
  </div>
</body>
</html>`;
  const text = `New Job Posted\n\nTitle: ${data.jobTitle}\nEmployer: ${data.employerName}\nLocation: ${data.location || "Not specified"}\n\nView: https://iopps.ca/jobs`;
  return { subject, html, text };
}

function buildNewApplicationEmail(data: NotificationData) {
  const subject = `New Job Application: ${data.jobTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <h2 style="color: #14b8a6; margin-top: 0;">New Job Application</h2>
    <p><strong>Job:</strong> ${data.jobTitle}</p>
    <p><strong>Applicant:</strong> ${data.applicantName || "Unknown"}</p>
    <p><strong>Email:</strong> ${data.applicantEmail}</p>
    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/dashboard" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
    </p>
  </div>
</body>
</html>`;
  const text = `New Job Application\n\nJob: ${data.jobTitle}\nApplicant: ${data.applicantName || "Unknown"}\nEmail: ${data.applicantEmail}\n\nView: https://iopps.ca/dashboard`;
  return { subject, html, text };
}

function buildNewContactEmail(data: NotificationData) {
  const subject = `New Contact Form: ${data.subject || "No Subject"}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <h2 style="color: #14b8a6; margin-top: 0;">New Contact Form Submission</h2>
    <p><strong>From:</strong> ${data.contactName}</p>
    <p><strong>Email:</strong> ${data.contactEmail}</p>
    <p><strong>Subject:</strong> ${data.subject || "No Subject"}</p>
    <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.message || "No message"}</p>
    </div>
    <p style="margin-top: 24px;">
      <a href="mailto:${data.contactEmail}" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reply to ${data.contactName}</a>
    </p>
  </div>
</body>
</html>`;
  const text = `New Contact Form\n\nFrom: ${data.contactName}\nEmail: ${data.contactEmail}\nSubject: ${data.subject || "No Subject"}\n\nMessage:\n${data.message || "No message"}`;
  return { subject, html, text };
}

function buildNewUserEmail(data: NotificationData) {
  const subject = `New User Signup: ${data.userEmail}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <h2 style="color: #14b8a6; margin-top: 0;">New User Signup</h2>
    <p><strong>Email:</strong> ${data.userEmail}</p>
    ${data.userName ? `<p><strong>Name:</strong> ${data.userName}</p>` : ""}
  </div>
</body>
</html>`;
  const text = `New User Signup\n\nEmail: ${data.userEmail}${data.userName ? `\nName: ${data.userName}` : ""}`;
  return { subject, html, text };
}

function buildEmployerReadyEmail(data: NotificationData) {
  const subject = `Employer Profile Ready for Review: ${data.organizationName}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155;">
    <div style="background: #14b8a6; color: #0f172a; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 16px;">Action Required</div>
    <h2 style="color: #14b8a6; margin-top: 0;">Employer Profile Ready for Review</h2>
    <p>An employer has completed their profile and is waiting for approval to post jobs.</p>
    <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Organization:</strong> ${data.organizationName}</p>
      <p style="margin: 0;"><strong>Email:</strong> ${data.employerEmail}</p>
    </div>
    <p style="margin-top: 24px;">
      <a href="https://iopps.ca/admin/employers?status=pending" style="display: inline-block; background: #14b8a6; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review & Approve</a>
    </p>
  </div>
</body>
</html>`;
  const text = `Employer Profile Ready for Review\n\nOrganization: ${data.organizationName}\nEmail: ${data.employerEmail}\n\nReview: https://iopps.ca/admin/employers?status=pending`;
  return { subject, html, text };
}
