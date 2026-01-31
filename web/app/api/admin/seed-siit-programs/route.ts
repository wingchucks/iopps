import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// SIIT's actual programs based on their website
const SIIT_PROGRAMS = [
  // Trades
  { name: "Carpenter", category: "trades", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Electrician", category: "trades", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Plumber", category: "trades", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Welder", category: "trades", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Heavy Equipment Operator", category: "trades", level: "certificate", format: "in-person", duration: "8 weeks" },
  { name: "Industrial Mechanic", category: "trades", level: "certificate", format: "in-person", duration: "10 months" },
  
  // Business
  { name: "Business Administration", category: "business", level: "diploma", format: "in-person", duration: "2 years" },
  { name: "Business Certificate", category: "business", level: "certificate", format: "in-person", duration: "1 year" },
  { name: "Office Administration", category: "business", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Accounting", category: "business", level: "diploma", format: "in-person", duration: "2 years" },
  
  // Information Technology
  { name: "Computer Network Technician", category: "technology", level: "diploma", format: "in-person", duration: "2 years" },
  { name: "Information Technology", category: "technology", level: "certificate", format: "in-person", duration: "1 year" },
  { name: "Web Development", category: "technology", level: "certificate", format: "hybrid", duration: "10 months" },
  
  // Health & Community Studies
  { name: "Health Care Aide", category: "health", level: "certificate", format: "in-person", duration: "16 weeks" },
  { name: "Practical Nursing", category: "health", level: "diploma", format: "in-person", duration: "2 years" },
  { name: "Community Health Representative", category: "health", level: "certificate", format: "in-person", duration: "1 year" },
  { name: "Addictions Counselling", category: "health", level: "certificate", format: "in-person", duration: "1 year" },
  { name: "Early Childhood Education", category: "health", level: "diploma", format: "in-person", duration: "2 years" },
  { name: "Human Justice", category: "health", level: "diploma", format: "in-person", duration: "2 years" },
  
  // Adult Basic Education
  { name: "Adult Basic Education 10", category: "academic", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "Adult Basic Education 12", category: "academic", level: "certificate", format: "in-person", duration: "10 months" },
  { name: "GED Preparation", category: "academic", level: "certificate", format: "in-person", duration: "varies" },
];

// POST /api/admin/seed-siit-programs
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "seed-programs-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find SIIT school
    const schoolsSnap = await db.collection("schools").where("slug", "==", "siit").get();
    let schoolId = "";
    let schoolName = "Saskatchewan Indian Institute of Technologies";
    
    if (!schoolsSnap.empty) {
      schoolId = schoolsSnap.docs[0].id;
      const schoolData = schoolsSnap.docs[0].data();
      schoolName = schoolData.name || schoolName;
    }

    // Check if programs collection exists and has SIIT programs
    const existingSnap = await db.collection("education_programs")
      .where("schoolId", "==", schoolId || "siit")
      .limit(1)
      .get();
    
    if (!existingSnap.empty) {
      return NextResponse.json({ 
        message: "SIIT programs already exist",
        existingCount: existingSnap.size 
      });
    }

    // Seed programs
    const batch = db.batch();
    const programIds: string[] = [];

    for (const program of SIIT_PROGRAMS) {
      const ref = db.collection("education_programs").doc();
      batch.set(ref, {
        ...program,
        schoolId: schoolId || "siit",
        schoolName,
        description: `${program.name} program at ${schoolName}. ${program.duration} ${program.level} program in ${program.category}.`,
        indigenousFocused: true,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      programIds.push(ref.id);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      programsCreated: SIIT_PROGRAMS.length,
      schoolId: schoolId || "siit",
      programIds,
    });

  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check status
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const programsSnap = await db.collection("education_programs").get();
    
    const bySchool: Record<string, number> = {};
    programsSnap.docs.forEach(doc => {
      const schoolName = doc.data().schoolName || "Unknown";
      bySchool[schoolName] = (bySchool[schoolName] || 0) + 1;
    });

    return NextResponse.json({
      totalPrograms: programsSnap.size,
      bySchool,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
