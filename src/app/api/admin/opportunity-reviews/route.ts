import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateOpportunity, type OpportunityKind } from "@/lib/opportunity-posting";
import { EmployerApiError } from "@/lib/server/employer-auth";
import { PRIVATE_COLLECTION } from "@/lib/server/organization-opportunities";
import { serialize } from "@/lib/server/public-ownership";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const KINDS: OpportunityKind[] = ["events", "scholarships"];

function failure(error: unknown) {
  if (error instanceof EmployerApiError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore });
  console.error("[opportunity-reviews]", error);
  return NextResponse.json({ error: "Unable to update the review. Please try again." }, { status: 500, headers: noStore });
}

/** First free events and scholarships waiting for an IOPPS review, oldest first. */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminToken(req);
  if (!auth.success) return auth.response;
  try {
    const snapshot = await getAdminDb().collection(PRIVATE_COLLECTION).where("status", "==", "pending").limit(100).get();
    const listings = snapshot.docs.map(doc => serialize(doc.data()) as Record<string, unknown>)
      .filter(record => KINDS.includes(record.kind as OpportunityKind) && typeof record.id === "string")
      .sort((a, b) => String(a.reviewRequestedAt || "").localeCompare(String(b.reviewRequestedAt || "")));
    return NextResponse.json({ listings }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminToken(req);
  if (!auth.success) return auth.response;
  try {
    const body = await req.json();
    const { kind, id, revision, action } = body ?? {};
    if (!KINDS.includes(kind) || typeof id !== "string" || !/^[^/]{1,200}$/.test(id) || !Number.isSafeInteger(revision) || !["approve", "changes_requested", "reject"].includes(action)) throw new EmployerApiError(400, "Choose a listing and a valid review decision.");
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
    if (feedback.length > 2000 || (action !== "approve" && feedback.length < 10)) throw new EmployerApiError(400, "Explain the decision in 10–2,000 characters so the organization knows what to change.");
    const db = getAdminDb();
    const draftRef = db.collection(PRIVATE_COLLECTION).doc(`${kind}-${id}`), publicRef = db.collection(kind).doc(id);
    const result = await db.runTransaction(async tx => {
      const [draftDoc, publicDoc] = await tx.getAll(draftRef, publicRef);
      const draft = draftDoc.data();
      if (!draft || draft.status !== "pending" || draft.revision !== revision) throw new EmployerApiError(409, "This listing changed or was already reviewed. Refresh the queue before deciding.");
      const orgId = String(draft.orgId || draft.employerId || "");
      if (!orgId || orgId.includes("/")) throw new EmployerApiError(409, "This listing has no organization. Ask the organization to resubmit it.");
      const publicData = publicDoc.data();
      if (publicData && ![draft.orgId, draft.employerId].includes(publicData.orgId || publicData.employerId)) throw new EmployerApiError(409, "Another listing already uses this address.");
      const orgRef = db.collection("organizations").doc(orgId);
      const org = await tx.get(orgRef);
      const now = new Date().toISOString();
      const decision = action === "approve" ? "active" : action === "reject" ? "rejected" : "changes_requested";
      const reviewed = { reviewedAt: now, reviewedBy: auth.decodedToken.uid, reviewFeedback: feedback || null, updatedAt: now, revision: revision + 1 };
      if (decision === "active") {
        // The listing was checked when it was submitted; recheck in case the rules have changed since.
        const checked = validateOpportunity(kind, draft, "active", draft);
        if (Object.keys(checked.errors).length) throw new EmployerApiError(422, "This listing is missing required details. Request changes instead.");
        tx.set(publicRef, { ...draft, ...checked.data, ...reviewed, status: "active", active: true, firstPublishedAt: draft.firstPublishedAt || now });
        tx.delete(draftRef);
        // After one approval, the organization's later free listings publish immediately.
        if (org.exists && !org.data()?.freeListingApprovedAt) tx.set(orgRef, { freeListingApprovedAt: now, freeListingApprovedBy: auth.decodedToken.uid }, { merge: true });
      } else {
        tx.set(draftRef, { ...draft, ...reviewed, status: decision, active: false });
      }
      const label = kind === "events" ? "Event" : "Scholarship";
      const outcome = decision === "active" ? "approved and published" : decision === "rejected" ? "not approved" : "sent back for changes";
      if (org.exists) tx.set(orgRef.collection("activity").doc(), { type: "listing_review", message: `${label} "${String(draft.title || "Untitled")}" ${outcome}.`, timestamp: FieldValue.serverTimestamp() });
      return { kind, id, status: decision, slug: draft.slug || id };
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return failure(error); }
}
