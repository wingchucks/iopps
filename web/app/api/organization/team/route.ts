import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import type { TeamRole, TeamMember, TeamInvitation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET - Get team members and pending invitations
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

    // Get the employer profile
    const employerRef = db.collection("employers").doc(userId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      // Check if user is a team member of another employer
      const employersSnapshot = await db.collection("employers").get();
      let employerId: string | null = null;
      let memberRole: TeamRole | null = null;

      for (const doc of employersSnapshot.docs) {
        const data = doc.data();
        const member = data.teamMembers?.find((m: TeamMember) => m.id === userId);
        if (member) {
          employerId = doc.id;
          memberRole = member.role;
          break;
        }
      }

      if (!employerId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      // Team members can only view, not manage team
      const teamEmployerDoc = await db.collection("employers").doc(employerId).get();
      const teamData = teamEmployerDoc.data();

      return NextResponse.json({
        members: teamData?.teamMembers || [],
        invitations: [], // Only admins see invitations
        isOwner: false,
        role: memberRole,
      });
    }

    // User is the owner
    const employerData = employerDoc.data();
    const members: TeamMember[] = employerData?.teamMembers || [];

    // Get pending invitations
    const invitationsSnapshot = await db
      .collection("teamInvitations")
      .where("employerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const invitations: TeamInvitation[] = invitationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamInvitation[];

    return NextResponse.json({
      members,
      invitations,
      isOwner: true,
      role: "admin" as TeamRole,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// POST - Invite a new team member
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

    // Verify user is an employer owner
    const employerRef = db.collection("employers").doc(userId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const employerData = employerDoc.data();

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const validRoles: TeamRole[] = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already a team member
    const existingMember = employerData?.teamMembers?.find(
      (m: TeamMember) => m.email.toLowerCase() === normalizedEmail
    );
    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already a team member" },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const existingInviteSnapshot = await db
      .collection("teamInvitations")
      .where("employerId", "==", userId)
      .where("invitedEmail", "==", normalizedEmail)
      .where("status", "==", "pending")
      .get();

    if (!existingInviteSnapshot.empty) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitationData = {
      employerId: userId,
      organizationName: employerData?.organizationName || "Unknown Organization",
      invitedEmail: normalizedEmail,
      invitedBy: userId,
      invitedByName: employerData?.organizationName,
      role,
      status: "pending",
      token: inviteToken,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    };

    const invitationRef = await db.collection("teamInvitations").add(invitationData);

    // Send invitation email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
        const inviteUrl = `${siteUrl}/team/accept?token=${inviteToken}`;
        const safeOrgName = (employerData?.organizationName || "An organization").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        await resend.emails.send({
          from: "IOPPS <noreply@iopps.ca>",
          to: [normalizedEmail],
          subject: `You've been invited to join ${employerData?.organizationName || "a team"} on IOPPS`,
          html: getTeamInvitationEmailHTML(safeOrgName, role, inviteUrl),
          text: getTeamInvitationEmailText(employerData?.organizationName || "An organization", role, inviteUrl),
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the invitation creation if email fails
      }
    } else {
      console.warn("RESEND_API_KEY not configured - skipping invitation email");
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationRef.id,
        ...invitationData,
      },
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
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
              <h1 style="margin: 0; font-size: 28px; color: #fff;">Team Invitation</h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">You've been invited to join a team on IOPPS</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;">Hello,</p>
              <p style="margin: 0 0 16px; font-size: 16px; color: #cbd5e1;"><strong style="color: #f8fafc;">${organizationName}</strong> has invited you to join their team on the Indigenous Opportunities Platform.</p>
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

  return `Team Invitation - IOPPS

Hello,

${organizationName} has invited you to join their team on the Indigenous Opportunities Platform.

Your role: ${role}
${roleDescriptions[role] || "Team member access"}

This invitation expires in 7 days.

Accept your invitation: ${inviteUrl}

If you didn't expect this invitation, you can safely ignore this email.

---
Indigenous Opportunities Platform (IOPPS)`;
}
