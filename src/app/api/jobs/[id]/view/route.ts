import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requestClientIp } from "@/lib/public-ip";
import { loadCachedPublicJobRouteIndex } from "@/lib/public-job-route-cache";
import { findPublicJobDocument } from "@/lib/server/public-job-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
// One counted view per visitor network and job per hour.
const VIEW_WINDOW_MS = 60 * 60 * 1000;

/** IPv6 visitors usually control a whole /64, so it counts as one visitor. */
function visitorNetwork(ip: string): string {
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
}

/** A one-way key: the dedupe record stores no address or job identity. */
function viewKey(ip: string, job: string, window: number): string {
  return createHash("sha256").update(JSON.stringify(["job-view", window, visitorNetwork(ip), job])).digest("hex");
}

function isAlreadyCounted(error: unknown): boolean {
  const { code, message } = (error || {}) as { code?: unknown; message?: unknown };
  // gRPC reports ALREADY_EXISTS (6); the REST transport maps its HTTP 409 to 10.
  return code === 6 || (code === 10 && typeof message === "string" && /already exists/i.test(message));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const visitor = requestClientIp(req.headers);
    const db = getAdminDb();
    const found = visitor ? await findPublicJobDocument(db, id, loadCachedPublicJobRouteIndex) : null;

    // Unknown jobs and requests without an edge-provided address are not counted.
    if (!found || !visitor) return NextResponse.json({ ok: true }, { headers: NO_STORE });

    const window = Math.floor(Date.now() / VIEW_WINDOW_MS);
    const batch = db.batch();
    // The create fails if this visitor was already counted for the job this hour,
    // which also rejects the increment. expiresAt is for a Firestore TTL policy.
    batch.create(db.collection("job_view_dedupe").doc(viewKey(visitor, `${found.source}/${found.id}`, window)), {
      expiresAt: new Date((window + 2) * VIEW_WINDOW_MS),
    });
    batch.update(db.collection(found.source).doc(found.id), { viewCount: FieldValue.increment(1) });
    try {
      await batch.commit();
    } catch (error) {
      if (!isAlreadyCounted(error)) throw error;
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    console.error("[job-view] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500, headers: NO_STORE });
  }
}
