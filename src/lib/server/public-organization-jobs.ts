import type { DocumentSnapshot, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

type Organization = Record<string, unknown>;

/** Indexed organization identities and legacy name aliases; never scan all jobs. */
export async function loadPublicOrganizationJobDocuments(db: Firestore, organization: Organization) {
  const values = [organization.id, organization.employerId, organization.name, organization.shortName, organization.orgName]
    .filter((value): value is string => typeof value === "string" && !!value.trim());
  const identities = [...new Set(values.flatMap(value => [value, value.trim(), value.trim().toLowerCase(), value.trim().toUpperCase()]))];
  if (!identities.length) return { jobs: [], posts: [] };

  const fields = ["employerId", "orgId", "employerName", "orgName", "companyName"];
  const snapshots = await Promise.all(["jobs", "posts"].map(async collection => {
    const matches = await Promise.all(fields.map(field => db.collection(collection).where(field, "in", identities).get()));
    return [...new Map(matches.flatMap(snapshot => snapshot.docs.map(doc => [doc.id, doc] as const))).values()];
  }));
  const jobs: DocumentSnapshot[] = snapshots[0];
  const posts: QueryDocumentSnapshot[] = snapshots[1].filter(doc => doc.data().type === "job" && doc.data().status === "active");
  const known = new Set(jobs.map(doc => doc.id));
  const missing = posts.filter(doc => !known.has(doc.id));
  // A closed/deleted/moved canonical job still suppresses an older owned post.
  for (let offset = 0; offset < missing.length; offset += 200) {
    const canonical = await db.getAll(...missing.slice(offset, offset + 200).map(doc => db.collection("jobs").doc(doc.id)));
    jobs.push(...canonical.filter(doc => doc.exists));
  }
  return { jobs, posts };
}
