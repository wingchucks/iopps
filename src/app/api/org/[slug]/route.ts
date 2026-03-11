import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 120;

type JsonRecord = Record<string, unknown>;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return (
      (value as Record<string, unknown>).toDate as () => Date
    )().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function matchesOrgName(value: unknown, orgName: string): boolean {
  const candidate = normalizeText(value);
  const target = normalizeText(orgName);
  if (!candidate || !target) return false;
  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

function parseMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function dedupeByHref<T extends JsonRecord>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.href || item.slug || item.id || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortFeatured(items: JsonRecord[]): JsonRecord[] {
  return [...items].sort((left, right) => {
    if (left.featured && !right.featured) return -1;
    if (!left.featured && right.featured) return 1;
    return parseMillis(right.createdAt) - parseMillis(left.createdAt);
  });
}

function sortRecent(items: JsonRecord[]): JsonRecord[] {
  return [...items].sort((left, right) => {
    const rightTime =
      parseMillis(right.date) ||
      parseMillis(right.dates) ||
      parseMillis(right.startDate) ||
      parseMillis(right.createdAt);
    const leftTime =
      parseMillis(left.date) ||
      parseMillis(left.dates) ||
      parseMillis(left.startDate) ||
      parseMillis(left.createdAt);
    return rightTime - leftTime;
  });
}

function serializeDoc(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot,
): JsonRecord {
  return serialize({ id: doc.id, ...(doc.data() || {}) }) as JsonRecord;
}

async function resolveOrganization(
  db: FirebaseFirestore.Firestore,
  slug: string,
): Promise<JsonRecord | null> {
  const directDoc = await db.collection("organizations").doc(slug).get();
  if (directDoc.exists) return serializeDoc(directDoc);

  const slugQuery = await db
    .collection("organizations")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return serializeDoc(slugQuery.docs[0]);
  }

  const employerQuery = await db
    .collection("employers")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!employerQuery.empty) {
    return serializeDoc(employerQuery.docs[0]);
  }

  return null;
}

function normalizeJob(doc: FirebaseFirestore.QueryDocumentSnapshot, source: "jobs" | "posts"): JsonRecord {
  const serialized = serializeDoc(doc);
  if (serialized.salary && typeof serialized.salary === "object") {
    const salary = serialized.salary as JsonRecord;
    serialized.salary = salary.display ? String(salary.display) : "";
  }
  if (!serialized.employerName) {
    serialized.employerName = serialized.orgName || serialized.companyName || "";
  }
  serialized._source = source;
  serialized.href = `/jobs/${String(serialized.slug || serialized.id)}`;
  return serialized;
}

function normalizeEvent(item: JsonRecord): JsonRecord {
  return {
    ...item,
    href: `/events/${String(item.slug || item.id)}`,
  };
}

function normalizeScholarship(item: JsonRecord): JsonRecord {
  return {
    ...item,
    href: `/scholarships/${String(item.slug || item.id)}`,
  };
}

function normalizeProgram(item: JsonRecord): JsonRecord {
  const href =
    item._source === "training"
      ? `/training/${String(item.slug || item.id)}`
      : `/programs/${String(item.slug || item.id).replace(/^program-/, "")}`;

  return {
    ...item,
    href,
  };
}

async function loadJobs(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [jobsByIdSnap, jobsByNameSnap, postsByOrgSnap] = await Promise.all([
    db.collection("jobs").where("employerId", "==", orgId).get(),
    db.collection("jobs").where("employerName", "==", orgName).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const jobs = [
    ...jobsByIdSnap.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => normalizeJob(doc, "jobs")),
    ...jobsByNameSnap.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => normalizeJob(doc, "jobs")),
    ...postsByOrgSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.type === "job" && data.status !== "closed";
      })
      .map((doc) => normalizeJob(doc, "posts")),
  ];

  return sortFeatured(dedupeByHref(jobs));
}

async function loadEvents(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [eventsByEmployerSnap, eventsByOrgSnap, postsByOrgSnap] = await Promise.all([
    db.collection("events").where("employerId", "==", orgId).get(),
    db.collection("events").where("orgId", "==", orgId).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const exactMatches = [
    ...eventsByEmployerSnap.docs.map((doc) => normalizeEvent(serializeDoc(doc))),
    ...eventsByOrgSnap.docs.map((doc) => normalizeEvent(serializeDoc(doc))),
    ...postsByOrgSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.type === "event" && data.status !== "closed";
      })
      .map((doc) => normalizeEvent(serializeDoc(doc))),
  ];

  if (exactMatches.length > 0) {
    return sortRecent(dedupeByHref(exactMatches));
  }

  const allEventsSnap = await db.collection("events").limit(500).get();
  const fallbackMatches = allEventsSnap.docs
    .map((doc) => serializeDoc(doc))
    .filter((item) =>
      matchesOrgName(item.organizerName, orgName) ||
      matchesOrgName(item.orgName, orgName) ||
      matchesOrgName(item.organizer, orgName),
    )
    .map(normalizeEvent);

  return sortRecent(dedupeByHref(fallbackMatches));
}

async function loadScholarships(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [scholarshipsByEmployerSnap, scholarshipsByOrgSnap, postsByOrgSnap] = await Promise.all([
    db.collection("scholarships").where("employerId", "==", orgId).get(),
    db.collection("scholarships").where("orgId", "==", orgId).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const exactMatches = [
    ...scholarshipsByEmployerSnap.docs
      .filter((doc) => doc.data().status !== "closed")
      .map((doc) => normalizeScholarship(serializeDoc(doc))),
    ...scholarshipsByOrgSnap.docs
      .filter((doc) => doc.data().status !== "closed")
      .map((doc) => normalizeScholarship(serializeDoc(doc))),
    ...postsByOrgSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.type === "scholarship" && data.status !== "closed";
      })
      .map((doc) => normalizeScholarship(serializeDoc(doc))),
  ];

  if (exactMatches.length > 0) {
    return sortRecent(dedupeByHref(exactMatches));
  }

  const allScholarshipsSnap = await db.collection("scholarships").limit(500).get();
  const fallbackMatches = allScholarshipsSnap.docs
    .map((doc) => serializeDoc(doc))
    .filter((item) =>
      matchesOrgName(item.organization, orgName) ||
      matchesOrgName(item.orgName, orgName),
    )
    .map(normalizeScholarship);

  return sortRecent(dedupeByHref(fallbackMatches));
}

async function loadPrograms(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  orgName: string,
): Promise<JsonRecord[]> {
  const [trainingByOrgSnap, postsByOrgSnap] = await Promise.all([
    db.collection("training_programs").where("orgId", "==", orgId).get(),
    db.collection("posts").where("orgId", "==", orgId).get(),
  ]);

  const exactMatches = [
    ...trainingByOrgSnap.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => normalizeProgram({ ...serializeDoc(doc), _source: "training" })),
    ...postsByOrgSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.type === "program" && data.status !== "closed";
      })
      .map((doc) => normalizeProgram({ ...serializeDoc(doc), _source: "program" })),
  ];

  if (exactMatches.length > 0) {
    return sortRecent(dedupeByHref(exactMatches));
  }

  const [allTrainingSnap, allProgramPostsSnap] = await Promise.all([
    db.collection("training_programs").limit(500).get(),
    db.collection("posts").where("type", "==", "program").get(),
  ]);

  const trainingFallback: JsonRecord[] = allTrainingSnap.docs.map((doc) => ({
    ...serializeDoc(doc),
    _source: "training",
  }));
  const postProgramFallback: JsonRecord[] = allProgramPostsSnap.docs.map((doc) => ({
    ...serializeDoc(doc),
    _source: "program",
  }));

  const fallbackMatches = [
    ...trainingFallback
      .filter((item) =>
        matchesOrgName(item.orgName, orgName) ||
        matchesOrgName(item.provider, orgName) ||
        matchesOrgName(item.institutionName, orgName),
      )
      .map(normalizeProgram),
    ...postProgramFallback
      .filter((item) =>
        matchesOrgName(item.orgName, orgName) || matchesOrgName(item.provider, orgName),
      )
      .map(normalizeProgram),
  ];

  return sortRecent(dedupeByHref(fallbackMatches));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const db = getAdminDb();
    const org = await resolveOrganization(db, slug);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const orgId = String(org.id || "");
    const orgName = String(org.name || "");

    const [jobs, events, scholarships, programs] = await Promise.all([
      loadJobs(db, orgId, orgName),
      loadEvents(db, orgId, orgName),
      loadScholarships(db, orgId, orgName),
      loadPrograms(db, orgId, orgName),
    ]);

    return NextResponse.json({
      org,
      jobs,
      events,
      scholarships,
      programs,
    });
  } catch (err) {
    console.error("[api/org] Error:", err);
    return NextResponse.json({ error: "Failed to load organization" }, { status: 500 });
  }
}
