import type { Firestore } from "firebase-admin/firestore";
import { includeCanonicalJobMirrors, loadPublicJobDocuments } from "./public-job-documents";

type Organization = Record<string, unknown>;

/** Indexed organization identities and legacy name aliases; never scan all jobs. */
export async function loadPublicOrganizationJobDocuments(db: Firestore, organization: Organization) {
  return loadPublicOrganizationsJobDocuments(db, [organization]);
}

/** Narrow small directories; large directories share one active-candidate read. */
export async function loadPublicOrganizationsJobDocuments(db: Firestore, organizations: Organization[]) {
  const values = organizations.flatMap(organization => [organization.id, organization.employerId, organization.name, organization.shortName, organization.orgName])
    .filter((value): value is string => typeof value === "string" && !!value.trim());
  const identities = [...new Set(values.flatMap(value => [value, value.trim(), value.trim().toLowerCase(), value.trim().toUpperCase()]))];
  if (!identities.length) return { jobs: [], posts: [] };
  // Avoid hundreds of mostly empty identity queries in the full directory.
  // This branch still excludes inactive history and retains canonical shadows.
  if (identities.length > 30) return loadPublicJobDocuments(db);

  const fields = ["employerId", "orgId", "employerName", "orgName", "companyName"];
  // Ten concurrent indexed queries, with at most 30 disjunctions each.
  const [jobs, allPosts] = await Promise.all(["jobs", "posts"].map(async collection => {
    const matches = await Promise.all(fields.map(field => {
      const query = db.collection(collection).where(field, "in", identities);
      return (collection === "jobs" ? query.where("active", "==", true) : query.where("type", "==", "job").where("status", "==", "active")).get();
    }));
    return [...new Map(matches.flatMap(snapshot => snapshot.docs.map(doc => [doc.id, doc] as const))).values()];
  }));
  const posts = allPosts.filter(doc => doc.data().type === "job" && doc.data().status === "active");
  return includeCanonicalJobMirrors(db, jobs, posts);
}
