import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 120;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getAdminDb();

    // 1. Try direct doc lookup (existing partners use slug as doc ID)
    const directDoc = await db.collection("organizations").doc(slug).get();
    if (directDoc.exists) {
      return NextResponse.json({
        org: serialize({ id: directDoc.id, ...directDoc.data() }),
      });
    }

    // 2. Query by slug field (new employers use UID as doc ID, slug as field)
    const slugQuery = await db
      .collection("organizations")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      return NextResponse.json({
        org: serialize({ id: doc.id, ...doc.data() }),
      });
    }

    // 3. Try employers collection by slug (some orgs might only exist there)
    const empQuery = await db
      .collection("employers")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!empQuery.empty) {
      const doc = empQuery.docs[0];
      return NextResponse.json({
        org: serialize({ id: doc.id, ...doc.data() }),
      });
    }

    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  } catch (err) {
    console.error("[api/org] Error:", err);
    return NextResponse.json({ error: "Failed to load organization" }, { status: 500 });
  }
}
