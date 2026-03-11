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
  const [jobsSnap, postsSnap] = await Promise.all([
    db.collection("jobs")
      .where("active", "==", true)
      .select("slug", "title", "status", "active", "createdAt", "updatedAt", "postedAt", "publishedAt", "order")
      .get(),
    db.collection("posts")
      .where("type", "==", "job")
      .where("status", "==", "active")
      .select("slug", "title", "status", "active", "createdAt", "updatedAt", "postedAt", "publishedAt", "order")
      .get(),
  ]);

  return [
    ...jobsSnap.docs.map((doc): PublicJobCandidate => ({
      id: doc.id,
      source: "jobs",
      ...(doc.data() as Omit<PublicJobCandidate, "id" | "source">),
    })),
    ...postsSnap.docs.map((doc): PublicJobCandidate => ({
      id: doc.id,
      source: "posts",
      ...(doc.data() as Omit<PublicJobCandidate, "id" | "source">),
    })),
  ].filter((candidate) => isPublicJobVisible(candidate));
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
    if (exactMatch && slugMap.get(exactMatch.id) === idOrSlug) {
      return {
        id: exactMatch.id,
        source: exactMatch.source,
        routeSlug: slugMap.get(exactMatch.id) || buildJobRouteSlug(exactMatch),
      };
    }
  }

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
