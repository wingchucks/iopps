import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb || !adminAuth) return NextResponse.json({ error: "Not initialized" }, { status: 500 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", authResult.decodedToken.uid).limit(1).get();
  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgRef = orgSnap.docs[0].ref;
  const orgData = orgSnap.docs[0].data();

  if ((orgData.teamMemberIds || []).length >= 5) {
    return NextResponse.json({ error: "Maximum team size reached" }, { status: 400 });
  }

  // Find user by email
  let invitedUser;
  try {
    invitedUser = await adminAuth.getUserByEmail(email);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (orgData.teamMemberIds?.includes(invitedUser.uid)) {
    return NextResponse.json({ error: "Already a team member" }, { status: 409 });
  }

  await orgRef.update({
    teamMemberIds: FieldValue.arrayUnion(invitedUser.uid),
    teamMembers: FieldValue.arrayUnion({
      uid: invitedUser.uid,
      email: invitedUser.email,
      role: "member",
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    member: {
      uid: invitedUser.uid,
      email: invitedUser.email || email,
      role: "member",
      displayName: invitedUser.displayName || null,
    },
  }, { status: 201 });
}
