import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { orgId } = await params;
  const doc = await adminDb.collection("organizations").doc(orgId).get();
  if (!doc.exists) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const data = doc.data()!;

  // Return public fields only
  const org = {
    id: doc.id,
    name: data.name || "",
    slug: data.slug || "",
    primaryType: data.primaryType || "",
    logoURL: data.logoURL || null,
    industry: data.industry || "",
    size: data.size || "",
    province: data.province || "",
    city: data.city || "",
    website: data.website || "",
    description: data.description || "",
    indigenousOwned: data.indigenousOwned || false,
    verification: data.verification || "unverified",
    subscription: {
      tier: data.subscription?.tier || "none",
    },
  };

  return NextResponse.json({ org });
}
