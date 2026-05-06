import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  EmployerApiError,
  requireEmployerContext,
} from "@/lib/server/employer-auth";

export const runtime = "nodejs";

type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "rejected"
  | "withdrawn";

const STATUS_VALUES = new Set<ApplicationStatus>([
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
  "withdrawn",
]);

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, field]) => [key, serialize(field)])
    );
  }
  return value;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isOwnedApplication(data: Record<string, unknown>, employerId: string, orgId: string): boolean {
  return data.employerId === employerId || data.employerId === orgId || data.orgId === orgId || data.orgId === employerId;
}

async function loadMemberProfiles(userIds: string[]) {
  const db = getAdminDb();
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const entries = await Promise.all(
    uniqueIds.map(async (uid) => {
      const snap = await db.collection("members").doc(uid).get();
      if (!snap.exists) return null;
      const data = snap.data() ?? {};
      return [uid, serialize({ id: uid, ...data })] as const;
    })
  );
  return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, unknown]>);
}

async function loadJobs(jobIds: string[]) {
  const db = getAdminDb();
  const uniqueIds = Array.from(new Set(jobIds.filter(Boolean)));
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const [jobSnap, postSnap] = await Promise.all([
        db.collection("jobs").doc(id).get(),
        db.collection("posts").doc(id).get(),
      ]);
      const snap = jobSnap.exists ? jobSnap : postSnap.exists ? postSnap : null;
      if (!snap) return null;
      const data = snap.data() ?? {};
      return [id, serialize({ id, title: data.title || "Untitled posting", type: data.type || "job", slug: data.slug || id })] as const;
    })
  );
  return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, unknown]>);
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    const db = getAdminDb();

    const [byEmployerSnap, byOrgSnap] = await Promise.all([
      db.collection("applications").where("employerId", "==", context.employerId).limit(200).get(),
      context.orgId === context.employerId
        ? Promise.resolve(null)
        : db.collection("applications").where("orgId", "==", context.orgId).limit(200).get(),
    ]);

    const docs = new Map<string, QueryDocumentSnapshot>();
    for (const doc of byEmployerSnap.docs) docs.set(doc.id, doc);
    for (const doc of byOrgSnap?.docs ?? []) docs.set(doc.id, doc);

    const applications = Array.from(docs.values())
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
      .filter((app) => isOwnedApplication(app, context.employerId, context.orgId))
      .sort((a, b) => {
        const aTime = (a.appliedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        const bTime = (b.appliedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

    const [profiles, jobs] = await Promise.all([
      loadMemberProfiles(applications.map((app) => normalizeString(app.userId))),
      loadJobs(applications.map((app) => normalizeString(app.jobId || app.postId))),
    ]);

    return NextResponse.json({
      applications: serialize(applications),
      profiles,
      jobs,
    });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load applications.";
    console.error("[api/employer/applications][GET]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    const body = (await req.json()) as { appId?: unknown; status?: unknown; reviewerNote?: unknown };
    const appId = normalizeString(body.appId);
    if (!appId) {
      return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    }

    const db = getAdminDb();
    const appRef = db.collection("applications").doc(appId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const data = (appSnap.data() ?? {}) as Record<string, unknown>;
    if (!isOwnedApplication(data, context.employerId, context.orgId)) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const status = normalizeString(body.status) as ApplicationStatus;
    if (status) {
      if (!STATUS_VALUES.has(status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      const history = Array.isArray(data.statusHistory) ? data.statusHistory : [];
      patch.status = status;
      patch.statusHistory = [...history, { status, timestamp: Timestamp.now() }];
    }

    if (typeof body.reviewerNote === "string") {
      patch.reviewerNote = body.reviewerNote;
    }

    await appRef.set(patch, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update application.";
    console.error("[api/employer/applications][PUT]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
