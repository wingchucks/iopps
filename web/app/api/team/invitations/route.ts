import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import type { TeamInvitation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET - Get pending invitations for the current user
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
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Email not available" }, { status: 400 });
    }

    // Get pending invitations for this email
    const invitationsSnapshot = await db
      .collection("teamInvitations")
      .where("invitedEmail", "==", userEmail.toLowerCase())
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const invitations: TeamInvitation[] = invitationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamInvitation[];

    // Filter out expired invitations
    const now = new Date();
    const validInvitations = invitations.filter((inv) => {
      if (!inv.expiresAt) return true;
      const expiresAt =
        typeof inv.expiresAt === "object" && "toDate" in inv.expiresAt
          ? (inv.expiresAt as { toDate: () => Date }).toDate()
          : new Date(inv.expiresAt as unknown as number);
      return expiresAt > now;
    });

    return NextResponse.json({ invitations: validInvitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
