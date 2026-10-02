import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_TARGET_ID_MAX_LENGTH,
  REPORT_TARGET_TYPES,
  REPORT_TITLE_MAX_LENGTH,
  type ReportReason,
} from "@/lib/firestore/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The moderation queue (/admin/moderation) sorts and filters on this severity.
const SEVERITY: Record<ReportReason, "high" | "medium" | "low"> = {
  harassment: "high",
  inappropriate: "medium",
  misinformation: "medium",
  spam: "low",
  other: "low",
};
const LIMITS = [{ max: 10, window: 60 * 60 * 1000 }, { max: 30, window: 24 * 60 * 60 * 1000 }];
// A member may report the same content again only after moderators closed the last report.
const OPEN_STATUSES = new Set(["pending", "pending_elder"]);

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });

// Optional text (single-line unless multiline): absent or blank is null; non-strings and overlong values are invalid.
function optionalText(value: unknown, max: number, multiline = false): string | null | false {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return false;
  const text = (multiline ? value.replace(/\r\n?/g, "\n") : value.replace(/\s+/g, " ")).trim();
  if (text.length > max) return false;
  return text || null;
}

function displayName(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth.success) return auth.response;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return invalid("Invalid report");
    body = parsed as Record<string, unknown>;
  } catch {
    return invalid("Invalid report");
  }

  const targetType = body.targetType;
  const reason = body.reason;
  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  if (!REPORT_TARGET_TYPES.includes(targetType as (typeof REPORT_TARGET_TYPES)[number])) return invalid("Choose what you are reporting");
  if (!REPORT_REASONS.includes(reason as ReportReason)) return invalid("Choose a reason for this report");
  if (!targetId || targetId.length > REPORT_TARGET_ID_MAX_LENGTH || targetId.includes("/") || /[\s\\]/.test(targetId) || targetId === "." || targetId === "..") {
    return invalid("This content cannot be reported");
  }
  const title = optionalText(body.targetTitle, REPORT_TITLE_MAX_LENGTH);
  if (title === false) return invalid("This content cannot be reported");
  const details = optionalText(body.details, REPORT_DETAILS_MAX_LENGTH, true);
  if (details === false) return invalid(`Keep details to ${REPORT_DETAILS_MAX_LENGTH} characters or fewer`);

  const uid = auth.decodedToken.uid;
  const reporterName = displayName(auth.userData.displayName, auth.decodedToken.name);
  const reporterEmail = typeof auth.viewerEmail === "string" && auth.viewerEmail ? auth.viewerEmail : null;
  try {
    const db = getAdminDb();
    const flags = db.collection("contentFlags");
    const limits = db.collection("content_report_limits");
    const markerRef = limits.doc(`target-${digest(`${uid}\n${targetType}\n${targetId}`)}`);
    const quotaRef = limits.doc(`uid-${digest(uid)}`);
    const flagRef = flags.doc();
    const now = Date.now();
    const outcome = await db.runTransaction(async tx => {
      const [marker, quota] = await tx.getAll(markerRef, quotaRef);
      const previousId = marker.data()?.flagId;
      if (typeof previousId === "string" && previousId && !previousId.includes("/")) {
        const previous = await tx.get(flags.doc(previousId));
        if (previous.exists && OPEN_STATUSES.has(String(previous.data()?.status ?? "pending"))) return "duplicate" as const;
      }
      const counted = Array.isArray(quota.data()?.windows) ? quota.data()!.windows : [];
      const windows = LIMITS.map((limit, index) => {
        const active = Number(counted[index]?.resetAt) > now;
        return { count: active ? Number(counted[index].count) || 0 : 0, resetAt: active ? Number(counted[index].resetAt) : now + limit.window };
      });
      if (windows.some((state, index) => state.count >= LIMITS[index].max)) return "limited" as const;
      // Exactly the fields the moderation routes and admin UI read; never undefined values.
      tx.create(flagRef, {
        status: "pending",
        severity: SEVERITY[reason as ReportReason],
        category: reason,
        reason,
        subjectType: targetType,
        subjectId: targetId,
        ...(title ? { subjectTitle: title } : {}),
        ...(details ? { description: details } : {}),
        reporter: uid,
        reporterId: uid,
        ...(reporterName ? { reporterName } : {}),
        ...(reporterEmail ? { reporterEmail } : {}),
        source: "report_button",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(markerRef, { flagId: flagRef.id, createdAt: now });
      tx.set(quotaRef, { windows: windows.map(state => ({ ...state, count: state.count + 1 })) });
      return "created" as const;
    });
    if (outcome === "duplicate") return NextResponse.json({ success: true, duplicate: true });
    if (outcome === "limited") {
      return NextResponse.json({ error: "You have sent several reports recently. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ success: true, duplicate: false }, { status: 201 });
  } catch (error) {
    console.error("[api/reports] Report could not be saved:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Reports are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
