import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { sendAdminContentPosted } from "@/lib/email";
import { getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError, requireEmployerContext, type EmployerContext } from "@/lib/server/employer-auth";
import { serialize } from "@/lib/server/public-ownership";
import { isOrganizationPubliclyVisible } from "@/lib/organization-profile";
import { validateOpportunity, type OpportunityKind, type OpportunityStatus } from "@/lib/opportunity-posting";

const noStore = { "Cache-Control": "private, no-store" };
// This collection is denied by the existing default-deny rules. Draft contents
// never enter a publicly readable collection, even before updated rules deploy.
export const PRIVATE_COLLECTION = "organizationOpportunityDrafts";
type Owner = { orgId: string; employerId: string };

/**
 * An organization's first free event or scholarship waits for an IOPPS review; after one
 * approval, later ones publish immediately. Organizations IOPPS already knows publish at once:
 * a verified account, a public directory listing, or any event or scholarship it already
 * published (every public record here was published at some point; drafts stay private).
 */
export async function publishesWithoutReview(db: FirebaseFirestore.Firestore, context: EmployerContext): Promise<boolean> {
  const org = context.organizationData;
  if (org.freeListingApprovedAt || org.verified === true || isOrganizationPubliclyVisible(org)) return true;
  const ownerIds = [...new Set([context.orgId, context.employerId])];
  const published = await Promise.all((["events", "scholarships"] as const).flatMap(kind =>
    (["orgId", "employerId"] as const).map(field => db.collection(kind).where(field, "in", ownerIds).limit(1).get())));
  return published.some(snapshot => !snapshot.empty);
}
function belongsToOrganization(record: Record<string, unknown>, owner: Owner) {
  // A canonical orgId takes precedence over a stale legacy employer link.
  return [owner.orgId, owner.employerId].includes(String(record.orgId || record.employerId || ""));
}
function failure(error: unknown) {
  if (!(error instanceof EmployerApiError)) console.error("Organization opportunity API:", error);
  return NextResponse.json({ error: error instanceof EmployerApiError ? error.message : "Could not save your changes. Please try again." }, { status: error instanceof EmployerApiError ? error.status : 500, headers: noStore });
}
export async function listOrganizationOpportunities(req: Request, kind: OpportunityKind) {
  try {
    const context = await requireEmployerContext(req);
    const db = getAdminDb();
    const ownerIds = [...new Set([context.orgId, context.employerId])];
    const sources = await Promise.all([kind, PRIVATE_COLLECTION].flatMap(collection =>
      ["orgId", "employerId"].map(field => db.collection(collection).where(field, "in", ownerIds).get())));
    const canonical = new Map<string, FirebaseFirestore.DocumentSnapshot>(sources.slice(0, 2).flatMap(snap => snap.docs.map(doc => [doc.id, doc] as const)));
    const privateIds = [...new Set(sources.slice(2).flatMap(snap => snap.docs
      .filter(doc => doc.data().kind === kind).map(doc => doc.data().id)))].filter((id): id is string => typeof id === "string" && /^[^/]{1,200}$/.test(id) && !canonical.has(id));
    // A record moved to another organization may no longer match either query.
    // Its stale private copy must not restore access for the former owner.
    for (let offset = 0; offset < privateIds.length; offset += 200) {
      for (const doc of await db.getAll(...privateIds.slice(offset, offset + 200).map(id => db.collection(kind).doc(id)))) canonical.set(doc.id, doc);
    }
    const records = new Map<string, Record<string, unknown>>();
    sources.forEach((snap, index) => snap.docs.forEach(doc => {
      const data = serialize(doc.data()) as Record<string, unknown>;
      if (!belongsToOrganization(data, context) || (index >= 2 && data.kind !== kind)) return;
      const id = index >= 2 ? String(data.id) : doc.id;
      const authoritative = canonical.get(id);
      if (authoritative?.exists && !belongsToOrganization(authoritative.data() || {}, context)) return;
      records.set(id, { ...data, id, revision: Number(data.revision) || 0 });
    }));
    const items = [...records.values()].filter(item => item.title).sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    return NextResponse.json({ [kind]: items, reviewFirst: !(await publishesWithoutReview(db, context)) }, { headers: noStore });
  } catch (error) { return failure(error); }
}
export async function saveOrganizationOpportunity(req: Request, kind: OpportunityKind, editing = false) {
  try {
    const context = await requireEmployerContext(req);
    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "An organization owner or admin can manage these listings.");
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { throw new EmployerApiError(400, "Send a valid listing."); }
    if (!body || Array.isArray(body) || typeof body !== "object") throw new EmployerApiError(400, "Send a valid listing.");
    const status = (body.status || "draft") as OpportunityStatus;
    if (!["draft", "active", "closed"].includes(status)) throw new EmployerApiError(400, "Choose draft, active or closed.");
    if (status === "active") {
      if (!context.emailVerified) throw new EmployerApiError(403, "Verify your email before publishing. You can save a draft now.");
      if (![context.organizationData, context.employerData, context.userData, context.memberData].some(data => data.onboardingComplete === true)) throw new EmployerApiError(403, "Complete your organization setup before publishing. You can save a draft now.");
    }
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!editing && !/^[a-zA-Z0-9-]{16,100}$/.test(requestId)) throw new EmployerApiError(400, "A request ID is required to prevent duplicate listings.");
    const id = editing ? String(body.id || "") : createHash("sha256").update(`${context.orgId}:${kind}:${requestId}`).digest("hex").slice(0, 28);
    if (!/^[^/]{1,200}$/.test(id)) throw new EmployerApiError(400, "Choose a valid listing.");
    const db = getAdminDb(), publicRef = db.collection(kind).doc(id), draftRef = db.collection(PRIVATE_COLLECTION).doc(`${kind}-${id}`);
    const reviewFirst = status === "active" && !(await publishesWithoutReview(db, context));
    const result = await db.runTransaction(async tx => {
      const [publicDoc, privateDoc] = await Promise.all([tx.get(publicRef), tx.get(draftRef)]);
      const previous = (privateDoc.exists ? privateDoc.data() : publicDoc.data()) || {};
      const exists = privateDoc.exists || publicDoc.exists;
      if ([publicDoc, privateDoc].some(doc => doc.exists && !belongsToOrganization(doc.data() || {}, context))) throw new EmployerApiError(404, "Listing not found.");
      if (!editing && exists) return { record: { ...previous, id }, duplicate: true };
      if (editing && !exists) throw new EmployerApiError(404, "Listing not found.");
      if (editing && (typeof body.revision !== "number" || body.revision !== (Number(previous.revision) || 0))) throw new EmployerApiError(409, "This listing changed in another window. Reload it before saving again.");
      if ([previous, publicDoc.data()].some(data => ["deleted", "rejected", "suspended", "removed", "flagged"].includes(String(data?.status)))) throw new EmployerApiError(403, "This listing needs an administrator’s review before it can be changed.");
      // Closing is always possible without repairing legacy content first.
      const validation = status === "closed" ? { data: previous, errors: {} } : validateOpportunity(kind, body, status, previous);
      if (Object.keys(validation.errors).length) return { errors: validation.errors };
      const orgName = String(context.organizationData.name || context.employerData.organizationName || context.employerData.name || "");
      const slug = String(previous.slug || `${String(validation.data.title || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65)}-${id.slice(-8)}`);
      const now = new Date().toISOString();
      // A first free listing is held privately for review instead of going live.
      const stored = reviewFirst ? "pending" : status;
      const record = { ...validation.data, id, kind, slug, orgId: context.orgId, employerId: context.employerId, orgName,
        ...(kind === "events" ? { organizerName: orgName } : { organization: orgName }),
        status: stored, active: stored === "active", revision: (Number(previous.revision) || 0) + 1,
        createdAt: previous.createdAt || now, updatedAt: now, firstPublishedAt: previous.firstPublishedAt || (stored === "active" ? now : null), order: previous.order || Date.now(),
        ...(stored === "pending" ? { reviewRequestedAt: previous.status === "pending" && previous.reviewRequestedAt ? previous.reviewRequestedAt : now, reviewFeedback: null } : {}) };
      if (stored === "active") {
        tx.set(publicRef, record);
        tx.delete(draftRef);
      } else {
        tx.set(draftRef, record);
        // A tombstone prevents an old feed copy from resurfacing after unpublishing.
        // Only routing and ownership remain public; the draft itself is private.
        // A brand-new draft has no public record at all, including no title-derived slug.
        if (publicDoc.exists) tx.set(publicRef, { id, slug, orgId: context.orgId, employerId: context.employerId, status: stored, active: false, revision: record.revision, updatedAt: now });
      }
      const reviewRequested = stored === "pending" && previous.status !== "pending";
      if (reviewRequested) tx.set(db.collection("adminNotifications").doc(), { title: `${kind === "events" ? "Event" : "Scholarship"} ready for review`, message: `${orgName || "An organization"} submitted its first free listing, "${String((record as Record<string, unknown>).title || "Untitled")}". It stays private until approved.`, type: "info", read: false, orgId: context.orgId, link: "/admin/opportunity-reviews", createdAt: FieldValue.serverTimestamp() });
      return { record, reviewRequested, firstPublication: stored === "active" && !previous.firstPublishedAt && (!exists || ["draft", "pending", "changes_requested"].includes(String(previous.status))) };
    });
    if (result.errors) return NextResponse.json({ error: "Please check the highlighted fields.", fields: result.errors }, { status: 422, headers: noStore });
    // Retain the existing administrator notification, once on first publication.
    // Draft saves, edits, retries and reopening an already published item stay quiet.
    if (result.firstPublication && result.record) {
      const record = result.record as Record<string, unknown>;
      sendAdminContentPosted({
        contentType: kind === "events" ? "event" : "scholarship",
        title: String(record.title || "Opportunity"), status: "active", orgName: String(record.orgName || ""),
        authorName: String(context.userData.displayName || context.memberData.displayName || "") || null,
        authorEmail: String(context.userData.email || context.memberData.email || context.employerData.contactEmail || "") || null,
        id: String(record.id), urlPath: `/${kind}/${record.slug || record.id}`,
      }).catch(error => console.error("Opportunity publication notification:", error));
    }
    if (result.reviewRequested && result.record) {
      const record = result.record as Record<string, unknown>;
      sendAdminContentPosted({
        contentType: kind === "events" ? "event" : "scholarship",
        title: String(record.title || "Opportunity"), status: "waiting for review", orgName: String(record.orgName || ""),
        authorName: String(context.userData.displayName || context.memberData.displayName || "") || null,
        authorEmail: String(context.userData.email || context.memberData.email || context.employerData.contactEmail || "") || null,
        id: String(record.id), urlPath: "/admin/opportunity-reviews",
      }).catch(error => console.error("Opportunity review notification:", error));
    }
    return NextResponse.json(serialize(result.record), { status: editing || result.duplicate ? 200 : 201, headers: noStore });
  } catch (error) { return failure(error); }
}

export async function deleteOrganizationOpportunity(req: Request, kind: OpportunityKind) {
  try {
    const context = await requireEmployerContext(req);
    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "An organization owner or admin can delete listings.");
    const body = await req.json().catch(() => null);
    if (!body || body.confirmDelete !== true || typeof body.id !== "string" || !/^[^/]{1,200}$/.test(body.id)) throw new EmployerApiError(400, "Confirm the listing to delete.");
    const db = getAdminDb();
    const publicRef = db.collection(kind).doc(body.id), privateRef = db.collection(PRIVATE_COLLECTION).doc(`${kind}-${body.id}`);
    await db.runTransaction(async tx => {
      const [publicDoc, privateDoc] = await tx.getAll(publicRef, privateRef);
      const previous = (privateDoc.exists ? privateDoc.data() : publicDoc.data()) || {};
      if ((!publicDoc.exists && !privateDoc.exists) || [publicDoc, privateDoc].some(doc => doc.exists && !belongsToOrganization(doc.data() || {}, context))) throw new EmployerApiError(404, "Listing not found.");
      if (previous.status === "deleted") return;
      if (!["draft", "closed"].includes(String(previous.status))) throw new EmployerApiError(409, "Close the listing before deleting it.");
      if (body.revision !== (Number(previous.revision) || 0)) throw new EmployerApiError(409, "This listing changed. Reload it before deleting.");
      const tombstone = { id: body.id, kind, orgId: context.orgId, employerId: context.employerId, status: "deleted", active: false, revision: (Number(previous.revision) || 0) + 1, deletedAt: new Date().toISOString() };
      // Keep minimal identity so stale feed copies cannot resurrect the listing.
      // Existing attendee/application history is intentionally not erased.
      tx.set(privateRef, tombstone);
      if (publicDoc.exists) tx.set(publicRef, { ...tombstone, ...(previous.slug ? { slug: previous.slug } : {}) });
    });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) { return failure(error); }
}
