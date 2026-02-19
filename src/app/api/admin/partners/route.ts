import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const snapshot = await adminDb.collection("partners").orderBy("order", "asc").get();
  const partners = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ partners });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  // Get max order
  const snapshot = await adminDb.collection("partners").orderBy("order", "desc").limit(1).get();
  const maxOrder = snapshot.empty ? 0 : (snapshot.docs[0].data().order || 0);

  const partner = {
    name: body.name || "",
    logoUrl: body.logoUrl || "",
    websiteUrl: body.websiteUrl || "",
    tier: body.tier || "Standard",
    visible: true,
    spotlight: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection("partners").add(partner);

  return NextResponse.json({ id: docRef.id, ...partner }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const body = await request.json();
  const { partners } = body as { partners: { id: string; order: number }[] };

  const batch = adminDb.batch();
  for (const p of partners) {
    const ref = adminDb.collection("partners").doc(p.id);
    batch.update(ref, { order: p.order, updatedAt: new Date().toISOString() });
  }
  await batch.commit();

  return NextResponse.json({ success: true });
}
