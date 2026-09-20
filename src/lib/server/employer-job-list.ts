import type { Firestore } from "firebase-admin/firestore";

type JobRow = { id: string; data: Record<string, unknown> };
type Owner = { employerId: string; orgId: string };

// Match the ownership policy used by the authenticated job detail/update route.
function owned(data: JobRow["data"], owner: Owner) {
  return data.employerId === owner.employerId || data.orgId === owner.employerId || data.orgId === owner.orgId;
}

export function mergeOwnedJobRows(canonical: JobRow[], posts: JobRow[], owner: Owner): JobRow[] {
  // Any canonical record wins, including a tombstone or a record moved to
  // another organization. An older post mirror cannot restore access.
  const rows = new Map(canonical.map(row => [row.id, row]));
  for (const row of posts) if (!rows.has(row.id) && row.data.type === "job") rows.set(row.id, row);
  return [...rows.values()].filter(row => owned(row.data, owner) && row.data.status !== "deleted" && !row.data.deletedAt);
}

export async function loadEmployerJobRows(db: Firestore, owner: Owner): Promise<JobRow[]> {
  const scopes = [["employerId", owner.employerId], ["orgId", owner.employerId]];
  if (owner.orgId !== owner.employerId) scopes.push(["orgId", owner.orgId]);
  const snapshots = await Promise.all(["jobs", "posts"].map(async collection => {
    const matches = await Promise.all(scopes.map(([field, value]) => db.collection(collection).where(field, "==", value).get()));
    return [...new Map(matches.flatMap(snapshot => snapshot.docs.map(doc => [doc.id, { id: doc.id, data: doc.data() }] as const))).values()];
  }));
  const [canonical, posts] = snapshots;
  const knownIds = new Set(canonical.map(row => row.id));
  const missing = posts.filter(row => row.data.type === "job" && !knownIds.has(row.id));
  // Read authoritative IDs even when ownership queries did not return them.
  for (let index = 0; index < missing.length; index += 200) {
    const shadows = await db.getAll(...missing.slice(index, index + 200).map(row => db.collection("jobs").doc(row.id)));
    for (const doc of shadows) if (doc.exists) canonical.push({ id: doc.id, data: doc.data()! });
  }
  return mergeOwnedJobRows(canonical, posts, owner);
}
