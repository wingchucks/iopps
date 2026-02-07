import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/enrich-data
 *
 * Admin-only endpoint to backfill new fields on existing Firestore documents.
 * All operations are ADDITIVE — no existing data is deleted or overwritten.
 *
 * Operations:
 *   "members"   — Add identity/preference fields to members collection
 *   "employers"  — Add capabilities/counters to employers collection
 *   "jobs"       — Add indigenousPreference/featured to jobs collection
 *   "all"        — Run all three
 *
 * Request body:
 *   { operation: "members" | "employers" | "jobs" | "all", dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
  if (!db || !auth) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  // Verify admin auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(authHeader.split("Bearer ")[1]);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (decodedToken.admin !== true) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { operation, dryRun } = body;
  if (!operation || !["members", "employers", "jobs", "all"].includes(operation)) {
    return NextResponse.json(
      { error: "operation required: members | employers | jobs | all" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};

  try {
    // ── Members enrichment ──
    if (operation === "members" || operation === "all") {
      const snap = await db.collection("members").get();
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const patch: Record<string, unknown> = {};

        // Only set fields that don't already exist
        if (data.nation === undefined) patch.nation = "";
        if (data.territory === undefined) patch.territory = "";
        if (data.band === undefined) patch.band = "";
        if (data.pronouns === undefined) patch.pronouns = "";
        if (data.memberType === undefined) patch.memberType = "communityMember";
        if (data.openToWork === undefined) patch.openToWork = false;
        if (data.jobTypes === undefined) patch.jobTypes = [];
        if (data.preferredLocations === undefined) patch.preferredLocations = [];
        if (data.willingToRelocate === undefined) patch.willingToRelocate = false;
        if (data.status === undefined) patch.status = "active";

        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          try {
            await doc.ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
            updated++;
          } catch (e) {
            errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          updated++;
        }
      }

      results.members = { total: snap.size, updated, skipped, errors: errors.length };
    }

    // ── Employers enrichment ──
    if (operation === "employers" || operation === "all") {
      const snap = await db.collection("employers").get();
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const patch: Record<string, unknown> = {};

        // Compute capabilities from existing enabledModules if present
        if (data.capabilities === undefined) {
          const modules: string[] = data.enabledModules || [];
          patch.capabilities = {
            hiring: modules.includes("hire") || modules.includes("hiring") || true,
            products: modules.includes("sell") || modules.includes("products") || false,
            services: modules.includes("services") || false,
            events: modules.includes("host") || modules.includes("events") || false,
            training: modules.includes("educate") || modules.includes("training") || false,
          };
        }

        if (data.jobCount === undefined) patch.jobCount = 0;
        if (data.followerCount === undefined) patch.followerCount = 0;
        if (data.profileViews === undefined) patch.profileViews = 0;

        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          try {
            await doc.ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
            updated++;
          } catch (e) {
            errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          updated++;
        }
      }

      results.employers = { total: snap.size, updated, skipped, errors: errors.length };
    }

    // ── Jobs enrichment ──
    if (operation === "jobs" || operation === "all") {
      const snap = await db.collection("jobs").get();
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const patch: Record<string, unknown> = {};

        if (data.indigenousPreference === undefined) patch.indigenousPreference = "open";
        if (data.featured === undefined) patch.featured = false;

        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          try {
            await doc.ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
            updated++;
          } catch (e) {
            errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          updated++;
        }
      }

      results.jobs = { total: snap.size, updated, skipped, errors: errors.length };
    }

    const duration = Date.now() - startTime;

    // Log to system_logs
    if (!dryRun) {
      await db.collection("system_logs").add({
        event: "data_enrichment",
        operation,
        results,
        duration,
        adminId: decodedToken.uid,
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      operation,
      dryRun: !!dryRun,
      results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error("[enrich-data] Error:", error);
    return NextResponse.json(
      { error: "Operation failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
