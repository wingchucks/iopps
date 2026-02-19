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

  const status = request.nextUrl.searchParams.get("status");

  let query: FirebaseFirestore.Query = adminDb.collection("livestreams").orderBy("startedAt", "desc");
  if (status === "live") query = query.where("status", "==", "live");
  else if (status === "archived") query = query.where("status", "==", "archived");

  const snap = await query.limit(100).get();
  const livestreams = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ livestreams });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { action, id, category } = await request.json();
  if (!action || !id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ref = adminDb.collection("livestreams").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (action) {
    case "archive":
      await ref.update({ status: "archived" });
      break;
    case "restore":
      await ref.update({ status: "ended" });
      break;
    case "remove":
      await ref.delete();
      break;
    case "update-category":
      if (!category) return NextResponse.json({ error: "Missing category" }, { status: 400 });
      await ref.update({ category });
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
