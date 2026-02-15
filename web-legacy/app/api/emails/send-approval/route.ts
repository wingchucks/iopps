import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth, db } from "@/lib/firebase-admin";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimiters.strict(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  // Check if Firebase Admin is initialized
  if (!auth || !db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  // Verify authentication - only admins/moderators can send approval emails
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if the user is an admin or moderator
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
  } catch (authError) {
    console.error("Auth verification error:", authError);
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await request.json();
    const { to, organizationName, status, rejectionReason } = body;

    if (!to || !organizationName || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isApproved = status === "approved";
    const subject = isApproved
      ? "Welcome to IOPPS - Your Employer Account is Approved!"
      : "IOPPS Employer Account Application Update";

    const htmlContent = isApproved
      ? getApprovalEmailHTML(organizationName)
      : getRejectionEmailHTML(organizationName, rejectionReason);

    const textContent = isApproved
      ? getApprovalEmailText(organizationName)
      : getRejectionEmailText(organizationName, rejectionReason);

    // Only send email if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured - skipping email send");
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Email API not configured"
      });
    }

    const { data, error } = await resend.emails.send({
      from: "IOPPS <noreply@iopps.ca>",
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

function getApprovalEmailHTML(organizationName: string): string {
  const safeOrgName = organizationName.replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
              <h1 style="margin: 0; font-size: 28px; color: #fff;">Welcome to IOPPS!</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">Your employer account has been approved</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Hello ${safeOrgName},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Your employer account on the Indigenous Opportunities Platform has been approved!</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #cbd5e1;">You can now:</p>
              <ul style="margin: 0 0 24px; padding-left: 24px; color: #cbd5e1;">
                <li style="margin-bottom: 12px;">Post job opportunities</li>
                <li style="margin-bottom: 12px;">Share conferences and events</li>
                <li style="margin-bottom: 12px;">Offer scholarships</li>
                <li style="margin-bottom: 12px;">Connect with Indigenous professionals</li>
              </ul>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://iopps.ca/organization" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
              </div>
              <p style="margin: 24px 0 0; font-size: 14px; color: #94a3b8;">Questions? Visit our <a href="https://iopps.ca/contact" style="color: #14B8A6;">contact page</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #16161b; padding: 24px; text-align: center; border-top: 1px solid #2d2d35;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Indigenous Opportunities Platform (IOPPS)</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getApprovalEmailText(organizationName: string): string {
  return `Welcome to IOPPS!

Hello ${organizationName},

Your employer account on the Indigenous Opportunities Platform has been approved!

You can now:
- Post job opportunities
- Share conferences and events
- Offer scholarships
- Connect with Indigenous professionals

Visit your dashboard: https://iopps.ca/organization

Questions? Visit https://iopps.ca/contact

---
Indigenous Opportunities Platform (IOPPS)`;
}

function getRejectionEmailHTML(organizationName: string, rejectionReason?: string): string {
  const safeOrgName = organizationName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeReason = rejectionReason?.replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
            <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; color: #fff;">Application Update</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">IOPPS Employer Account</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Hello ${safeOrgName},</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Thank you for your interest in joining the Indigenous Opportunities Platform.</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #cbd5e1;">We are unable to approve your employer account at this time.</p>
              ${safeReason ? `<div style="background: #2d1f1f; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 24px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #fca5a5;">Reason:</p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #fecaca;">${safeReason}</p>
              </div>` : ''}
              <p style="margin: 0 0 24px; font-size: 16px; color: #cbd5e1;">If you believe this was an error, please reach out to our team.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://iopps.ca/contact" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">Contact Us</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #16161b; padding: 24px; text-align: center; border-top: 1px solid #2d2d35;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Indigenous Opportunities Platform (IOPPS)</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getRejectionEmailText(organizationName: string, rejectionReason?: string): string {
  return `IOPPS Application Update

Hello ${organizationName},

Thank you for your interest in joining the Indigenous Opportunities Platform.

We are unable to approve your employer account at this time.

${rejectionReason ? `Reason: ${rejectionReason}\n\n` : ''}If you believe this was an error, please reach out to our team.

Contact us: https://iopps.ca/contact

---
Indigenous Opportunities Platform (IOPPS)`;
}
