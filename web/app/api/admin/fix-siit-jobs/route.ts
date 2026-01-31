import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/admin/fix-siit-jobs
// Updates SIIT jobs to have correct employer info (SIIT, not IOPPS JR)
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "fix-siit-jobs-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find SIIT school to get proper ID
    const schoolsSnap = await db.collection("schools").where("slug", "==", "siit").get();
    let siitSchoolId = "";
    let siitName = "Saskatchewan Indian Institute of Technologies";
    
    if (!schoolsSnap.empty) {
      siitSchoolId = schoolsSnap.docs[0].id;
      const schoolData = schoolsSnap.docs[0].data();
      siitName = schoolData.name || siitName;
    }

    // Find jobs that mention SIIT but have wrong employer
    const jobsSnap = await db.collection("jobs").get();
    let updated = 0;
    const updates: { id: string; title: string; oldEmployer: string; oldEmployerId: string | null; newEmployer: string }[] = [];

    for (const doc of jobsSnap.docs) {
      const data = doc.data();
      
      // Check if this is a SIIT job (by company name or title containing SIIT)
      const isSiitJob = 
        data.companyName?.toLowerCase().includes("siit") ||
        data.companyName?.toLowerCase().includes("saskatchewan indian institute") ||
        data.employerName?.toLowerCase().includes("siit") ||
        data.employerName?.toLowerCase().includes("saskatchewan indian institute") ||
        data.title?.toLowerCase().includes("siit");
      
      if (isSiitJob) {
        // Update to proper SIIT employer info and REMOVE employerId so it doesn't show IOPPS JR profile
        await db.collection("jobs").doc(doc.id).update({
          companyName: siitName,
          employerName: siitName,
          employerId: FieldValue.delete(), // Remove employerId so job page doesn't show IOPPS JR profile
          ...(siitSchoolId && { schoolId: siitSchoolId }),
        });
        
        updates.push({
          id: doc.id,
          title: data.title,
          oldEmployer: data.companyName || data.employerName || "unknown",
          oldEmployerId: data.employerId || null,
          newEmployer: siitName,
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      siitSchoolId,
      siitName,
      totalJobs: jobsSnap.size,
      updated,
      updates,
    });

  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      { error: "Fix failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check current SIIT jobs status
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const jobsSnap = await db.collection("jobs").get();
    
    const siitJobs: { id: string; title: string; companyName: string; employerName: string; employerId: string | null }[] = [];
    
    jobsSnap.docs.forEach(doc => {
      const data = doc.data();
      
      const isSiitJob = 
        data.companyName?.toLowerCase().includes("siit") ||
        data.companyName?.toLowerCase().includes("saskatchewan indian institute") ||
        data.employerName?.toLowerCase().includes("siit") ||
        data.employerName?.toLowerCase().includes("saskatchewan indian institute") ||
        data.title?.toLowerCase().includes("siit") ||
        data.title?.toLowerCase().includes("sis "); // SIS = Student Information System (SIIT job)
      
      if (isSiitJob) {
        siitJobs.push({
          id: doc.id,
          title: data.title,
          companyName: data.companyName || null,
          employerName: data.employerName || null,
          employerId: data.employerId || null,
        });
      }
    });

    return NextResponse.json({
      totalJobs: jobsSnap.size,
      siitJobsFound: siitJobs.length,
      siitJobs,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
