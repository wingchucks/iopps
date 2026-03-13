import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildPublicJobRouteSlugMap, isPublicJobVisible } from "@/lib/public-jobs";
import { withPartnerPromotion } from "@/lib/server/partner-promotion";
import { displayAmount } from "@/lib/utils";
import {
  deriveOwnerType,
  matchesOrgName,
  serialize,
  withPublicOwnership,
  type JsonRecord,
} from "@/lib/server/public-ownership";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function serializeDoc(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot,
): JsonRecord {
  return serialize({ id: doc.id, ...(doc.data() || {}) }) as JsonRecord;
}

async function resolveSchool(
  db: FirebaseFirestore.Firestore,
  slug: string,
): Promise<JsonRecord | null> {
  const directDoc = await db.collection("organizations").doc(slug).get();
  if (directDoc.exists) {
    const school = serializeDoc(directDoc);
    return deriveOwnerType(school) === "school" ? school : null;
  }

  const slugQuery = await db.collection("organizations").where("slug", "==", slug).limit(1).get();
  if (slugQuery.empty) return null;

  const school = serializeDoc(slugQuery.docs[0]);
  return deriveOwnerType(school) === "school" ? school : null;
}

function sortRecent(items: JsonRecord[], ...dateKeys: string[]): JsonRecord[] {
  return [...items].sort((left, right) => {
    const parse = (value: unknown) => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const rightTime = dateKeys.map((key) => parse(right[key])).find((value) => value > 0) || 0;
    const leftTime = dateKeys.map((key) => parse(left[key])).find((value) => value > 0) || 0;
    return rightTime - leftTime;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const db = getAdminDb();
    const schoolRecord = await resolveSchool(db, slug);

    if (!schoolRecord) {
      return NextResponse.json({ org: null, programs: [], scholarships: [], jobs: [] }, { status: 404 });
    }

    const school = withPartnerPromotion(schoolRecord);

    const schoolId = text(school.id);
    const schoolName = text(school.name);

    const [programPostsSnap, scholarshipsSnap, scholarshipPostsSnap, jobsSnap, jobPostsSnap] = await Promise.all([
      db.collection("posts").where("type", "==", "program").get(),
      db.collection("scholarships").where("status", "==", "active").get(),
      db.collection("posts").where("type", "==", "scholarship").get(),
      db.collection("jobs").get(),
      db.collection("posts").where("type", "==", "job").get(),
    ]);

    const programs = sortRecent(
      programPostsSnap.docs
        .map((doc) => serializeDoc(doc))
        .filter((program) => text(program.status).toLowerCase() !== "closed")
        .filter((program) =>
          text(program.orgId) === schoolId ||
          matchesOrgName(program.orgName, schoolName) ||
          matchesOrgName(program.provider, schoolName) ||
          matchesOrgName(program.institutionName, schoolName),
        )
        .map((program) =>
          withPublicOwnership(
            {
              ...program,
              slug: text(program.slug) || text(program.id).replace(/^program-/, ""),
              cost: displayAmount(program.cost),
              href: `/programs/${text(program.slug) || text(program.id).replace(/^program-/, "")}`,
            },
            {
              contentType: "program",
              ownerType: "school",
              ownerId: schoolId,
              ownerName: schoolName,
              ownerSlug: text(school.slug) || schoolId,
            },
          ),
        ),
      "createdAt",
      "updatedAt",
    );

    const scholarships = sortRecent(
      [
        ...scholarshipsSnap.docs.map((doc) => serializeDoc(doc)),
        ...scholarshipPostsSnap.docs
          .map((doc) => serializeDoc(doc))
          .filter((post) => text(post.status).toLowerCase() !== "closed"),
      ]
        .filter((scholarship) =>
          text(scholarship.orgId) === schoolId ||
          text(scholarship.employerId) === schoolId ||
          matchesOrgName(scholarship.orgName, schoolName) ||
          matchesOrgName(scholarship.organization, schoolName),
        )
        .map((scholarship) =>
          withPublicOwnership(
            {
              ...scholarship,
              slug: text(scholarship.slug) || text(scholarship.id),
              amount: displayAmount(scholarship.amount),
              href: `/scholarships/${text(scholarship.slug) || text(scholarship.id)}`,
            },
            {
              contentType: "scholarship",
              ownerType: "school",
              ownerId: schoolId,
              ownerName: schoolName,
              ownerSlug: text(school.slug) || schoolId,
            },
          ),
        ),
      "deadline",
      "createdAt",
    );

    const rawJobs = [
      ...jobsSnap.docs
        .filter((doc) => isPublicJobVisible(doc.data()))
        .map((doc) => serializeDoc(doc))
        .filter((job) => text(job.employerId) === schoolId || matchesOrgName(job.employerName, schoolName)),
      ...jobPostsSnap.docs
        .map((doc) => serializeDoc(doc))
        .filter((job) => text(job.status).toLowerCase() !== "closed")
        .filter((job) => text(job.orgId) === schoolId || matchesOrgName(job.orgName, schoolName)),
    ];

    const dedupedJobs = Array.from(new Map(rawJobs.map((job) => [text(job.id), job])).values());
    const slugMap = buildPublicJobRouteSlugMap(
      dedupedJobs.map((job) => ({
        id: text(job.id),
        slug: text(job.slug) || undefined,
        title: text(job.title) || undefined,
      })),
    );

    const jobs = sortRecent(
      dedupedJobs.map((job) => ({
        ...job,
        href: `/jobs/${slugMap.get(text(job.id)) || text(job.slug) || text(job.id)}`,
      })),
      "updatedAt",
      "publishedAt",
      "createdAt",
    );

    return NextResponse.json({
      org: {
        ...school,
        ownerType: "school",
      },
      programs,
      scholarships,
      jobs,
    });
  } catch (err) {
    console.error("Failed to fetch school:", err);
    return NextResponse.json({ org: null, programs: [], scholarships: [], jobs: [] }, { status: 500 });
  }
}
