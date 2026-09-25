import { parsePublicJobRouteSlug } from "@/lib/public-jobs";

export interface JobRecordMatch {
  id: string;
  source: "jobs" | "posts";
  data: Record<string, unknown>;
}

function isDocumentId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 700 && !value.includes("/") && value !== "." && value !== "..";
}

/**
 * Finds a job by route slug, id or legacy slug whatever its lifecycle state, so a
 * closed job's page and saved bookmarks can still explain what happened. Callers
 * decide what may be shown (see listingState); this never grants visibility.
 */
export async function findJobRecordAnyState(db: FirebaseFirestore.Firestore, idOrSlug: string): Promise<JobRecordMatch | null> {
  const { exactId } = parsePublicJobRouteSlug(idOrSlug);
  const ids = [...new Set([exactId, idOrSlug].filter(isDocumentId))];
  for (const id of ids) {
    for (const source of ["jobs", "posts"] as const) {
      const doc = await db.collection(source).doc(id).get();
      const data = doc.data();
      if (doc.exists && data && (source === "jobs" || data.type === "job")) return { id: doc.id, source, data };
    }
  }
  if (!isDocumentId(idOrSlug)) return null;
  const bySlug = await db.collection("jobs").where("slug", "==", idOrSlug).limit(2).get();
  // An ambiguous legacy slug never picks one of several jobs.
  return bySlug.size === 1 ? { id: bySlug.docs[0].id, source: "jobs", data: bySlug.docs[0].data() } : null;
}
