import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/education/inquiries
 * List inquiries for a school (requires authenticated school admin)
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: FirebaseFirestore.Query = db.collection("school_inquiries")
      .where("schoolId", "==", schoolId);

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("createdAt", "desc").limit(limit);

    const snapshot = await query.get();
    const inquiries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("Error listing inquiries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/education/inquiries
 * Create a new inquiry (requires authenticated member)
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

    // Get user info
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      schoolId,
      programId,
      subject,
      message,
      interestedInPrograms,
      intendedStartDate,
      educationLevel,
    } = body;

    if (!schoolId || !subject || !message) {
      return NextResponse.json(
        { error: "School ID, subject, and message are required" },
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

    // Create inquiry document
    const inquiryData = {
      schoolId,
      programId: programId || null,
      memberId: decodedToken.uid,
      memberEmail: decodedToken.email || userData.email,
      memberName: userData.displayName || userData.name || "Anonymous",
      subject,
      message,
      interestedInPrograms: interestedInPrograms || [],
      intendedStartDate: intendedStartDate || null,
      educationLevel: educationLevel || null,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("school_inquiries").add(inquiryData);

    // Increment program inquiry count if applicable
    if (programId) {
      await db.collection("education_programs").doc(programId).update({
        inquiryCount: FieldValue.increment(1),
      });
    }

    return NextResponse.json({
      success: true,
      inquiryId: docRef.id,
      message: "Inquiry sent successfully",
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/education/inquiries
 * Update inquiry status (requires authenticated school admin)
 */
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const { inquiryId, status } = body;

    if (!inquiryId || !status) {
      return NextResponse.json(
        { error: "Inquiry ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["new", "read", "responded", "archived"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify inquiry belongs to this school
    const inquiryDoc = await db.collection("school_inquiries").doc(inquiryId).get();
    if (!inquiryDoc.exists) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    const inquiryData = inquiryDoc.data();
    if (inquiryData?.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Unauthorized to update this inquiry" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "responded") {
      updateData.respondedAt = FieldValue.serverTimestamp();
      updateData.respondedBy = decodedToken.uid;
    }

    await db.collection("school_inquiries").doc(inquiryId).update(updateData);

    return NextResponse.json({
      success: true,
      message: "Inquiry status updated",
    });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
