import { buildJobRouteSlug } from "@/lib/server/job-slugs";
import {
  buildPublicJobRouteSlugMap,
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

async function loadPublicJobCandidates(db: FirebaseFirestore.Firestore): Promise<PublicJobCandidate[]> {
  // Full records are needed for prose deadlines and closed authoritative mirrors.
  const [jobsSnap, postsSnap] = await Promise.all([
    db.collection("jobs").get(),
    db.collection("posts").where("type", "==", "job").where("status", "==", "active").get(),
  ]);
  const authoritativeIds = new Set(jobsSnap.docs.map(doc => doc.id));
  return [
    ...jobsSnap.docs.map((doc): PublicJobCandidate => ({
      ...(doc.data() as Omit<PublicJobCandidate, "id" | "source">), id: doc.id, source: "jobs",
    })),
    ...postsSnap.docs.filter(doc => !authoritativeIds.has(doc.id)).map((doc): PublicJobCandidate => ({
      ...(doc.data() as Omit<PublicJobCandidate, "id" | "source">), id: doc.id, source: "posts",
    })),
  ].filter(candidate => (candidate.source !== "jobs" || candidate.active === true) && isPublicJobVisible(candidate));
}

export async function findPublicJobDocument(
  db: FirebaseFirestore.Firestore,
  idOrSlug: string,
): Promise<PublicJobMatch | null> {
  const candidates = await loadPublicJobCandidates(db);
  const slugMap = buildPublicJobRouteSlugMap(candidates);
  const { exactId, baseSlug } = parsePublicJobRouteSlug(idOrSlug);

  if (exactId) {
    const exactMatch = candidates.find((candidate) => candidate.id === exactId);
    if (exactMatch && buildJobRouteSlug(exactMatch) === baseSlug) {
      return {
        id: exactMatch.id,
        source: exactMatch.source,
        routeSlug: slugMap.get(exactMatch.id) || buildJobRouteSlug(exactMatch),
      };
    }
  }

  if (exactId) return null; // Never redirect an expired exact link to another job.
  const directIdMatch = candidates.find((candidate) => candidate.id === idOrSlug);
  if (directIdMatch) {
    return {
      id: directIdMatch.id,
      source: directIdMatch.source,
      routeSlug: slugMap.get(directIdMatch.id) || buildJobRouteSlug(directIdMatch),
    };
  }

  const uniqueSlugMatch = candidates.find((candidate) => slugMap.get(candidate.id) === idOrSlug);
  if (uniqueSlugMatch) {
    return {
      id: uniqueSlugMatch.id,
      source: uniqueSlugMatch.source,
      routeSlug: slugMap.get(uniqueSlugMatch.id) || buildJobRouteSlug(uniqueSlugMatch),
    };
  }

  const baseMatches = sortJobsByRecency(
    candidates.filter((candidate) => buildJobRouteSlug(candidate) === baseSlug),
  );

  if (baseMatches.length === 0) {
    return null;
  }

  const chosen = baseMatches[0];
  return {
    id: chosen.id,
    source: chosen.source,
    routeSlug: slugMap.get(chosen.id) || buildJobRouteSlug(chosen),
  };
}
