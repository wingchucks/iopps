import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * GET /api/education/programs
 * List education programs with optional filters
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
    const schoolId = searchParams.get("schoolId");
    const category = searchParams.get("category");
    const level = searchParams.get("level");
    const deliveryMethod = searchParams.get("deliveryMethod");
    const indigenousFocused = searchParams.get("indigenousFocused");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: FirebaseFirestore.Query = db.collection("education_programs")
      .where("isPublished", "==", true)
      .where("status", "==", "approved");

    if (schoolId) {
      query = query.where("schoolId", "==", schoolId);
    }

    if (category) {
      query = query.where("category", "==", category);
    }

    if (level) {
      query = query.where("level", "==", level);
    }

    if (deliveryMethod) {
      query = query.where("deliveryMethod", "==", deliveryMethod);
    }

    if (indigenousFocused === "true") {
      query = query.where("indigenousFocused", "==", true);
    }

    if (featured === "true") {
      query = query.where("featured", "==", true);
    }

    query = query.orderBy("name", "asc").limit(limit);

    const snapshot = await query.get();
    let programs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side text search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      programs = programs.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ programs }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error listing programs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/education/programs
 * Create a new education program (requires authenticated school admin)
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

    // Get employer profile and verify school ownership
    const employerDoc = await db.collection("employers").doc(decodedToken.uid).get();
    if (!employerDoc.exists) {
      return NextResponse.json(
        { error: "Employer profile not found" },
        { status: 404 }
      );
    }

    const employerData = employerDoc.data();
    const schoolId = employerData?.educationSettings?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { error: "No school associated with this account" },
        { status: 400 }
      );
    }

    // Verify school exists
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    const schoolData = schoolDoc.data();

    const body = await req.json();
    const {
      name,
      description,
      shortDescription,
      category,
      subcategory,
      level,
      deliveryMethod,
      duration,
      fullTime,
      partTimeAvailable,
      campuses,
      communityDelivery,
      intakeDates,
      tuition,
      additionalFees,
      totalCostEstimate,
      admissionRequirements,
      courses,
      careerOutcomes,
      transferPathways,
      indigenousFocused,
      indigenousContentPercentage,
      imageUrl,
      sourceUrl,
    } = body;

    if (!name || !description || !category || !level || !deliveryMethod) {
      return NextResponse.json(
        { error: "Name, description, category, level, and delivery method are required" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = `${schoolData?.shortName || schoolData?.name}-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create program document
    const programData = {
      schoolId,
      schoolName: schoolData?.name,
      name,
      slug,
      description,
      shortDescription: shortDescription || null,
      category,
      subcategory: subcategory || null,
      level,
      deliveryMethod,
      duration: duration || null,
      fullTime: fullTime ?? true,
      partTimeAvailable: partTimeAvailable ?? false,
      campuses: campuses || [],
      communityDelivery: communityDelivery ?? false,
      intakeDates: intakeDates || [],
      tuition: tuition || null,
      additionalFees: additionalFees || [],
      totalCostEstimate: totalCostEstimate || null,
      admissionRequirements: admissionRequirements || null,
      courses: courses || [],
      careerOutcomes: careerOutcomes || null,
      transferPathways: transferPathways || [],
      indigenousFocused: indigenousFocused ?? false,
      indigenousContentPercentage: indigenousContentPercentage || null,
      scholarshipIds: [],
      communityStats: {
        totalEnrolled: 0,
        totalGraduated: 0,
        connectionsCount: 0,
      },
      imageUrl: imageUrl || null,
      sourceUrl: sourceUrl || null,
      status: schoolData?.verification?.isVerified ? "approved" : "pending",
      isPublished: false,
      featured: false,
      viewCount: 0,
      inquiryCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("education_programs").add(programData);

    // Update school's program count
    await db.collection("schools").doc(schoolId).update({
      "stats.totalPrograms": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      programId: docRef.id,
      status: programData.status,
      message: programData.status === "approved"
        ? "Program created successfully"
        : "Program created and pending review",
    });
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
