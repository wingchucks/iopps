import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/education/schools
 * List schools with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const province = searchParams.get("province");
    const indigenousControlled = searchParams.get("indigenousControlled");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: FirebaseFirestore.Query = db.collection("schools")
      .where("isPublished", "==", true)
      .where("status", "==", "active");

    if (type) {
      query = query.where("type", "==", type);
    }

    if (province) {
      query = query.where("headOffice.province", "==", province);
    }

    if (indigenousControlled === "true") {
      query = query.where("verification.indigenousControlled", "==", true);
    }

    query = query.orderBy("name", "asc").limit(limit);

    const snapshot = await query.get();
    const schools = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ schools });
  } catch (error) {
    console.error("Error listing schools:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/education/schools
 * Create a new school (requires authenticated organization)
 */
export async function POST(req: NextRequest) {
  try {
    if (!auth || !db) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if user is an employer
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== "employer" && userData.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Employer or admin access required" },
        { status: 403 }
      );
    }

    // Get employer profile
    const employerDoc = await db.collection("employers").doc(decodedToken.uid).get();
    if (!employerDoc.exists) {
      return NextResponse.json(
        { error: "Employer profile not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      shortName,
      type,
      website,
      headOffice,
      campuses,
      indigenousServices,
      contact,
      social,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if school already exists for this organization
    const existingSchool = await db.collection("schools")
      .where("organizationId", "==", decodedToken.uid)
      .limit(1)
      .get();

    if (!existingSchool.empty) {
      return NextResponse.json(
        { error: "School already exists for this organization" },
        { status: 409 }
      );
    }

    // Create school document
    const schoolData = {
      organizationId: decodedToken.uid,
      name,
      shortName: shortName || null,
      type,
      slug,
      website: website || null,
      headOffice: headOffice || null,
      campuses: campuses || [],
      indigenousServices: indigenousServices || null,
      contact: contact || null,
      social: social || null,
      stats: {
        totalPrograms: 0,
      },
      verification: {
        isVerified: false,
        indigenousControlled: false,
      },
      subscription: {
        tier: "starter",
      },
      status: "pending",
      isPublished: false,
      viewCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("schools").add(schoolData);

    // Update employer with education capability
    await db.collection("employers").doc(decodedToken.uid).update({
      capabilities: FieldValue.arrayUnion("education"),
      "educationSettings.isEnabled": true,
      "educationSettings.schoolId": docRef.id,
      "educationSettings.tier": "starter",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      schoolId: docRef.id,
      message: "School created successfully. Pending review.",
    });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
