import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * GET /api/education/events
 * List education events with optional filters
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
    const type = searchParams.get("type");
    const format = searchParams.get("format");
    const upcoming = searchParams.get("upcoming");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: FirebaseFirestore.Query = db.collection("education_events")
      .where("isPublished", "==", true);

    if (schoolId) {
      query = query.where("schoolId", "==", schoolId);
    }

    if (type) {
      query = query.where("type", "==", type);
    }

    if (format) {
      query = query.where("format", "==", format);
    }

    if (featured === "true") {
      query = query.where("featured", "==", true);
    }

    query = query.orderBy("startDatetime", "asc").limit(limit);

    const snapshot = await query.get();
    let events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter for upcoming events if requested
    if (upcoming === "true") {
      const now = new Date();
      events = events.filter((event: any) => {
        if (!event.startDatetime) return false;
        const startDate = event.startDatetime.toDate
          ? event.startDatetime.toDate()
          : new Date(event.startDatetime);
        return startDate >= now;
      });
    }

    return NextResponse.json({ events }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error listing education events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/education/events
 * Create a new education event (requires authenticated school admin)
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
      type,
      startDatetime,
      endDatetime,
      timezone,
      format,
      location,
      virtualLink,
      registrationUrl,
      registrationRequired,
      capacity,
      featuredProgramIds,
    } = body;

    if (!name || !description || !type || !startDatetime || !format) {
      return NextResponse.json(
        { error: "Name, description, type, start datetime, and format are required" },
        { status: 400 }
      );
    }

    // Create event document
    const eventData = {
      schoolId,
      schoolName: schoolData?.name,
      name,
      description,
      type,
      startDatetime: new Date(startDatetime),
      endDatetime: endDatetime ? new Date(endDatetime) : null,
      timezone: timezone || "America/Regina",
      format,
      location: location || null,
      virtualLink: virtualLink || null,
      registrationUrl: registrationUrl || null,
      registrationRequired: registrationRequired ?? false,
      capacity: capacity || null,
      featuredProgramIds: featuredProgramIds || [],
      attendeeIds: [],
      attendeeCount: 0,
      isPublished: false,
      featured: false,
      viewCount: 0,
      registrationClicks: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("education_events").add(eventData);

    return NextResponse.json({
      success: true,
      eventId: docRef.id,
      message: "Event created successfully",
    });
  } catch (error) {
    console.error("Error creating education event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
