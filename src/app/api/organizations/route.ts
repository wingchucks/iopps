import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60;

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnersOnly = searchParams.get("partners") === "true";

    const db = getAdminDb();
    let snapshot;

    if (partnersOnly) {
      // Partners page: only paid plans or verified orgs
      const [premiumSnap, verifiedSnap] = await Promise.all([
        db.collection("organizations")
          .where("plan", "in", ["premium", "standard", "school"])
          .get(),
        db.collection("organizations")
          .where("verified", "==", true)
          .get(),
      ]);
      const seen = new Set<string>();
      const docs = [...premiumSnap.docs, ...verifiedSnap.docs].filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      const orgs = docs.map(doc => serialize({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ orgs });
    }

    // Search / general: all orgs that completed onboarding
    snapshot = await db
      .collection("organizations")
      .where("onboardingComplete", "==", true)
      .get();

    const orgs = snapshot.docs.map((doc) =>
      serialize({ id: doc.id, ...doc.data() })
    );

    return NextResponse.json({ orgs });
  } catch (err) {
    console.error("[api/organizations] Error:", err);
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });
  }
}
