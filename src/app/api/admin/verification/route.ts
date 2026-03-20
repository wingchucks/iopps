import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let query: FirebaseFirestore.Query = adminDb.collection("verificationRequests");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("submittedAt", "desc");

    const snap = await query.get();
    const requests = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
