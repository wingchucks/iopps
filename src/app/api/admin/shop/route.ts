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

  try {
    let query: FirebaseFirestore.Query = adminDb.collection("vendors");

    if (status === "verified") {
      query = query.where("verified", "==", true);
    } else if (status === "flagged") {
      query = query.where("flagged", "==", true);
    } else if (status === "featured") {
      query = query.where("featured", "==", true);
    }

    // Try ordering by name; fall back without if index missing
    let snap;
    try {
      snap = await query.orderBy("name", "asc").limit(200).get();
    } catch {
      snap = await query.limit(200).get();
    }

    const vendors = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "Unknown",
        category: d.category || "Unknown",
        verified: d.verified || false,
        featured: d.featured || false,
        flagged: d.flagged || false,
        flagReason: d.flagReason || "",
        suspended: d.suspended || false,
        viewCount: d.viewCount || d.views || 0,
        clickCount: d.clickCount || d.clicks || 0,
        image: d.image || d.imageUrl || "",
        badges: d.badges || [],
        tribalAffiliation: d.tribalAffiliation || "",
      };
    });

    // Business of the day
    const configDoc = await adminDb.collection("config").doc("shop").get();
    const botdId = configDoc.exists ? configDoc.data()?.businessOfTheDay : null;
    let businessOfTheDay = null;
    if (botdId) {
      const botdDoc = await adminDb.collection("vendors").doc(botdId).get();
      if (botdDoc.exists) {
        const d = botdDoc.data()!;
        businessOfTheDay = {
          id: botdDoc.id,
          name: d.name || "Unknown",
          category: d.category || "Unknown",
          verified: d.verified || false,
          featured: d.featured || false,
          flagged: d.flagged || false,
          suspended: d.suspended || false,
          viewCount: d.viewCount || 0,
          clickCount: d.clickCount || 0,
          badges: d.badges || [],
        };
      }
    }

    return NextResponse.json({ vendors, businessOfTheDay });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    return NextResponse.json({ vendors: [], businessOfTheDay: null });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const body = await request.json();
  const { action, id, badges } = body;
  if (!action || !id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ref = adminDb.collection("vendors").doc(id);

  switch (action) {
    case "feature":
      await ref.update({ featured: true });
      break;
    case "unfeature":
      await ref.update({ featured: false });
      break;
    case "verify":
      await ref.update({ verified: true });
      break;
    case "unverify":
      await ref.update({ verified: false });
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
    case "update-badges":
      if (!Array.isArray(badges)) return NextResponse.json({ error: "badges must be an array" }, { status: 400 });
      await ref.update({ badges });
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
