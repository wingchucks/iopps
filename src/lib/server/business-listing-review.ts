import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError } from "@/lib/server/employer-auth";
import { getBusinessListingReview, businessListingIssues, type BusinessListingReview } from "@/lib/business-listing-review";
import { toPublicOrganization } from "@/lib/public-organization";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";

export function listingReviewPayload(id: string, data: Record<string, unknown>) {
  return {
    org: toPublicOrganization({ ...data, id }),
    review: getBusinessListingReview(data),
    issues: businessListingIssues(data),
    isPublic: isOrganizationPubliclyVisible(data),
    emailVerified: data.emailVerified === true,
  };
}

export function reviewError(error: unknown) {
  if (error instanceof EmployerApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  console.error("[business-listing-review]", error);
  return NextResponse.json({ error: "Unable to update the listing review. Please try again." }, { status: 500 });
}

export function recordReviewChange(tx: FirebaseFirestore.Transaction, orgId: string, employerId: string, review: BusinessListingReview, actorId: string, message: string) {
  const db = getAdminDb();
  const orgRef = db.collection("organizations").doc(orgId);
  const updatedAt = FieldValue.serverTimestamp();
  tx.update(orgRef, { directoryReview: review, updatedAt });
  // Mirrored review state also protects legacy employer slug lookups.
  tx.set(db.collection("employers").doc(employerId), { directoryReview: review, updatedAt }, { merge: true });
  tx.set(orgRef.collection("listingReviews").doc(), { ...review, actorId, message, createdAt: updatedAt });
  tx.set(orgRef.collection("activity").doc(), { type: "listing_review", message, timestamp: updatedAt });
}
