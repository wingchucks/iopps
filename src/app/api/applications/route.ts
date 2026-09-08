import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function serialize(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value) {
    return { seconds: Math.floor((value as { toDate(): Date }).toDate().getTime() / 1000) };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, serialize(field)]));
  }
  return value;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;
  try {
    // Ownership comes only from the verified identity, never a query parameter.
    const snapshot = await getAdminDb().collection("applications")
      .where("userId", "==", auth.decodedToken.uid).orderBy("appliedAt", "desc").get();
    const applications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return serialize({ id: doc.id, userId: data.userId, postId: data.postId,
        postTitle: data.postTitle, orgName: data.orgName, status: data.status,
        statusHistory: data.statusHistory || [], appliedAt: data.appliedAt,
        updatedAt: data.updatedAt });
    });
    return NextResponse.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load applicant history:", error);
    return NextResponse.json({ error: "Unable to load applications" }, { status: 503 });
  }
}
