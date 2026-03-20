import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobs } = await request.json();
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "jobs array required" }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const imported: string[] = [];
    const skipped: string[] = [];

    for (const job of jobs) {
      if (!job.title || !job.externalUrl) {
        skipped.push(job.title || "untitled");
        continue;
      }

      // Check for duplicates by externalUrl
      const existing = await db.collection("jobs")
        .where("externalUrl", "==", job.externalUrl)
        .limit(1)
        .get();
      
      if (!existing.empty) {
        skipped.push(`${job.title} (duplicate)`);
        continue;
      }

      // Also check posts collection
      const existingPost = await db.collection("posts")
        .where("externalUrl", "==", job.externalUrl)
        .limit(1)
        .get();

      if (!existingPost.empty) {
        skipped.push(`${job.title} (duplicate in posts)`);
        continue;
      }

      const doc = db.collection("jobs").doc();
      const now = new Date().toISOString();

      batch.set(doc, {
        title: job.title,
        company: job.company || "Unknown",
        organization: job.company || "Unknown",
        location: job.location || "",
        description: job.description || "",
        employmentType: job.employmentType || "",
        salary: job.salary || "",
        externalUrl: job.externalUrl,
        applicationUrl: job.externalUrl,
        source: "google-alerts",
        status: "pending",
        featured: false,
        createdAt: now,
        updatedAt: now,
        ...(job.datePosted ? { datePosted: job.datePosted } : {}),
      });

      imported.push(job.title);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      importedTitles: imported,
      skippedTitles: skipped,
    });
  } catch (err) {
    console.error("[import-jobs] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}