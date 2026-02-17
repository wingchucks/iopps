import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Get all orgs with feed sync enabled
  const orgsSnap = await adminDb.collection("organizations")
    .where("feedSync.enabled", "==", true)
    .get();

  const results: { orgId: string; orgName: string; status: string; jobCount?: number }[] = [];

  for (const orgDoc of orgsSnap.docs) {
    const org = orgDoc.data();
    try {
      // Fetch the feed
      const response = await fetch(org.feedSync.url, {
        headers: org.feedSync.credentials ? { Authorization: `Bearer ${org.feedSync.credentials}` } : {},
      });

      if (!response.ok) {
        results.push({ orgId: orgDoc.id, orgName: org.name, status: "fetch_failed" });
        continue;
      }

      const feedData = await response.json();
      const jobs = Array.isArray(feedData) ? feedData : feedData.jobs || feedData.data || [];

      let synced = 0;
      for (const job of jobs) {
        const externalId = job.id || job.externalId || job.requisitionId;
        if (!externalId) continue;

        // Check if job already exists
        const existing = await adminDb.collection("posts")
          .where("orgId", "==", orgDoc.id)
          .where("externalJobId", "==", String(externalId))
          .limit(1).get();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const postData = {
          type: "job" as const,
          status: "active" as const,
          orgId: orgDoc.id,
          orgName: org.name,
          orgLogoURL: org.logoURL || null,
          orgTier: org.subscription?.tier || "none",
          title: job.title || job.name || "",
          description: job.description || "",
          location: {
            city: job.city || job.location?.city || "",
            province: job.province || job.location?.state || job.location?.province || "",
          },
          featured: false,
          featuredUntil: null,
          expiresAt,
          viewCount: 0,
          saveCount: 0,
          salary: job.salary || job.compensation || "",
          employmentType: job.employmentType || "full-time",
          workMode: job.workMode || job.remoteType || "on-site",
          externalUrl: job.url || job.applyUrl || "",
          source: "feed-sync" as const,
          externalJobId: String(externalId),
          syncedFrom: org.feedSync.url,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (existing.empty) {
          await adminDb.collection("posts").add({
            ...postData,
            createdAt: FieldValue.serverTimestamp(),
            applicationCount: 0,
          });
        } else {
          await existing.docs[0].ref.update(postData);
        }
        synced++;
      }

      await adminDb.collection("organizations").doc(orgDoc.id).update({
        "feedSync.lastSync": FieldValue.serverTimestamp(),
        "feedSync.jobCount": synced,
      });

      results.push({ orgId: orgDoc.id, orgName: org.name, status: "success", jobCount: synced });
    } catch (error) {
      console.error(`Feed sync failed for ${org.name}:`, error);
      results.push({ orgId: orgDoc.id, orgName: org.name, status: "error" });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
