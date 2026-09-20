import type { DocumentSnapshot, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

/** Read only canonical records needed to suppress stale, otherwise public mirrors. */
export async function includeCanonicalJobMirrors(
  db: Firestore,
  jobs: DocumentSnapshot[],
  posts: QueryDocumentSnapshot[],
) {
  const known = new Set(jobs.map(doc => doc.id));
  const missing = posts.filter(doc => !known.has(doc.id));
  const canonical = [...jobs];
  for (let offset = 0; offset < missing.length; offset += 200) {
    const snapshots = await db.getAll(...missing.slice(offset, offset + 200).map(doc => db.collection("jobs").doc(doc.id)));
    canonical.push(...snapshots.filter(doc => doc.exists));
  }
  canonical.sort((left, right) => Buffer.compare(Buffer.from(left.id), Buffer.from(right.id)));
  return { jobs: canonical, posts };
}

/** Public listings need active candidates and their shadows, never all historical jobs. */
export async function loadPublicJobDocuments(db: Firestore) {
  const [jobs, posts] = await Promise.all([
    db.collection("jobs").where("active", "==", true).get(),
    db.collection("posts").where("type", "==", "job").where("status", "==", "active").get(),
  ]);
  return includeCanonicalJobMirrors(db, jobs.docs, posts.docs);
}
