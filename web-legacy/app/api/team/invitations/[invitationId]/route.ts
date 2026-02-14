import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Token must be a 64-character hexadecimal string
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

// POST - Accept or decline invitation
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

    const authToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(authToken);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;
    const displayName = decodedToken.name;

    if (!userEmail) {
      return NextResponse.json({ error: "Email not available" }, { status: 400 });
    }

    const body = await request.json();
    const { action, token: inviteToken } = body; // action: "accept" or "decline", token: optional invite token

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Get the invitation
    const invitationRef = db.collection("teamInvitations").doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitation = invitationDoc.data();

    // Validate token if provided (adds extra security layer)
    if (inviteToken) {
      if (!TOKEN_REGEX.test(inviteToken)) {
        return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
      }
      if (invitation?.token !== inviteToken) {
        return NextResponse.json({ error: "Invalid invitation token" }, { status: 403 });
      }
    }

    // Verify invitation is for this user
    if (invitation?.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    if (invitation?.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    // Check expiration
    if (invitation?.expiresAt) {
      const expiresAt =
        typeof invitation.expiresAt === "object" && invitation.expiresAt.toDate
          ? invitation.expiresAt.toDate()
          : new Date(invitation.expiresAt);

      if (expiresAt < new Date()) {
        await invitationRef.update({ status: "expired" });
        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 }
        );
      }
    }

    if (action === "decline") {
      await invitationRef.update({ status: "declined" });
      return NextResponse.json({ success: true, action: "declined" });
    }

    // Accept invitation - add user as team member
    const employerRef = db.collection("employers").doc(invitation.employerId);
    const employerDoc = await employerRef.get();

    if (!employerDoc.exists) {
      return NextResponse.json(
        { error: "Organization no longer exists" },
        { status: 404 }
      );
    }

    const employerData = employerDoc.data();
    const existingMembers: TeamMember[] = employerData?.teamMembers || [];

    // Check if already a member
    if (existingMembers.some((m) => m.id === userId)) {
      await invitationRef.update({ status: "accepted" });
      return NextResponse.json({
        success: true,
        action: "accepted",
        message: "You are already a team member",
      });
    }

    // Add new team member
    const newMember: TeamMember = {
      id: userId,
      email: userEmail,
      displayName: displayName || userEmail.split("@")[0],
      role: invitation.role,
      addedBy: invitation.invitedBy,
      addedAt: null, // Will be set by serverTimestamp
      lastAccessedAt: null,
    };

    await employerRef.update({
      teamMembers: FieldValue.arrayUnion({
        ...newMember,
        addedAt: FieldValue.serverTimestamp(),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update invitation status
    await invitationRef.update({
      status: "accepted",
      acceptedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      action: "accepted",
      employerId: invitation.employerId,
      organizationName: invitation.organizationName,
      role: invitation.role,
    });
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 }
    );
  }
}
