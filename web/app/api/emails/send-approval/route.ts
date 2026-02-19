import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifyAuthToken } from "@/lib/api-auth";
import { wrapEmail, ctaButton, escapeHtml } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
const FROM_ADDRESS = "noreply@iopps.ca";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalStatus = "approved" | "rejected";

interface SendApprovalBody {
  employerEmail: string;
  organizationName: string;
  status: ApprovalStatus;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES: ReadonlySet<string> = new Set(["approved", "rejected"]);

function validateBody(
  body: unknown,
): { valid: true; data: SendApprovalBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid request body" };
  }

  const { employerEmail, organizationName, status, reason } =
    body as Record<string, unknown>;

  if (typeof employerEmail !== "string" || !EMAIL_REGEX.test(employerEmail.trim())) {
    return { valid: false, error: "A valid employerEmail is required" };
  }

  if (typeof organizationName !== "string" || organizationName.trim().length === 0) {
    return { valid: false, error: "organizationName is required" };
  }

  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return { valid: false, error: "status must be 'approved' or 'rejected'" };
  }

  if (reason !== undefined && typeof reason !== "string") {
    return { valid: false, error: "reason must be a string if provided" };
  }

  return {
    valid: true,
    data: {
      employerEmail: employerEmail.trim().toLowerCase(),
      organizationName: organizationName.trim(),
      status: status as ApprovalStatus,
      reason: typeof reason === "string" ? reason.trim() : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Email builders
// ---------------------------------------------------------------------------

function buildApprovedEmail(orgName: string): { subject: string; html: string } {
  const subject = "Welcome to IOPPS - Your Employer Account is Approved!";

  const content = `
<h2 style="color:#e0e0e0;margin:0 0 16px;">Congratulations, ${escapeHtml(orgName)}!</h2>
<p style="color:#ccc;line-height:1.6;margin:0 0 12px;">
  Your employer account on IOPPS has been <strong style="color:#22c55e;">approved</strong>.
  You can now post job opportunities, connect with Indigenous talent, and manage
  your organization's profile.
</p>
<p style="color:#ccc;line-height:1.6;margin:0 0 20px;">
  Get started by visiting your employer dashboard to create your first job posting.
</p>
${ctaButton("Go to Dashboard", `${SITE_URL}/organization/dashboard`)}
<p style="color:#888;font-size:13px;margin:16px 0 0;">
  If you have any questions, please reach out to us at
  <a href="mailto:support@iopps.ca" style="color:#d97706;text-decoration:none;">support@iopps.ca</a>.
</p>`;

  return { subject, html: wrapEmail(subject, content) };
}

function buildRejectedEmail(
  orgName: string,
  reason?: string,
): { subject: string; html: string } {
  const subject = "IOPPS Employer Account Application Update";

  const reasonBlock = reason
    ? `<div style="background-color:#1a1a2e;border:1px solid #2a2a3e;border-radius:8px;padding:16px;margin:16px 0;">
<p style="color:#aaa;font-size:13px;margin:0 0 4px;">Reason:</p>
<p style="color:#e0e0e0;margin:0;">${escapeHtml(reason)}</p>
</div>`
    : "";

  const content = `
<h2 style="color:#e0e0e0;margin:0 0 16px;">Application Update for ${escapeHtml(orgName)}</h2>
<p style="color:#ccc;line-height:1.6;margin:0 0 12px;">
  Thank you for your interest in joining IOPPS as an employer. After reviewing your
  application, we are unable to approve your account at this time.
</p>
${reasonBlock}
<p style="color:#ccc;line-height:1.6;margin:0 0 12px;">
  You are welcome to re-apply after addressing the items above. If you believe this
  decision was made in error, please contact our support team.
</p>
${ctaButton("Contact Support", `${SITE_URL}/contact`)}
<p style="color:#888;font-size:13px;margin:16px 0 0;">
  You can reach us directly at
  <a href="mailto:support@iopps.ca" style="color:#d97706;text-decoration:none;">support@iopps.ca</a>.
</p>`;

  return { subject, html: wrapEmail(subject, content) };
}

// ---------------------------------------------------------------------------
// POST /api/emails/send-approval
// ---------------------------------------------------------------------------

/**
 * Send an employer approval or rejection email.
 *
 * Restricted to admin and moderator roles.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  // Only admins and moderators may send approval emails
  const role = auth.decodedToken.role as string | undefined;
  const isAdmin = auth.decodedToken.admin === true || role === "admin";
  const isModerator = role === "moderator";

  if (!isAdmin && !isModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = validateBody(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { employerEmail, organizationName, status, reason } = validation.data;

    const { subject, html } =
      status === "approved"
        ? buildApprovedEmail(organizationName)
        : buildRejectedEmail(organizationName, reason);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: employerEmail,
      subject,
      html,
    });

    if (error) {
      console.error("[POST /api/emails/send-approval] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/emails/send-approval] Error:", error);
    return NextResponse.json(
      { error: "Failed to send approval email" },
      { status: 500 },
    );
  }
}
