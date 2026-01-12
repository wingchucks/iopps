import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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

    // TODO: Send invitation email via Resend

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
