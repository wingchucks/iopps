import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeOrganizationProfilePatch } from "@/lib/organization-profile";
import { isPublicContactEmailValid } from "@/lib/public-organization";
import { buildSchoolVisibilityPatch, isSchoolOrganization } from "@/lib/school-visibility";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { reviewAfterProfileEdit } from "@/lib/business-listing-review";
import { recordReviewChange, reviewError } from "@/lib/server/business-listing-review";

export async function PUT(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "Only an organization owner or manager can edit this profile.");
    const body = await req.json();
    const { updates, touchedFields } = normalizeOrganizationProfilePatch(body as Record<string, unknown>);
    if (!touchedFields.length) throw new EmployerApiError(400, "No valid fields to update.");
    // Blank hides the public email; anything else must be a real address.
    if (typeof updates.publicContactEmail === "string" && updates.publicContactEmail && !isPublicContactEmailValid(updates.publicContactEmail)) {
      throw new EmployerApiError(400, "Enter a valid public contact email, or leave it blank to show no email.");
    }
    const db = getAdminDb();
    const result = await db.runTransaction(async tx => {
      const ref = db.collection("organizations").doc(context.orgId);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new EmployerApiError(404, "Organization not found.");
      const data = snapshot.data()!;
      const school = isSchoolOrganization(data);
      if (school && typeof updates.isPublished === "boolean") Object.assign(updates, buildSchoolVisibilityPatch(updates.isPublished));
      const review = school ? null : reviewAfterProfileEdit(data, updates);
      if (review && review.revision !== (data.directoryReview?.revision ?? 0)) {
        recordReviewChange(tx, context.orgId, context.employerId, review, context.uid, "Public profile edited. Save all sections, then submit the listing for review.");
      }
      tx.update(ref, { ...updates, updatedAt: FieldValue.serverTimestamp() });
      tx.set(ref.collection("activity").doc(), { type: "profile_update", message: `Profile updated: ${touchedFields.join(", ")}`, timestamp: FieldValue.serverTimestamp() });
      return { success: true, updates, directoryReview: review };
    });
    return NextResponse.json(result);
  } catch (error) { return reviewError(error); }
}
