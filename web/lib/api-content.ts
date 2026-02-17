import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ContentType } from "@/lib/types";

/**
 * Generic GET/POST handler for content types that all follow the same pattern.
 */
export function createContentHandler(contentType: ContentType) {
  async function GET(request: NextRequest) {
    if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const status = searchParams.get("status") || "active";
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");

    let query: FirebaseFirestore.Query = adminDb.collection("posts")
      .where("type", "==", contentType);

    if (status) query = query.where("status", "==", status);
    if (featured === "true") query = query.where("featured", "==", true);

    query = query.orderBy("createdAt", "desc")
      .offset((page - 1) * limit)
      .limit(limit);

    const snapshot = await query.get();
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((p: Record<string, unknown>) =>
        (p.title as string)?.toLowerCase().includes(q) ||
        (p.orgName as string)?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ posts: items });
  }

  async function POST(request: NextRequest) {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) return authResult.response;
    if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

    const body = await request.json();
    const { decodedToken } = authResult;

    // Find org
    const orgSnap = await adminDb.collection("organizations")
      .where("teamMemberIds", "array-contains", decodedToken.uid).limit(1).get();
    if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 403 });

    const org = { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as Record<string, unknown>;
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (contentType === "event" ? 90 : 60));

    // Community-submitted events/scholarships start as draft for moderation
    const isAdmin = decodedToken.admin === true || decodedToken.role === "admin";
    const needsModeration = (contentType === "event" || contentType === "scholarship") && !isAdmin;

    const post = {
      type: contentType,
      status: needsModeration ? "draft" : (body.status || "active"),
      orgId: org.id,
      orgName: org.name,
      orgLogoURL: org.logoURL || null,
      orgTier: (org.subscription as Record<string, unknown>)?.tier || "none",
      title: body.title || "",
      description: body.description || "",
      location: body.location || { city: "", province: "" },
      featured: false,
      featuredUntil: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      viewCount: 0,
      saveCount: 0,
      ...body.fields, // type-specific fields passed through
    };

    const ref = await adminDb.collection("posts").add(post);
    return NextResponse.json({ id: ref.id }, { status: 201 });
  }

  return { GET, POST };
}
