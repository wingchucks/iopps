import { prepareImportedDescription, normalizeImportedLabel } from "@/lib/server/import-content-quality";
import { createImportedJobOnce, feedImportIdentity } from "@/lib/server/feed-import-identity";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { jobs } = await request.json();
    if (!Array.isArray(jobs) || jobs.length === 0) return NextResponse.json({ error: "jobs array required" }, { status: 400 });
    const db = getAdminDb();
    const imported: string[] = [], skipped: string[] = [];
    for (const job of jobs) {
      if (!job.title || !job.externalUrl) { skipped.push(job.title || "untitled"); continue; }
      const source = new URL(job.externalUrl);
      if (!["https:", "http:"].includes(source.protocol) || source.username || source.password) { skipped.push(job.title); continue; }
      const title = normalizeImportedLabel(String(job.title));
      const identityFields = {
        feedId: typeof job.feedId === "string" && job.feedId ? job.feedId : `google-alerts:${source.origin}`,
        employerId: job.employerId || job.company || "Unknown",
        externalId: job.externalId || job.externalUrl,
        location: normalizeImportedLabel(job.location || "Canada"),
        ...(job.datePosted ? { publishedAt: job.datePosted } : {}),
      };
      const identity = feedImportIdentity({ ...identityFields, title });
      // Legacy URL equality alone is not identity: one careers URL can carry many roles.
      let legacyMatch = false;
      for (const collection of ["jobs", "posts"]) {
        const existing = await db.collection(collection).where("externalUrl", "==", job.externalUrl).get();
        legacyMatch ||= existing.docs.some(doc => {
          const data = doc.data();
          try {
            return feedImportIdentity({ ...data, feedId: data.feedId || `google-alerts:${source.origin}`, employerId: data.employerId || data.company || data.organization || "Unknown", externalId: data.externalId || data.externalUrl, location: data.location || "Canada", publishedAt: data.publishedAt || data.datePosted }) === identity;
          } catch { return false; }
        });
      }
      if (legacyMatch) { skipped.push(`${job.title} (duplicate)`); continue; }
      const now = new Date().toISOString();
      const created = await createImportedJobOnce(db, {
        ...identityFields, title, company: job.company || "Unknown", organization: job.company || "Unknown",
        ...prepareImportedDescription(typeof job.description === "string" ? job.description : "", job.descriptionFormat, { title: job.title, location: job.location, company: job.company }),
        employmentType: job.employmentType || "", salary: job.salary || "", externalUrl: job.externalUrl, applicationUrl: job.externalUrl,
        source: "google-alerts", status: "pending", featured: false, createdAt: now, updatedAt: now,
        ...(job.datePosted ? { datePosted: job.datePosted } : {}),
      });
      if (created) imported.push(job.title); else skipped.push(`${job.title} (duplicate)`);
    }
    return NextResponse.json({ success: true, imported: imported.length, skipped: skipped.length, importedTitles: imported, skippedTitles: skipped });
  } catch (err) {
    console.error("[import-jobs] Error:", err);
    return NextResponse.json({ error: "Import could not be completed" }, { status: 500 });
  }
}
