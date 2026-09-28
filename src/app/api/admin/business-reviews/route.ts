import { NextResponse, type NextRequest } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError } from "@/lib/server/employer-auth";
import { EXISTING_LISTING_REVIEW, LISTING_REVIEW_STATUSES, businessListingIssues, businessLocationIssue, getBusinessListingReview } from "@/lib/business-listing-review";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";
import { listingReviewPayload, recordReviewChange, reviewError } from "@/lib/server/business-listing-review";

export const dynamic = "force-dynamic";

/** Public directory listings whose location is missing, outside Canada or needs a person to check. */
async function locationReviewListings() {
  const db = getAdminDb();
  // The same candidates as the public directory in /api/organizations.
  const snapshots = await Promise.all((["onboardingComplete", "verified"] as const).map(field => db.collection("organizations").where(field, "==", true).get())
    .concat(db.collection("organizations").where("status", "==", "approved").get()));
  const docs = [...new Map(snapshots.flatMap(snapshot => snapshot.docs).map(doc => [doc.id, doc])).values()];
  const missing = businessLocationIssue(null);
  return docs
    .filter(doc => { const org = normalizeOrganizationRecord({ ...doc.data(), id: doc.id } as Record<string, unknown>); return !isSchoolOrganization(org) && isOrganizationPubliclyVisible(org); })
    .map(doc => listingReviewPayload(doc.id, doc.data()))
    .filter(item => item.locationIssue || item.warnings.length)
    // Locations that look wrong come before ones that are simply missing.
    .sort((a, b) => Number(a.locationIssue === missing) - Number(b.locationIssue === missing) || String(a.org.name ?? "").localeCompare(String(b.org.name ?? "")));
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminToken(req);
  if (!auth.success) return auth.response;
  try {
    const status = req.nextUrl.searchParams.get("status") || "pending";
    if (status === "location") return NextResponse.json({ listings: await locationReviewListings(), nextCursor: null });
    if (!LISTING_REVIEW_STATUSES.some(value => value === status)) throw new EmployerApiError(400, "Unknown review status.");
    let query = getAdminDb().collection("organizations").where("directoryReview.status", "==", status).orderBy(FieldPath.documentId()).limit(26);
    const cursor = req.nextUrl.searchParams.get("cursor");
    if (cursor) {
      if (cursor.includes("/")) throw new EmployerApiError(400, "Invalid page cursor.");
      query = query.startAfter(cursor);
    }
    const snapshot = await query.get();
    return NextResponse.json({ listings: snapshot.docs.slice(0, 25).map(doc => listingReviewPayload(doc.id, doc.data())), nextCursor: snapshot.size > 25 ? snapshot.docs[24].id : null });
  } catch (error) { return reviewError(error); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminToken(req);
  if (!auth.success) return auth.response;
  try {
    const body = await req.json();
    const { orgId, revision, action } = body;
    if (typeof orgId !== "string" || !orgId || orgId.includes("/") || !Number.isSafeInteger(revision) || !["approve", "changes_requested", "reject"].includes(action)) throw new EmployerApiError(400, "Choose a listing and a valid review decision.");
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
    if (feedback.length > 2000 || (action !== "approve" && feedback.length < 10)) throw new EmployerApiError(400, "Explain the decision in 10–2,000 characters so the owner knows what to change.");
    const db = getAdminDb();
    const result = await db.runTransaction(async tx => {
      const snapshot = await tx.get(db.collection("organizations").doc(orgId));
      if (!snapshot.exists) throw new EmployerApiError(404, "Listing not found.");
      const data = snapshot.data()!;
      // A public listing from before directory review can be sent back for changes, never re-approved here.
      const current = getBusinessListingReview(data) ?? (action !== "approve" && isOrganizationPubliclyVisible(data) ? EXISTING_LISTING_REVIEW : null);
      if (!current || current.revision !== revision || body.status !== current.status || !(current.status === "pending" || (current.status === "approved" && action !== "approve"))) throw new EmployerApiError(409, "This listing has changed or was already reviewed. Refresh the queue before deciding.");
      if (action === "approve") {
        if (current.submittedRevision !== revision) throw new EmployerApiError(409, "The submitted profile changed. Ask the owner to resubmit.");
        const issues = businessListingIssues(data);
        if (data.emailVerified !== true) issues.push("The sign-in email must be verified.");
        if (data.disabled === true || ["rejected", "disabled", "deleted", "archived"].includes(String(data.status))) issues.push("This organization account is restricted.");
        if (issues.length) throw new EmployerApiError(422, issues.join(" "));
      }
      const status = action === "approve" ? "approved" as const : action === "reject" ? "rejected" as const : "changes_requested" as const;
      const review = { ...current, status, approvedRevision: status === "approved" ? revision : 0, feedback, reviewedAt: new Date().toISOString(), reviewedBy: auth.decodedToken.uid };
      const employerId = typeof data.employerId === "string" && data.employerId ? data.employerId : orgId;
      recordReviewChange(tx, orgId, employerId, review, auth.decodedToken.uid, `Business listing ${status.replaceAll("_", " ")}.`);
      return listingReviewPayload(orgId, { ...data, directoryReview: review });
    });
    return NextResponse.json(result);
  } catch (error) { return reviewError(error); }
}
