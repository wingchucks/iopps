import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

// GET /api/admin/debug-job?id=YL717Pqitia3T5R8wBQs
// Shows raw job document data to debug employerId issue
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const jobId = request.nextUrl.searchParams.get("id");
    if (!jobId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const docSnap = await db.collection("jobs").doc(jobId).get();
    
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = docSnap.data();
    
    // Show all fields, especially employerId
    return NextResponse.json({
      id: docSnap.id,
      hasEmployerId: "employerId" in (data || {}),
      employerId: data?.employerId ?? "FIELD_NOT_PRESENT",
      employerName: data?.employerName,
      companyName: data?.companyName,
      title: data?.title,
      schoolId: data?.schoolId,
      // All keys in the document
      allKeys: Object.keys(data || {}),
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
