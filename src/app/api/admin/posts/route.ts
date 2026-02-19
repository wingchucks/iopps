import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface UnifiedPost {
  id: string;
  title: string;
  type: string;
  author: string;
  date: string | null;
  status: string;
  views: number;
  clicks: number;
  collection: string;
  archived: boolean;
}

const COLLECTIONS: { name: string; type: string }[] = [
  { name: "jobs", type: "Job" },
  { name: "conferences", type: "Conference" },
  { name: "scholarships", type: "Scholarship" },
  { name: "powwows", type: "Event" },
];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;
  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }


  try {
    const posts: UnifiedPost[] = [];

    for (const col of COLLECTIONS) {
      const snap = await adminDb.collection(col.name).limit(300).get();
      snap.docs.forEach((doc) => {
        const d = doc.data();
        posts.push({
          id: doc.id,
          title: d.title || "Untitled",
          type: col.type,
          author: d.employerName || d.company || d.organizerName || d.authorName || d.organization || "Unknown",
          date: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || d.postedAt?.toDate?.()?.toISOString() || null,
          status: d.status || "active",
          views: d.views || d.viewCount || 0,
          clicks: d.clicks || d.clickCount || 0,
          collection: col.name,
          archived: d.status === "archived" || d.archived === true,
        });
      });
    }

    // Also fetch archived content
    const archivedSnap = await adminDb.collection("archivedContent").limit(200).get();
    archivedSnap.docs.forEach((doc) => {
      const d = doc.data();
      posts.push({
        id: doc.id,
        title: d.title || "Untitled",
        type: d.originalType || d.type || "Unknown",
        author: d.employerName || d.company || d.authorName || "Unknown",
        date: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
        status: "archived",
        views: d.views || 0,
        clicks: d.clicks || 0,
        collection: d.originalCollection || "unknown",
        archived: true,
      });
    });

    // Sort by date descending
    posts.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const body = await request.json();
  const { action, postId, collection } = body;

  try {
    if (action === "archive") {
      // Move to archivedContent
      const docRef = adminDb.collection(collection).doc(postId);
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      const data = doc.data()!;
      await adminDb.collection("archivedContent").doc(postId).set({
        ...data,
        originalCollection: collection,
        originalType: COLLECTIONS.find((c) => c.name === collection)?.type || collection,
        archivedAt: new Date().toISOString(),
      });
      await docRef.update({ status: "archived", archived: true });

      return NextResponse.json({ success: true });
    }

    if (action === "restore") {
      const archivedRef = adminDb.collection("archivedContent").doc(postId);
      const archivedDoc = await archivedRef.get();
      if (!archivedDoc.exists) {
        return NextResponse.json({ error: "Archived post not found" }, { status: 404 });
      }
      const data = archivedDoc.data()!;
      const origCollection = data.originalCollection || collection;

      // Restore original doc status
      await adminDb.collection(origCollection).doc(postId).update({
        status: "active",
        archived: false,
      });
      await archivedRef.delete();

      return NextResponse.json({ success: true });
    }

    if (action === "feature") {
      await adminDb.collection(collection).doc(postId).update({
        featured: true,
        featuredAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing post action:", error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
