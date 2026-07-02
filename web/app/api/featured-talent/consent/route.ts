import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildFeaturedTalentConsentUpdate,
  normalizeFeaturedTalentConsentChoice,
} from "@/lib/featured-talent-consent.mjs";

const INVITES_COLLECTION = "featuredTalentConsentInvites";
const DEFAULT_MEMBER_COLLECTION = "memberProfiles";

function redirectTo(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/featured-talent/consent?status=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  if (!adminDb) return redirectTo(request, "server-error");

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const choice = normalizeFeaturedTalentConsentChoice(searchParams.get("choice"));

  if (!token || !choice) return redirectTo(request, "invalid");

  const inviteRef = adminDb.collection(INVITES_COLLECTION).doc(token);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) return redirectTo(request, "invalid");

  const invite = inviteSnap.data() || {};
  if (invite.usedAt) return redirectTo(request, "already-used");

  const expiresAt = invite.expiresAt;
  if (expiresAt?.toDate && expiresAt.toDate().getTime() < Date.now()) {
    await inviteRef.update({ status: "expired", expiredAt: FieldValue.serverTimestamp() });
    return redirectTo(request, "expired");
  }

  const nowIso = new Date().toISOString();
  const featuredTalentUpdate = buildFeaturedTalentConsentUpdate({
    choice,
    consentedAt: choice === "yes" ? nowIso : null,
    declinedAt: choice === "no" ? nowIso : null,
    scheduledFor: choice === "yes" ? invite.scheduledFor || null : null,
  });

  const batch = adminDb.batch();
  batch.update(inviteRef, {
    status: choice === "yes" ? "consented" : "declined",
    choice,
    usedAt: FieldValue.serverTimestamp(),
    respondedAt: FieldValue.serverTimestamp(),
  });

  const memberId = invite.memberId || invite.uid;
  if (memberId) {
    const memberCollection = invite.memberCollection || DEFAULT_MEMBER_COLLECTION;
    batch.set(
      adminDb.collection(memberCollection).doc(memberId),
      {
        ...featuredTalentUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();

  return redirectTo(request, choice === "yes" ? "yes" : "no");
}
