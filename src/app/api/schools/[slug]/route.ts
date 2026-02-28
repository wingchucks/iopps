import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getAdminDb();

    const doc = await db.collection("organizations").doc(slug).get();
    if (doc.exists) {
      const postsSnap = await db
        .collection("posts")
        .where("orgId", "==", slug)
        .where("status", "==", "active")
        .get();
      const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ org: { id: doc.id, ...doc.data() }, posts });
    }

    const slugSnap = await db
      .collection("organizations")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (slugSnap.empty) {
      return NextResponse.json({ org: null, posts: [] }, { status: 404 });
    }

    const orgDoc = slugSnap.docs[0];
    const postsSnap = await db
      .collection("posts")
      .where("orgId", "==", orgDoc.id)
      .where("status", "==", "active")
      .get();
    const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ org: { id: orgDoc.id, ...orgDoc.data() }, posts });
  } catch (err) {
    console.error("Failed to fetch school:", err);
    return NextResponse.json({ org: null, posts: [] }, { status: 500 });
  }
}