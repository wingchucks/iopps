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

  let query: FirebaseFirestore.Query = adminDb.collection("vendors").orderBy("name", "asc");
  if (status === "verified") query = query.where("verified", "==", true);
  else if (status === "flagged") query = query.where("flagged", "==", true);

  const snap = await query.limit(200).get();
  const vendors = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Business of the day
  const configDoc = await adminDb.collection("config").doc("shop").get();
  const botdId = configDoc.exists ? configDoc.data()?.businessOfTheDay : null;
  let businessOfTheDay = null;
  if (botdId) {
    const botdDoc = await adminDb.collection("vendors").doc(botdId).get();
    if (botdDoc.exists) businessOfTheDay = { id: botdDoc.id, ...botdDoc.data() };
  }

  return NextResponse.json({ vendors, businessOfTheDay });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { action, id } = await request.json();
  if (!action || !id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ref = adminDb.collection("vendors").doc(id);

  switch (action) {
    case "feature":
      await ref.update({ featured: true });
      break;
    case "unfeature":
      await ref.update({ featured: false });
      break;
    case "dismiss-flag":
      await ref.update({ flagged: false, flagReason: "" });
      break;
    case "suspend":
      await ref.update({ suspended: true, flagged: false });
      break;
    case "remove":
      await ref.delete();
      break;
    case "set-business-of-day":
      await adminDb.collection("config").doc("shop").set({ businessOfTheDay: id }, { merge: true });
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
