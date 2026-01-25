import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/employers/diagnose?slug=xxx
 *
 * Admin-only diagnostic endpoint to inspect employer document status by slug.
 * Returns the document's key fields to help diagnose visibility issues.
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!auth || !db) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authorization - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Verify user is admin
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Get slug from query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    // Query employer by slug using Admin SDK (bypasses security rules)
    const employersSnapshot = await db
      .collection("employers")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (employersSnapshot.empty) {
      return NextResponse.json({
        found: false,
        message: `No employer document found with slug: ${slug}`,
        diagnosis: "Document does not exist in Firestore",
      });
    }

    const doc = employersSnapshot.docs[0];
    const data = doc.data();

    // Return diagnostic info
    return NextResponse.json({
      found: true,
      documentId: doc.id,
      slug: data.slug,
      organizationName: data.organizationName,
      status: data.status,
      publicationStatus: data.publicationStatus,
      directoryVisible: data.directoryVisible,
      deletedAt: data.deletedAt ? data.deletedAt.toDate?.()?.toISOString() : null,
      createdAt: data.createdAt ? data.createdAt.toDate?.()?.toISOString() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toISOString() : null,
      userId: data.userId,
      diagnosis: getDiagnosis(data),
    });
  } catch (error) {
    console.error("Error diagnosing employer:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

interface EmployerData {
  status?: string;
  publicationStatus?: string;
  deletedAt?: unknown;
  directoryVisible?: boolean;
}

function getDiagnosis(data: EmployerData): string[] {
  const issues: string[] = [];

  if (data.deletedAt) {
    issues.push("Document has been soft-deleted (deletedAt is set)");
  }

  if (data.status !== "approved") {
    issues.push(`Status is '${data.status || "undefined"}' - must be 'approved' for public access`);
  }

  if (data.publicationStatus !== "PUBLISHED") {
    issues.push(`Publication status is '${data.publicationStatus || "undefined"}' - must be 'PUBLISHED' for public access`);
  }

  if (data.directoryVisible === false) {
    issues.push("Directory visibility is disabled - won't appear in directory listings");
  }

  if (issues.length === 0) {
    issues.push("No issues found - document should be publicly accessible");
  }

  return issues;
}
