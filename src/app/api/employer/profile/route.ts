import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeOrganizationProfilePatch } from "@/lib/organization-profile";
import { isPublicContactEmailValid } from "@/lib/public-organization";
import { buildSchoolVisibilityPatch, isSchoolOrganization } from "@/lib/school-visibility";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { reviewAfterProfileEdit } from "@/lib/business-listing-review";
import { recordReviewChange, reviewError } from "@/lib/server/business-listing-review";
import { hasPartnerSubscription } from "@/lib/server/partner-promotion";
import { refreshPublicPartners } from "@/lib/public-partner-cache";

// Public profile links are rendered as clickable links and images, so a new or
// changed link must be a complete web address, matching the directory review rules.
// An empty value clears the field. Unchanged legacy values never block other edits.
function isUnsafeLink(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol !== "http:" && url.protocol !== "https:";
  } catch {
    return true;
  }
}

function normalizeLink(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstInvalidProfileLink(updates: Record<string, unknown>, stored: Record<string, unknown>): string | null {
  const labels: Record<string, string> = { website: "website", logoUrl: "logo", bannerUrl: "banner image" };
  for (const [field, label] of Object.entries(labels)) {
    const previous = field === "logoUrl" ? stored.logoUrl || stored.logo : stored[field];
    if (normalizeLink(updates[field]) !== normalizeLink(previous) && isUnsafeLink(updates[field])) return label;
  }
  const social = updates.socialLinks, storedSocial = (stored.socialLinks || {}) as Record<string, unknown>;
  if (social && typeof social === "object" && Object.entries(social as Record<string, unknown>).some(([key, value]) => normalizeLink(value) !== normalizeLink(storedSocial[key]) && isUnsafeLink(value))) return "social profile links";
  const storedGallery = Array.isArray(stored.gallery) ? stored.gallery.map(normalizeLink) : [];
  if (Array.isArray(updates.gallery) && updates.gallery.some(value => !storedGallery.includes(normalizeLink(value)) && isUnsafeLink(value))) return "gallery images";
  return null;
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "Only an organization owner or manager can edit this profile.");
    const body = await req.json();
    const { updates, touchedFields } = normalizeOrganizationProfilePatch(body as Record<string, unknown>);
    if (!touchedFields.length) throw new EmployerApiError(400, "No valid fields to update.");
    if (Object.hasOwn(updates, "name") && !updates.name) throw new EmployerApiError(400, "Organization name is required.");
    // Blank hides the public email; anything else must be a real address.
    if (typeof updates.publicContactEmail === "string" && updates.publicContactEmail && !isPublicContactEmailValid(updates.publicContactEmail)) {
      throw new EmployerApiError(400, "Enter a valid public contact email, or leave it blank to show no email.");
    }
    const db = getAdminDb();
    // Only an organization with a partner plan can be on the cached partner cards.
    let partnerCardChanged = false;
    const result = await db.runTransaction(async tx => {
      const ref = db.collection("organizations").doc(context.orgId);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new EmployerApiError(404, "Organization not found.");
      const data = snapshot.data()!;
      partnerCardChanged = hasPartnerSubscription(data);
      const invalidLink = firstInvalidProfileLink(updates, data);
      if (invalidLink) throw new EmployerApiError(400, `Use a complete link that starts with https:// or http:// for your ${invalidLink}.`);
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
    if (partnerCardChanged) refreshPublicPartners();
    return NextResponse.json(result);
  } catch (error) { return reviewError(error); }
}
