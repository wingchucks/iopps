import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const type = searchParams.get("type");
  const status = searchParams.get("status") || "active";
  const search = searchParams.get("search");
  const orgId = searchParams.get("orgId");
  const featured = searchParams.get("featured");
  const sort = searchParams.get("sort") || "createdAt_desc";

  let query: FirebaseFirestore.Query = adminDb.collection("posts");

  if (type) query = query.where("type", "==", type);
  else query = query.where("type", "==", "job");
  if (status) query = query.where("status", "==", status);
  if (orgId) query = query.where("orgId", "==", orgId);
  if (featured === "true") query = query.where("featured", "==", true);

  const [sortField, sortDir] = sort.split("_");
  query = query.orderBy(sortField || "createdAt", (sortDir as "asc" | "desc") || "desc");
  query = query.offset((page - 1) * limit).limit(limit);

  const snapshot = await query.get();
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Basic client-side search filter (Firestore doesn't support full-text)
  const filtered = search
    ? posts.filter((p: Record<string, unknown>) =>
        (p.title as string)?.toLowerCase().includes(search.toLowerCase()) ||
        (p.orgName as string)?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  return NextResponse.json({ posts: filtered });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const body = await request.json();
  const { decodedToken } = authResult;

  // Fetch the user's org
  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  const userData = userDoc.data();
  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Find org where user is a team member
  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", decodedToken.uid).limit(1).get();

  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 403 });

  const org = { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as Record<string, unknown>;

  const now = FieldValue.serverTimestamp();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const post = {
    type: body.type || "job",
    status: body.status || "active",
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
    // Job-specific
    ...(body.type === "job" || !body.type ? {
      salary: body.salary || "",
      employmentType: body.employmentType || "full-time",
      workMode: body.workMode || "on-site",
      deadline: body.deadline || null,
      requirements: body.requirements || "",
      howToApply: body.howToApply || "",
      externalUrl: body.externalUrl || "",
      contactEmail: body.contactEmail || "",
      source: "manual",
      applicationCount: 0,
    } : {}),
    // Event-specific
    ...(body.type === "event" ? {
      eventCategory: body.eventCategory || "",
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      venue: body.venue || "",
      rsvpLink: body.rsvpLink || "",
      admissionCost: body.admissionCost || "",
      coverImage: body.coverImage || "",
    } : {}),
    // Scholarship-specific
    ...(body.type === "scholarship" ? {
      awardAmount: body.awardAmount || "",
      eligibility: body.eligibility || "",
      scholarshipCategory: body.scholarshipCategory || "",
    } : {}),
  };

  const ref = await adminDb.collection("posts").add(post);
  return NextResponse.json({ id: ref.id }, { status: 201 });
}
