import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const verification = searchParams.get("verification");
  const search = searchParams.get("search");
  const feedSync = searchParams.get("feedSync");
  const tier = searchParams.get("tier");
  const sort = searchParams.get("sort") || "createdAt_desc";

  // Single org lookup
  if (id) {
    const doc = await adminDb.collection("organizations").doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ organizations: [{ id: doc.id, ...doc.data() }] });
  }

  const unlinked = searchParams.get("unlinked");
  const includeOwner = searchParams.get("includeOwner");

  let query: FirebaseFirestore.Query = adminDb.collection("organizations");

  if (verification) query = query.where("verification", "==", verification);
  if (feedSync === "true") query = query.where("feedSync.enabled", "==", true);
  if (tier) {
    const tiers = tier.split(",");
    query = query.where("subscription.tier", "in", tiers);
  }
  if (unlinked === "true") query = query.where("ownerUid", "==", "");

  const [sortField, sortDir] = sort.split("_");
  query = query.orderBy(sortField || "createdAt", (sortDir as "asc" | "desc") || "desc");
  query = query.limit(100);

  const snapshot = await query.get();
  let orgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (search) {
    const q = search.toLowerCase();
    orgs = orgs.filter((o: Record<string, unknown>) =>
      (o.name as string)?.toLowerCase().includes(q)
    );
  }

  // Optionally resolve owner info
  if (includeOwner === "true") {
    const ownerUids = [...new Set(orgs.map((o: Record<string, unknown>) => o.ownerUid as string).filter(Boolean))];
    const ownerMap: Record<string, { displayName: string; email: string }> = {};
    // Firestore 'in' queries support max 30 items per batch
    for (let i = 0; i < ownerUids.length; i += 30) {
      const batch = ownerUids.slice(i, i + 30);
      const usersSnap = await adminDb.collection("users").where("uid", "in", batch).get();
      usersSnap.docs.forEach((doc) => {
        const d = doc.data();
        ownerMap[d.uid] = { displayName: d.displayName || `${d.firstName} ${d.lastName}`, email: d.email };
      });
    }
    orgs = orgs.map((o: Record<string, unknown>) => ({
      ...o,
      ownerInfo: o.ownerUid ? ownerMap[o.ownerUid as string] || null : null,
    }));
  }

  return NextResponse.json({ organizations: orgs });
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Handle nested feedSync updates
  const flatUpdates: Record<string, unknown> = {};
  if (updates.feedSync) {
    for (const [key, value] of Object.entries(updates.feedSync)) {
      flatUpdates[`feedSync.${key}`] = value;
    }
    delete updates.feedSync;
  }

  Object.assign(flatUpdates, updates);
  flatUpdates.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection("organizations").doc(id).update(flatUpdates);
  return NextResponse.json({ success: true });
}
