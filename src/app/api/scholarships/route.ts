import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deriveOwnerType,
  matchesOrgName,
  serialize,
  withPublicOwnership,
  type JsonRecord,
} from "@/lib/server/public-ownership";

export const runtime = "nodejs";
export const revalidate = 60;

function normalizeScholarship(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  orgLookup: Map<string, JsonRecord>,
  organizations: JsonRecord[],
): Record<string, unknown> {
  const serialized = serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>;
  if (!serialized.slug) serialized.slug = doc.id;
  if (!serialized.orgName && typeof serialized.organization === "string") {
    serialized.orgName = serialized.organization;
  }
  if (!serialized.applicationUrl && typeof serialized.url === "string") {
    serialized.applicationUrl = serialized.url;
  }

  const linkedOrg =
    orgLookup.get(String(serialized.orgId || serialized.employerId || "")) ||
    organizations.find((org) =>
      matchesOrgName(serialized.orgName, String(org.name || "")) ||
      matchesOrgName(serialized.organization, String(org.name || "")),
    ) ||
    null;

  const ownerType = deriveOwnerType(linkedOrg);
  const ownerId = String(serialized.orgId || serialized.employerId || linkedOrg?.id || "");
  const ownerName = String(serialized.orgName || serialized.organization || linkedOrg?.name || "");
  const ownerSlug = String(linkedOrg?.slug || ownerId);

  return withPublicOwnership(serialized, {
    contentType: "scholarship",
    ownerType,
    ownerId,
    ownerName,
    ownerSlug,
  });
}

export async function GET() {
  try {
    const db = getAdminDb();
    const [snap, organizationsSnap] = await Promise.all([
      db.collection("scholarships").where("status", "==", "active").get(),
      db.collection("organizations").get(),
    ]);
    const organizations = organizationsSnap.docs.map((doc) => serialize({ id: doc.id, ...doc.data() }) as JsonRecord);
    const orgLookup = new Map(organizations.map((org) => [String(org.id || ""), org]));

    const scholarships = snap.docs.map((doc) => normalizeScholarship(doc, orgLookup, organizations));
    return NextResponse.json({ scholarships });
  } catch (err) {
    console.error("Scholarships API error:", err);
    return NextResponse.json({ error: "Failed to load scholarships" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status: newStatus, fromStatus } = body;

    if (!newStatus || !fromStatus) {
      return NextResponse.json({ error: "status and fromStatus required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("scholarships")
      .where("status", "==", fromStatus)
      .get();

    if (snap.empty) {
      return NextResponse.json({ updated: 0, message: `No scholarships with status '${fromStatus}'` });
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { status: newStatus }));
    await batch.commit();

    return NextResponse.json({ updated: snap.size, message: `Updated ${snap.size} from '${fromStatus}' to '${newStatus}'` });
  } catch (err) {
    console.error("Scholarships PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
