import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import {
  isPublicJobVisible,
  parsePublicJobRouteSlug,
  sortJobsByRecency,
} from "@/lib/public-jobs";

type PublicJobCandidate = {
  id: string;
  source: "jobs" | "posts";
  slug?: string;
  title?: string;
  active?: boolean;
  status?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  postedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  order?: number | null;
};

type PublicJobMatch = {
  id: string;
  source: "jobs" | "posts";
  routeSlug: string;
};

/**
 * Route base of every active job candidate (`jobs` with active === true and
 * active `posts` job mirrors), read with select() so no descriptions are loaded.
 * It only says where to look: candidacy is always re-checked on fresh documents.
 */
export type PublicJobRouteIndex = {
  routes: Array<[routeBase: string, documentId: string]>;
  /** Set on a shared cached index; later changes come from a fresh, paged query. */
  builtAt?: number;
};
export type PublicJobRouteIndexLoader = () => Promise<PublicJobRouteIndex>;

const ROUTE_FIELDS = ["slug", "title"] as const;
const STORED_SLUG_LIMIT = 25;
const RECENT_CHANGE_PAGE = 200;
// Paging stops after this many pages per collection (a large feed import, say) and the
// lookup reads the current index instead, so no request pages through an unbounded history.
const RECENT_CHANGE_PAGES = 5;
// Server clocks and Firestore commit times may differ slightly.
const RECENT_CHANGE_MARGIN_MS = 60_000;

type Firestore = FirebaseFirestore.Firestore;
type DocumentData = FirebaseFirestore.DocumentData;

function routeBase(id: string, data: DocumentData): string {
  return buildJobRouteSlug({ id, slug: data.slug, title: data.title });
}

function utf8Length(value: string): number {
  let length = 0;
  for (const character of value) {
    const point = character.codePointAt(0) || 0;
    length += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return length;
}

function isDocumentId(value: string): boolean {
  return value.length > 0 && utf8Length(value) <= 1500 && !value.includes("/") &&
    value !== "." && value !== ".." && !/^__.*__$/.test(value);
}

/** Firestore's document order (UTF-8 bytes, i.e. code points), used to break ties. */
function compareDocumentIds(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const delta = (a[index].codePointAt(0) || 0) - (b[index].codePointAt(0) || 0);
    if (delta) return delta;
  }
  return a.length - b.length;
}

/** A jobs record is authoritative whatever its state; a posts mirror never revives it. */
function publicCandidate(
  id: string,
  job: FirebaseFirestore.DocumentSnapshot,
  post: FirebaseFirestore.DocumentSnapshot,
): PublicJobCandidate | null {
  if (job.exists) {
    const data = job.data() || {};
    return data.active === true && isPublicJobVisible(data) ? { ...data, id, source: "jobs" } : null;
  }
  if (!post.exists) return null;
  const data = post.data() || {};
  return data.type === "job" && data.status === "active" && isPublicJobVisible(data)
    ? { ...data, id, source: "posts" }
    : null;
}

async function loadCandidates(db: Firestore, ids: Iterable<string>): Promise<Map<string, PublicJobCandidate>> {
  const unique = [...new Set(ids)].filter(isDocumentId);
  const found = new Map<string, PublicJobCandidate>();
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const snapshots = await db.getAll(...batch.flatMap(id => [db.collection("jobs").doc(id), db.collection("posts").doc(id)]));
    batch.forEach((id, index) => {
      const candidate = publicCandidate(id, snapshots[index * 2], snapshots[index * 2 + 1]);
      if (candidate) found.set(id, candidate);
    });
  }
  return found;
}

/** Fresh: a stored slug equal to the route is found without the index. */
async function storedSlugIds(db: Firestore, base: string): Promise<string[]> {
  if (!base) return [];
  const [jobs, posts] = await Promise.all([
    db.collection("jobs").where("slug", "==", base).where("active", "==", true)
      .select().limit(STORED_SLUG_LIMIT).get(),
    db.collection("posts").where("slug", "==", base).where("type", "==", "job").where("status", "==", "active")
      .select().limit(STORED_SLUG_LIMIT).get(),
  ]);
  return [...jobs.docs, ...posts.docs].map(doc => doc.id);
}

/**
 * Records written after a cached index was read (publication, approval, imports), or
 * null when there are too many to page through: never a silently truncated list.
 */
async function recentlyChangedRoutes(db: Firestore, since: number): Promise<PublicJobRouteIndex["routes"] | null> {
  const after = new Date(since - RECENT_CHANGE_MARGIN_MS);
  const changed = await Promise.all(["jobs", "posts"].map(async collection => {
    // Oldest first: a record written again while paging moves ahead of the cursor
    // instead of behind it. The cursor needs updatedAt in each snapshot.
    let query = db.collection(collection).where("updatedAt", ">=", after).orderBy("updatedAt")
      .select(...ROUTE_FIELDS, "updatedAt").limit(RECENT_CHANGE_PAGE);
    const routes: PublicJobRouteIndex["routes"] = [];
    for (let page = 0; page < RECENT_CHANGE_PAGES; page++) {
      const snapshot = await query.get();
      routes.push(...snapshot.docs.map(doc => [routeBase(doc.id, doc.data()), doc.id] as [string, string]));
      if (snapshot.size < RECENT_CHANGE_PAGE) return routes;
      query = query.startAfter(snapshot.docs[snapshot.docs.length - 1]);
    }
    return null;
  }));
  return changed.every(routes => routes !== null) ? changed.flat() : null;
}

/** Reads only the slug/title of active candidates; never descriptions or history. */
export async function buildPublicJobRouteIndex(db: Firestore): Promise<PublicJobRouteIndex> {
  const [jobs, posts] = await Promise.all([
    db.collection("jobs").where("active", "==", true).select(...ROUTE_FIELDS).get(),
    db.collection("posts").where("type", "==", "job").where("status", "==", "active").select(...ROUTE_FIELDS).get(),
  ]);
  return { routes: [...jobs.docs, ...posts.docs].map(doc => [routeBase(doc.id, doc.data()), doc.id] as [string, string]) };
}

function routeMatch(candidate: PublicJobCandidate, members: PublicJobCandidate[]): PublicJobMatch {
  const base = buildJobRouteSlug(candidate);
  // A route shared by several public jobs is addressed with the job's ID suffix.
  return { id: candidate.id, source: candidate.source, routeSlug: members.length > 1 ? `${base}--${candidate.id}` : base };
}

/** The order of a full candidate listing: jobs before mirrors, then document order. */
function listingOrder(left: PublicJobCandidate, right: PublicJobCandidate): number {
  const rank = (candidate: PublicJobCandidate) => candidate.source === "jobs" ? 0 : 1;
  return rank(left) - rank(right) || compareDocumentIds(left.id, right.id);
}

function newest(members: PublicJobCandidate[]): PublicJobCandidate {
  return sortJobsByRecency([...members].sort(listingOrder))[0];
}

/**
 * Resolves a public job route: a document ID, "<route>--<id>", or a route slug.
 * Only the referenced documents and the jobs sharing that route are read. Without
 * a loader the index is read uncached from `db`; request handlers pass the shared
 * cached index (`loadCachedPublicJobRouteIndex` in `@/lib/public-job-route-cache`).
 */
export async function findPublicJobDocument(
  db: Firestore,
  idOrSlug: string,
  loadIndex: PublicJobRouteIndexLoader = () => buildPublicJobRouteIndex(db),
): Promise<PublicJobMatch | null> {
  const { exactId, baseSlug } = parsePublicJobRouteSlug(idOrSlug);
  let knownRoutes: Promise<PublicJobRouteIndex["routes"]> | undefined;
  const routes = () => knownRoutes ||= loadIndex().then(async index => {
    if (index.builtAt === undefined) return index.routes;
    const changed = await recentlyChangedRoutes(db, index.builtAt);
    // Too many changes since the cached index was read: use the current index instead.
    return changed ? [...index.routes, ...changed] : (await buildPublicJobRouteIndex(db)).routes;
  });
  const routeIds = async (base: string) => {
    const [indexed, stored] = await Promise.all([routes(), storedSlugIds(db, base)]);
    return [...indexed.filter(([route]) => route === base).map(([, id]) => id), ...stored];
  };
  const routeMembers = async (base: string, ids: string[], known: PublicJobCandidate[] = []) => {
    const loaded = await loadCandidates(db, ids.filter(id => !known.some(candidate => candidate.id === id)));
    return [...known, ...loaded.values()].filter(candidate => buildJobRouteSlug(candidate) === base);
  };
  const candidate = async (id: string) => (await loadCandidates(db, [id])).get(id);

  if (exactId) {
    const [exact, ids] = await Promise.all([candidate(exactId), routeIds(baseSlug)]);
    // Never redirect an expired exact link to another job.
    if (!exact || buildJobRouteSlug(exact) !== baseSlug) return null;
    return routeMatch(exact, await routeMembers(baseSlug, ids, [exact]));
  }

  const [direct, ids] = await Promise.all([candidate(idOrSlug), routeIds(idOrSlug)]);
  if (direct) {
    const base = buildJobRouteSlug(direct);
    return routeMatch(direct, await routeMembers(base, base === idOrSlug ? ids : await routeIds(base), [direct]));
  }

  const members = await routeMembers(idOrSlug, ids);
  if (idOrSlug === baseSlug) return members.length ? routeMatch(newest(members), members) : null;

  // Only input ending in "--" gets here. As in a full listing, it may name a unique
  // route or a shared route plus an ID that itself ends in "--"; else the newest base match.
  const listed: Array<[PublicJobCandidate, PublicJobCandidate[]]> = members.length === 1 ? [[members[0], members]] : [];
  for (let at = idOrSlug.indexOf("--"); at !== -1; at = idOrSlug.indexOf("--", at + 1)) {
    const id = idOrSlug.slice(at + 2);
    const base = idOrSlug.slice(0, at);
    const suffixed = id ? await candidate(id) : undefined;
    if (!suffixed || buildJobRouteSlug(suffixed) !== base) continue;
    const shared = await routeMembers(base, await routeIds(base), [suffixed]);
    if (shared.length > 1) listed.push([suffixed, shared]);
  }
  const [first] = listed.sort(([left], [right]) => listingOrder(left, right));
  if (first) return routeMatch(...first);
  const baseMembers = await routeMembers(baseSlug, await routeIds(baseSlug));
  return baseMembers.length ? routeMatch(newest(baseMembers), baseMembers) : null;
}
