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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const choice = normalizeFeaturedTalentConsentChoice(searchParams.get("choice"));

  if (!token || !choice) return redirectTo(request, "invalid");

  const confirmUrl = new URL("/featured-talent/consent", request.url);
  confirmUrl.searchParams.set("token", token);
  confirmUrl.searchParams.set("choice", choice);
  return NextResponse.redirect(confirmUrl);
}

export async function POST(request: NextRequest) {
  if (!adminDb) return redirectTo(request, "server-error");
  const db = adminDb;

  const formData = await request.formData();
  const token = String(formData.get("token") || "").trim();
  const choice = normalizeFeaturedTalentConsentChoice(String(formData.get("choice") || ""));

  if (!token || !choice) return redirectTo(request, "invalid");

  const inviteRef = db.collection(INVITES_COLLECTION).doc(token);

  const result = await db.runTransaction(async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);

    if (!inviteSnap.exists) return "invalid";

    const invite = inviteSnap.data() || {};
    if (invite.usedAt) return "already-used";

    const expiresAt = invite.expiresAt;
    if (expiresAt?.toDate && expiresAt.toDate().getTime() < Date.now()) {
      transaction.update(inviteRef, {
        status: "expired",
        expiredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "expired";
    }

    const nowIso = new Date().toISOString();
    const featuredTalentUpdate = buildFeaturedTalentConsentUpdate({
      choice,
      consentedAt: choice === "yes" ? nowIso : null,
      declinedAt: choice === "no" ? nowIso : null,
      scheduledFor: choice === "yes" ? invite.scheduledFor || null : null,
    });

    transaction.update(inviteRef, {
      status: choice === "yes" ? "consented" : "declined",
      choice,
      usedAt: FieldValue.serverTimestamp(),
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const memberId = invite.memberId || invite.uid;
    if (memberId) {
      const memberCollection = invite.memberCollection || DEFAULT_MEMBER_COLLECTION;
      transaction.set(
        db.collection(memberCollection).doc(memberId),
        {
          ...featuredTalentUpdate,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return choice;
  });

  return redirectTo(request, result === "yes" ? "yes" : result === "no" ? "no" : result);
}
