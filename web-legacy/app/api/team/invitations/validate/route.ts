import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Token must be a 64-character hexadecimal string
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

// GET - Validate invitation token and return invitation details
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate token format to prevent injection/abuse
    if (!TOKEN_REGEX.test(token)) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    // Look up invitation by token
    const invitationsSnapshot = await db
      .collection("teamInvitations")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (invitationsSnapshot.empty) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitationDoc = invitationsSnapshot.docs[0];
    const invitation = invitationDoc.data();

    // Check status
    if (invitation.status !== "pending") {
      const statusMessages: Record<string, string> = {
        accepted: "This invitation has already been accepted",
        declined: "This invitation was declined",
        expired: "This invitation has expired",
      };
      return NextResponse.json(
        { error: statusMessages[invitation.status] || "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    // Check expiration
    if (invitation.expiresAt) {
      const expiresAt =
        typeof invitation.expiresAt === "object" && invitation.expiresAt.toDate
          ? invitation.expiresAt.toDate()
          : new Date(invitation.expiresAt);

      if (expiresAt < new Date()) {
        // Update status to expired
        await invitationDoc.ref.update({ status: "expired" });
        return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
      }
    }

    // Return safe invitation details (without sensitive data)
    return NextResponse.json({
      id: invitationDoc.id,
      organizationName: invitation.organizationName,
      role: invitation.role,
      invitedEmail: invitation.invitedEmail,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
}
