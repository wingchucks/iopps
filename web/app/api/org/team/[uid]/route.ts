import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { uid } = await params;

  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", authResult.decodedToken.uid).limit(1).get();
  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgRef = orgSnap.docs[0].ref;
  const orgData = orgSnap.docs[0].data();

  // Find the member entry to remove
  const memberEntry = orgData.teamMembers?.find((m: { uid: string }) => m.uid === uid);
  if (!memberEntry) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Don't allow removing admin
  if (memberEntry.role === "admin") {
    return NextResponse.json({ error: "Cannot remove admin" }, { status: 403 });
  }

  await orgRef.update({
    teamMemberIds: FieldValue.arrayRemove(uid),
    teamMembers: FieldValue.arrayRemove(memberEntry),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
