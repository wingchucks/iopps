import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) return NextResponse.json({ error: "Org not found" }, { status: 404 });
  const org = orgDoc.data()!;

  // Get owner email
  const ownerDoc = await adminDb.collection("users").doc(org.ownerUid).get();
  const ownerEmail = ownerDoc.data()?.email;

  if (!ownerEmail) return NextResponse.json({ error: "Owner email not found" }, { status: 404 });

  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // For now, log and create notification
  console.log(`[Email] Sending approval email to ${ownerEmail} for org ${org.name}`);

  await adminDb.collection("notifications").add({
    uid: org.ownerUid,
    type: "org_verified",
    title: "Organization Verified!",
    body: `Your organization "${org.name}" has been verified on IOPPS.ca`,
    link: "/dashboard",
    read: false,
    emailSent: true,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true, email: ownerEmail });
}
