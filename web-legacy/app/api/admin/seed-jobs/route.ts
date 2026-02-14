import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/admin/seed-jobs
// Accepts an array of jobs to seed into the database
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const secret = request.headers.get("x-admin-secret");
    if (secret !== "seed-jobs-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobs, employerId = "iopps-jobs-import" } = await request.json();

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "No jobs provided" }, { status: 400 });
    }

    // Process in batches of 500 (Firestore limit)
    const BATCH_SIZE = 400;
    const jobIds: string[] = [];
    const errors: string[] = [];
    let created = 0;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = jobs.slice(i, i + BATCH_SIZE);

      for (const job of chunk) {
        try {
          // Validate required fields
          if (!job.title || !job.companyName || !job.location) {
            errors.push(`Skipped: Missing required fields - ${job.title || 'No title'}`);
            continue;
          }

          const ref = db.collection("jobs").doc();
          
          // Determine closing date (default 30 days from now)
          let closingDate = job.closingDate;
          if (!closingDate) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            closingDate = thirtyDaysFromNow.toISOString();
          }

          // Parse salary if provided - use null instead of undefined for Firestore
          let salaryRange = job.salaryRange || job.salary || null;
          if (salaryRange === undefined) {
            salaryRange = null;
          }

          batch.set(ref, {
            // Required fields
            title: job.title,
            employerId: job.employerId || employerId,
            employerName: job.companyName,
            location: job.location,
            description: job.description || '',
            employmentType: job.employmentType || 'Full-time',
            
            // Optional fields
            companyLogoUrl: job.companyLogoUrl || job.logoUrl || null,
            salaryRange: salaryRange,
            requirements: job.requirements || job.qualifications || '',
            benefits: job.benefits || '',
            responsibilities: job.responsibilities || [],
            qualifications: job.qualifications ? 
              (Array.isArray(job.qualifications) ? job.qualifications : [job.qualifications]) : [],
            
            // Application
            applicationLink: job.applicationUrl || job.applyUrl || job.applicationLink || null,
            applicationEmail: job.applicationEmail || null,
            applicationMethod: job.applicationUrl ? 'url' : 'email',
            
            // Flags
            indigenousPreference: job.indigenousPreference ?? true, // Default to Indigenous-focused
            remoteFlag: job.remote || job.remoteFlag || false,
            cpicRequired: job.cpicRequired || false,
            willTrain: job.willTrain || false,
            driversLicense: job.driversLicense || false,
            quickApplyEnabled: false, // External jobs don't use quick apply
            
            // Category & type
            category: job.category || 'Other',
            locationType: job.locationType || (job.remote ? 'remote' : 'onsite'),
            
            // Status
            active: true,
            featured: job.featured || false,
            
            // Import metadata
            importedFrom: 'manual-seed',
            originalUrl: job.originalUrl || job.applicationUrl || null,
            noIndex: true, // Don't index imported jobs in search engines
            
            // Timestamps
            closingDate: closingDate,
            createdAt: FieldValue.serverTimestamp(),
            publishedAt: FieldValue.serverTimestamp(),
            
            // Analytics
            viewsCount: 0,
            applicationsCount: 0,
          });
          
          jobIds.push(ref.id);
          created++;
        } catch (err) {
          errors.push(`Error processing: ${job.title} - ${String(err)}`);
        }
      }

      await batch.commit();
    }

    // Get province breakdown
    const byProvince: Record<string, number> = {};
    jobs.forEach((job: { location?: string }) => {
      const location = job.location || '';
      // Extract province code from location (e.g., "Vancouver, BC" -> "BC")
      const provinceMatch = location.match(/,\s*([A-Z]{2})(?:\s|$)/);
      const province = provinceMatch ? provinceMatch[1] : 'Unknown';
      byProvince[province] = (byProvince[province] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      jobsCreated: created,
      jobsSubmitted: jobs.length,
      jobIds: jobIds.slice(0, 20), // First 20 IDs for reference
      byProvince,
      errors: errors.slice(0, 10), // First 10 errors
    });

  } catch (error) {
    console.error("Seed jobs error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check current job counts
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const jobsSnap = await db.collection("jobs").get();
    
    const byProvince: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byEmployer: Record<string, number> = {};
    
    jobsSnap.docs.forEach(doc => {
      const data = doc.data();
      const location = data.location || '';
      const category = data.category || 'Unknown';
      const employer = data.employerName || 'Unknown';
      
      // Extract province
      const provinceMatch = location.match(/,\s*([A-Z]{2})(?:\s|$)/);
      const province = provinceMatch ? provinceMatch[1] : 'Unknown';
      
      byProvince[province] = (byProvince[province] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
      byEmployer[employer] = (byEmployer[employer] || 0) + 1;
    });

    // Sort by count
    const topEmployers = Object.entries(byEmployer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    return NextResponse.json({
      totalJobs: jobsSnap.size,
      byProvince,
      byCategory,
      topEmployers,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
