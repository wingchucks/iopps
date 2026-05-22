import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { isPublicPostVisible } from "@/lib/access-state";
import { sendAdminContentPosted } from "@/lib/email";

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

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("posts")
      .orderBy("order", "asc")
      .get();

    const posts = snap.docs
      .map((doc) => serialize({ id: doc.id, ...doc.data() }))
      .filter((post) => isPublicPostVisible(post));
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Posts API error:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    type?: string;
    featuredImage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Post content is required." }, { status: 400 });
  }

  const requestedType = body.type === "spotlight" ? "spotlight" : "story";
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim()
    : description.slice(0, 60);

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const memberDoc = await db.collection("members").doc(decoded.uid).get();
    const userData = userDoc.data() ?? {};
    const memberData = memberDoc.data() ?? {};
    const authorName =
      (userData.displayName as string) ||
      (memberData.displayName as string) ||
      (typeof decoded.name === "string" ? decoded.name : "") ||
      "Community Member";
    const authorPhoto =
      (userData.photoURL as string) ||
      (memberData.photoURL as string) ||
      (typeof decoded.picture === "string" ? decoded.picture : undefined);
    const baseSlug = slugify(title) || "post";
    const id = `${requestedType}-${baseSlug}-${Date.now().toString(36)}`;
    const postData = {
      title,
      description,
      type: requestedType,
      authorUid: decoded.uid,
      authorName,
      ...(authorPhoto ? { authorPhoto } : {}),
      ...(typeof body.featuredImage === "string" && body.featuredImage.trim()
        ? { featuredImage: body.featuredImage.trim() }
        : {}),
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      order: Date.now(),
    };

    await db.collection("posts").doc(id).set(postData);

    sendAdminContentPosted({
      contentType: "community post",
      title,
      status: "active",
      authorName,
      authorEmail: decoded.email || (userData.email as string) || (memberData.email as string) || null,
      id,
      urlPath: "/feed",
    }).catch((error) => {
      console.error("[api/posts][POST] Admin content email failed:", error);
    });

    return NextResponse.json(
      {
        id,
        title,
        description,
        type: requestedType,
        status: "active",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Create post API error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
