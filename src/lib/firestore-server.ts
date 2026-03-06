/**
 * Server-side Firestore data fetching using firebase-admin.
 * Used by server components to fetch data for SSR/SEO.
 * Client components should continue using the modules in ./firestore/*.
 */
import { getAdminDb } from "./firebase-admin";
import { sanitizeJobHtml } from "./html";

// ---------------------------------------------------------------------------
// Serialization — convert Firestore Timestamps and strip undefined values
// ---------------------------------------------------------------------------
export function serialize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;

  // Firestore Timestamp (has toDate method)
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return (
      (value as Record<string, unknown>).toDate as () => Date
    )().toISOString();
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  // Plain objects
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }

  // Primitives
  return value;
}

function normalizeLocation(
  loc: unknown
): string | Record<string, unknown> | null {
  if (!loc) return null;
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && !Array.isArray(loc)) {
    const l = loc as Record<string, unknown>;
    // If it has city/province, keep as object for displayLocation
    if (l.city || l.province || l.venue || l.remote) {
      return serialize(l) as Record<string, unknown>;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function getJobsServer() {
  const db = getAdminDb();
  const [jobsSnap, postsSnap] = await Promise.all([
    db.collection("jobs").where("active", "==", true).get(),
    db
      .collection("posts")
      .where("type", "==", "job")
      .where("status", "==", "active")
      .get(),
  ]);

  const jobIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobs: any[] = [];

  jobsSnap.docs.forEach((doc) => {
    jobIds.add(doc.id);
    const data = doc.data();
    const job = serialize({ id: doc.id, ...data }) as Record<string, unknown>;
    // Normalize salary object to string
    if (job.salary && typeof job.salary === "object") {
      const salObj = job.salary as Record<string, unknown>;
      job.salary = salObj.display ? String(salObj.display) : "";
    }
    if (!job.employerName) {
      job.employerName = job.orgName || job.companyName || "";
    }
    if (typeof job.description === "string" && job.description.trim()) {
      job.description = sanitizeJobHtml(job.description);
    }
    jobs.push(job);
  });

  postsSnap.docs.forEach((doc) => {
    const slug = doc.data().slug || doc.id;
    if (!jobIds.has(doc.id) && !jobIds.has(slug)) {
      const data = doc.data();
      const job = serialize({ id: doc.id, ...data }) as Record<
        string,
        unknown
      >;
      if (job.salary && typeof job.salary === "object") {
        const salObj = job.salary as Record<string, unknown>;
        job.salary = salObj.display ? String(salObj.display) : "";
      }
      if (!job.employerName) {
        job.employerName = job.orgName || job.companyName || "";
      }
      if (typeof job.description === "string" && job.description.trim()) {
        job.description = sanitizeJobHtml(job.description);
      }
      jobs.push(job);
    }
  });

  return jobs;
}

export async function getJobBySlugServer(slug: string) {
  const db = getAdminDb();

  // Check jobs collection first
  let docRef = await db.collection("jobs").doc(slug).get();
  if (!docRef.exists) {
    // Try posts collection
    docRef = await db.collection("posts").doc(slug).get();
  }
  if (!docRef.exists) {
    // Try with job- prefix
    docRef = await db.collection("posts").doc(`job-${slug}`).get();
  }
  if (!docRef.exists) return null;

  const data = docRef.data()!;
  const job = serialize({ id: docRef.id, ...data }) as Record<string, unknown>;
  if (job.salary && typeof job.salary === "object") {
    const salObj = job.salary as Record<string, unknown>;
    job.salary = salObj.display ? String(salObj.display) : "";
  }
  if (!job.employerName) {
    job.employerName = job.orgName || job.companyName || "";
  }
  if (typeof job.description === "string" && job.description.trim()) {
    job.description = sanitizeJobHtml(job.description);
  }
  return job;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export async function getEventsServer() {
  const db = getAdminDb();
  let snap = await db.collection("events").orderBy("order", "asc").get();

  if (snap.empty) {
    // Fallback to posts
    snap = await db
      .collection("posts")
      .where("type", "==", "event")
      .orderBy("order", "asc")
      .get();
  }

  return snap.docs.map((doc) => {
    const data = doc.data();
    const item = serialize({ id: doc.id, ...data }) as Record<
      string,
      unknown
    >;
    item.location = normalizeLocation(data.location);
    if (!item.slug) item.slug = doc.id.replace(/^event-/, "");
    return item;
  });
}

export async function getEventBySlugServer(slug: string) {
  const db = getAdminDb();

  // Try direct doc ID
  let docRef = await db.collection("events").doc(slug).get();
  if (!docRef.exists) {
    // Try slug field query
    const snap = await db
      .collection("events")
      .where("slug", "==", slug)
      .get();
    if (!snap.empty) {
      docRef = snap.docs[0];
    }
  }
  if (!docRef.exists) {
    // Fallback to posts
    docRef = await db.collection("posts").doc(`event-${slug}`).get();
  }
  if (!docRef.exists) {
    docRef = await db.collection("posts").doc(slug).get();
  }
  if (!docRef.exists) return null;

  const data = docRef.data()!;
  const item = serialize({ id: docRef.id, ...data }) as Record<
    string,
    unknown
  >;
  item.location = normalizeLocation(data.location);
  return item;
}

// ---------------------------------------------------------------------------
// Scholarships
// ---------------------------------------------------------------------------
export async function getScholarshipsServer() {
  const db = getAdminDb();
  let snap = await db
    .collection("scholarships")
    .orderBy("order", "asc")
    .get();

  if (snap.empty) {
    snap = await db
      .collection("posts")
      .where("type", "==", "scholarship")
      .orderBy("order", "asc")
      .get();
  }

  return snap.docs.map((doc) => {
    const data = doc.data();
    const item = serialize({ id: doc.id, ...data }) as Record<
      string,
      unknown
    >;
    if (!item.slug) item.slug = doc.id.replace(/^scholarship-/, "");
    return item;
  });
}

export async function getScholarshipBySlugServer(slug: string) {
  const db = getAdminDb();

  // Try direct doc ID
  let docRef = await db.collection("scholarships").doc(slug).get();
  if (!docRef.exists) {
    // Try slug field query
    const snap = await db
      .collection("scholarships")
      .where("slug", "==", slug)
      .get();
    if (!snap.empty) {
      docRef = snap.docs[0];
    }
  }
  if (!docRef.exists) {
    docRef = await db.collection("posts").doc(`scholarship-${slug}`).get();
  }
  if (!docRef.exists) {
    docRef = await db.collection("posts").doc(slug).get();
  }
  if (!docRef.exists) return null;

  const data = docRef.data()!;
  return serialize({ id: docRef.id, ...data }) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Stories / Spotlights (from posts collection)
// ---------------------------------------------------------------------------
export async function getStoriesServer() {
  const db = getAdminDb();
  const [storiesSnap, spotlightsSnap] = await Promise.all([
    db
      .collection("posts")
      .where("type", "==", "story")
      .orderBy("order", "asc")
      .get(),
    db
      .collection("posts")
      .where("type", "==", "spotlight")
      .orderBy("order", "asc")
      .get(),
  ]);

  const normalize = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    const item = serialize({ id: doc.id, ...data }) as Record<
      string,
      unknown
    >;
    item.location = normalizeLocation(data.location);
    return item;
  };

  return {
    stories: storiesSnap.docs.map(normalize),
    spotlights: spotlightsSnap.docs.map(normalize),
  };
}

export async function getStoryBySlugServer(slug: string) {
  const db = getAdminDb();

  // Try story-{slug}, then spotlight-{slug}, then raw slug
  for (const id of [`story-${slug}`, `spotlight-${slug}`, slug]) {
    const docRef = await db.collection("posts").doc(id).get();
    if (docRef.exists) {
      const data = docRef.data()!;
      const item = serialize({ id: docRef.id, ...data }) as Record<
        string,
        unknown
      >;
      item.location = normalizeLocation(data.location);
      return item;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Programs (from posts collection)
// ---------------------------------------------------------------------------
export async function getProgramsServer() {
  const db = getAdminDb();
  const snap = await db
    .collection("posts")
    .where("type", "==", "program")
    .orderBy("order", "asc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const item = serialize({ id: doc.id, ...data }) as Record<
      string,
      unknown
    >;
    item.location = normalizeLocation(data.location);
    return item;
  });
}

export async function getProgramBySlugServer(slug: string) {
  const db = getAdminDb();

  for (const id of [`program-${slug}`, slug]) {
    const docRef = await db.collection("posts").doc(id).get();
    if (docRef.exists) {
      const data = docRef.data()!;
      const item = serialize({ id: docRef.id, ...data }) as Record<
        string,
        unknown
      >;
      item.location = normalizeLocation(data.location);
      return item;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Training Programs
// ---------------------------------------------------------------------------
export async function getTrainingProgramsServer() {
  const db = getAdminDb();
  const snap = await db
    .collection("training_programs")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return serialize({ id: doc.id, ...data }) as Record<string, unknown>;
  });
}

export async function getTrainingBySlugServer(slug: string) {
  const db = getAdminDb();
  const snap = await db
    .collection("training_programs")
    .where("slug", "==", slug)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
export async function getShopDataServer() {
  const db = getAdminDb();
  const [listingsSnap, vendorsSnap] = await Promise.all([
    db
      .collection("shop_listings")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .get(),
    db.collection("shop_vendors").orderBy("name", "asc").get(),
  ]);

  const listings = listingsSnap.docs.map((doc) =>
    serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>
  );

  const vendors = vendorsSnap.docs.map((doc) =>
    serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>
  );

  return { listings, vendors };
}

export async function getVendorBySlugServer(slug: string) {
  const db = getAdminDb();
  const snap = await db
    .collection("shop_vendors")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Organizations (Partners page)
// ---------------------------------------------------------------------------
export async function getOrganizationsServer() {
  const db = getAdminDb();
  const snap = await db.collection("organizations").orderBy("name").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const item = serialize({ id: doc.id, ...data }) as Record<
        string,
        unknown
      >;
      item.location = normalizeLocation(data.location);
      return item;
    })
    .filter((org) => org.verified === true);
}

// ---------------------------------------------------------------------------
// Schools (subset of organizations)
// ---------------------------------------------------------------------------
export async function getSchoolsServer() {
  const db = getAdminDb();
  const [snap, tierSnap] = await Promise.all([
    db.collection("organizations").where("type", "==", "school").where("onboardingComplete", "==", true).get(),
    db.collection("organizations").where("tier", "==", "school").where("onboardingComplete", "==", true).get(),
  ]);

  const seen = new Set<string>();
  const schools: Record<string, unknown>[] = [];
  for (const doc of [...snap.docs, ...tierSnap.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const data = doc.data();
    const item = serialize({ id: doc.id, ...data }) as Record<string, unknown>;
    item.location = normalizeLocation(data.location);
    schools.push(item);
  }
  return schools.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function getOrganizationServer(orgId: string) {
  const db = getAdminDb();
  const docRef = await db.collection("organizations").doc(orgId).get();
  if (!docRef.exists) return null;
  const data = docRef.data()!;
  const item = serialize({ id: docRef.id, ...data }) as Record<
    string,
    unknown
  >;
  item.location = normalizeLocation(data.location);
  return item;
}
