import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  fetchImportedDescriptionPatch,
  normalizeImportedDescription,
} from "@/lib/server/imported-job-descriptions";
import { buildJobRouteSlug } from "@/lib/server/job-slugs";

export const runtime = "nodejs";

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

async function findJobDocument(
  db: FirebaseFirestore.Firestore,
  idOrSlug: string
) {
  const jobsDoc = await db.collection("jobs").doc(idOrSlug).get();
  if (jobsDoc.exists) {
    return {
      docRef: jobsDoc,
      source: "jobs" as const,
      routeSlug: buildJobRouteSlug({
        id: jobsDoc.id,
        slug: jobsDoc.data()?.slug as string | undefined,
        title: jobsDoc.data()?.title as string | undefined,
      }),
    };
  }

  const jobsBySlug = await db.collection("jobs").where("slug", "==", idOrSlug).limit(1).get();
  if (!jobsBySlug.empty) {
    const docRef = jobsBySlug.docs[0];
    return {
      docRef,
      source: "jobs" as const,
      routeSlug: buildJobRouteSlug({
        id: docRef.id,
        slug: docRef.data().slug as string | undefined,
        title: docRef.data().title as string | undefined,
      }),
    };
  }

  const postsDoc = await db.collection("posts").doc(idOrSlug).get();
  if (postsDoc.exists) {
    return {
      docRef: postsDoc,
      source: "posts" as const,
      routeSlug: buildJobRouteSlug({
        id: postsDoc.id,
        slug: postsDoc.data()?.slug as string | undefined,
        title: postsDoc.data()?.title as string | undefined,
      }),
    };
  }

  const postsBySlug = await db.collection("posts").where("slug", "==", idOrSlug).limit(1).get();
  if (!postsBySlug.empty) {
    const docRef = postsBySlug.docs[0];
    return {
      docRef,
      source: "posts" as const,
      routeSlug: buildJobRouteSlug({
        id: docRef.id,
        slug: docRef.data().slug as string | undefined,
        title: docRef.data().title as string | undefined,
      }),
    };
  }

  const [activeJobs, activePosts] = await Promise.all([
    db.collection("jobs").where("active", "==", true).select("slug", "title").get(),
    db.collection("posts").where("type", "==", "job").where("status", "==", "active").select("slug", "title").get(),
  ]);

  const matches: Array<{
    docRef: FirebaseFirestore.QueryDocumentSnapshot;
    source: "jobs" | "posts";
    routeSlug: string;
  }> = [];

  for (const docRef of activeJobs.docs) {
    const routeSlug = buildJobRouteSlug({
      id: docRef.id,
      slug: docRef.data().slug as string | undefined,
      title: docRef.data().title as string | undefined,
    });
    if (routeSlug === idOrSlug) {
      matches.push({ docRef, source: "jobs", routeSlug });
    }
  }

  for (const docRef of activePosts.docs) {
    const routeSlug = buildJobRouteSlug({
      id: docRef.id,
      slug: docRef.data().slug as string | undefined,
      title: docRef.data().title as string | undefined,
    });
    if (routeSlug === idOrSlug) {
      matches.push({ docRef, source: "posts", routeSlug });
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getAdminDb();

    const found = await findJobDocument(db, id);
    if (!found) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { docRef, source, routeSlug } = found;
    const data = docRef.data()!;

    if (!data.slug && routeSlug && routeSlug !== docRef.id) {
      await docRef.ref.set({ slug: routeSlug }, { merge: true });
      data.slug = routeSlug;
    }

    if (source === "jobs") {
      let feedUrl = "";
      if (typeof data.feedId === "string" && data.feedId) {
        const feedDoc = await db.collection("rssFeeds").doc(data.feedId).get();
        feedUrl = typeof feedDoc.data()?.feedUrl === "string" ? feedDoc.data()!.feedUrl : "";
      }

      const hydratedPatch = await fetchImportedDescriptionPatch({
        description: typeof data.description === "string" ? data.description : "",
        externalUrl: typeof data.externalUrl === "string" ? data.externalUrl : "",
        externalId: typeof data.externalId === "string" ? data.externalId : "",
        location: typeof data.location === "string" ? data.location : "",
        jobType: typeof data.jobType === "string" ? data.jobType : "",
        department: typeof data.department === "string" ? data.department : "",
        feedUrl,
      });

      if (hydratedPatch) {
        const firestorePatch: Record<string, unknown> = { ...hydratedPatch };
        await docRef.ref.update(firestorePatch);
        Object.assign(data, firestorePatch);

        if (hydratedPatch.active === false || hydratedPatch.status === "expired") {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
      }
    }

    const job = serialize({ id: docRef.id, ...data, _source: source }) as Record<string, unknown>;
    job.slug = buildJobRouteSlug({
      id: docRef.id,
      slug: typeof job.slug === "string" ? job.slug : routeSlug,
      title: typeof job.title === "string" ? job.title : undefined,
    });

    // Normalize salary object to string
    if (job.salary && typeof job.salary === "object") {
      const salObj = job.salary as Record<string, unknown>;
      job.salary = salObj.display ? String(salObj.display) : "";
    }

    // Normalize employer name
    if (!job.employerName) {
      job.employerName = job.orgName || job.companyName || "";
    }
    if (typeof job.description === "string") {
      job.description = normalizeImportedDescription(job.description);
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error("Job detail API error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}
