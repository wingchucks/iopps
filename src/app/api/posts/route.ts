import { publicContentRecord } from "@/lib/server/public-content-record";
import { NextRequest, NextResponse } from "next/server";
import { ANONYMOUS_MEMBER_NAME } from "@/lib/account-labels";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/api-auth";
import { isPublicPostVisible } from "@/lib/access-state";
import { sendAdminContentPosted } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
}

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("posts")
      .orderBy("order", "asc")
      .get();

    const requestedId = request.nextUrl.searchParams.get("id");
    const posts = snap.docs
      .map((doc) => serialize({ id: doc.id, ...doc.data() }))
      .filter((post) => isPublicPostVisible(post))
      .filter((post) => !requestedId || (post as Record<string, unknown>).id === requestedId || (post as Record<string, unknown>).slug === requestedId);
    return NextResponse.json({ posts: posts.map(post => publicContentRecord(post as Record<string, unknown>)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Posts API error:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await verifyAuthToken(req);
  if (!access.success) return access.response;

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
    const decoded = access.decodedToken;
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const memberDoc = await db.collection("members").doc(decoded.uid).get();
    const userData = userDoc.data() ?? {};
    const memberData = memberDoc.data() ?? {};
    const authorName =
      (userData.displayName as string) ||
      (memberData.displayName as string) ||
      (typeof decoded.name === "string" ? decoded.name : "") ||
      ANONYMOUS_MEMBER_NAME;
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
