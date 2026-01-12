import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TeamRole, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH - Update team member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const { memberId } = await params;

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
    const members: TeamMember[] = employerData?.teamMembers || [];

    const memberIndex = members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const body = await request.json();
    const { role } = body;

    const validRoles: TeamRole[] = ["admin", "editor", "viewer"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Update the member's role
    const updatedMembers = [...members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      role,
    };

    await employerRef.update({
      teamMembers: updatedMembers,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      member: updatedMembers[memberIndex],
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }

    const { memberId } = await params;

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
    const members: TeamMember[] = employerData?.teamMembers || [];

    const memberToRemove = members.find((m) => m.id === memberId);
    if (!memberToRemove) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    // Remove the member
    const updatedMembers = members.filter((m) => m.id !== memberId);

    await employerRef.update({
      teamMembers: updatedMembers,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
