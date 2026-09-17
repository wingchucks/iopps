import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { businessListingIssues, getBusinessListingReview, newBusinessListingReview } from "@/lib/business-listing-review";
import { listingReviewPayload, recordReviewChange, reviewError } from "@/lib/server/business-listing-review";
import { isSchoolOrganization } from "@/lib/school-visibility";

export const dynamic = "force-dynamic";

async function ownerContext(req: Request) {
  const context = await requireEmployerContext(req);
  if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "Only an organization owner or manager can submit a listing.");
  if (isSchoolOrganization(context.organizationData)) throw new EmployerApiError(400, "School profiles use the school publishing workflow.");
  return context;
}

export async function GET(req: Request) {
  try {
    const context = await ownerContext(req);
    return NextResponse.json(listingReviewPayload(context.orgId, context.organizationData));
  } catch (error) { return reviewError(error); }
}

export async function POST(req: Request) {
  try {
    const context = await ownerContext(req);
    if (!context.emailVerified) throw new EmployerApiError(403, "Verify your sign-in email before submitting your listing.");
    const body = await req.json();
    const db = getAdminDb();
    const result = await db.runTransaction(async tx => {
      const snapshot = await tx.get(db.collection("organizations").doc(context.orgId));
      if (!snapshot.exists) throw new EmployerApiError(404, "Organization not found.");
      const data = snapshot.data()!;
      const current = getBusinessListingReview(data) ?? newBusinessListingReview();
      if (body.revision !== current.revision) throw new EmployerApiError(409, "Your profile changed. Refresh the page before submitting.");
      if (current.status === "pending" || current.status === "approved") return listingReviewPayload(context.orgId, data);
      const issues = businessListingIssues(data);
      if (issues.length) throw new EmployerApiError(422, issues.join(" "));
      if (current.submittedRevision === current.revision && ["changes_requested", "rejected"].includes(current.status)) {
        throw new EmployerApiError(422, "Update and save your profile to address the review feedback before resubmitting.");
      }
      const review = { ...current, status: "pending" as const, submittedRevision: current.revision, submittedAt: new Date().toISOString(), submittedBy: context.uid, approvedRevision: 0 };
      recordReviewChange(tx, context.orgId, context.employerId, review, context.uid, "Business listing submitted for review.");
      tx.update(snapshot.ref, { emailVerified: true });
      tx.set(db.collection("adminNotifications").doc(), { title: "Business listing ready for review", message: `${data.name} submitted a directory listing.`, type: "info", read: false, orgId: context.orgId, link: "/admin/business-reviews", createdAt: FieldValue.serverTimestamp() });
      return listingReviewPayload(context.orgId, { ...data, directoryReview: review, emailVerified: true });
    });
    return NextResponse.json(result);
  } catch (error) { return reviewError(error); }
}
