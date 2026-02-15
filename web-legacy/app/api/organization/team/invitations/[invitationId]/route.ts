import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST - Resend invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const { invitationId } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the invitation
    const invitationRef = db.collection("teamInvitations").doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitation = invitationDoc.data();

    // Verify user owns this employer
    if (invitation?.employerId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (invitation?.status !== "pending") {
      return NextResponse.json(
        { error: "Can only resend pending invitations" },
        { status: 400 }
      );
    }

    // Generate new token and extend expiration
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const newToken = Array.from(tokenBytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await invitationRef.update({
      token: newToken,
      expiresAt: newExpiresAt,
    });

    // Send invitation email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
        const inviteUrl = `${siteUrl}/team/accept?token=${newToken}`;
        const safeOrgName = (invitation.organizationName || "An organization").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        await resend.emails.send({
          from: "IOPPS <noreply@iopps.ca>",
          to: [invitation.invitedEmail],
          subject: `Reminder: You've been invited to join ${invitation.organizationName || "a team"} on IOPPS`,
          html: getTeamInvitationEmailHTML(safeOrgName, invitation.role, inviteUrl),
          text: getTeamInvitationEmailText(invitation.organizationName || "An organization", invitation.role, inviteUrl),
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the invitation resend if email fails
      }
    } else {
      console.warn("RESEND_API_KEY not configured - skipping invitation email");
    }

    return NextResponse.json({
      success: true,
      message: "Invitation resent",
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const { invitationId } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the invitation
    const invitationRef = db.collection("teamInvitations").doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitation = invitationDoc.data();

    // Verify user owns this employer
    if (invitation?.employerId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await invitationRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}

function getTeamInvitationEmailHTML(organizationName: string, role: string, inviteUrl: string): string {
  const roleDescriptions: Record<string, string> = {
    admin: "Full access to manage jobs, applications, team members, and settings",
    editor: "Create and edit job postings and respond to applications",
    viewer: "View job postings, applications, and team activity",
  };

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
              <h1 style="margin: 0; font-size: 28px; color: #fff;">Reminder: Team Invitation</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">You've been invited to join a team on IOPPS</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Hello,</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">This is a reminder that <strong style="color: #f8fafc;">${organizationName}</strong> has invited you to join their team on the Indigenous Opportunities Platform.</p>
              <div style="background: #16161b; border: 1px solid #2d2d35; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">Your role:</p>
                <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #14B8A6; text-transform: capitalize;">${role}</p>
                <p style="margin: 0; font-size: 14px; color: #94a3b8;">${roleDescriptions[role] || "Team member access"}</p>
              </div>
              <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8;">This invitation expires in 7 days.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
              </div>
              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b;">If you didn't expect this invitation, you can safely ignore this email.</p>
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

function getTeamInvitationEmailText(organizationName: string, role: string, inviteUrl: string): string {
  const roleDescriptions: Record<string, string> = {
    admin: "Full access to manage jobs, applications, team members, and settings",
    editor: "Create and edit job postings and respond to applications",
    viewer: "View job postings, applications, and team activity",
  };

  return `Reminder: Team Invitation - IOPPS

Hello,

This is a reminder that ${organizationName} has invited you to join their team on the Indigenous Opportunities Platform.

Your role: ${role}
${roleDescriptions[role] || "Team member access"}

This invitation expires in 7 days.

Accept your invitation: ${inviteUrl}

If you didn't expect this invitation, you can safely ignore this email.

---
Indigenous Opportunities Platform (IOPPS)`;
}
