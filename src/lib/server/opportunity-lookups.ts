import type { Firestore } from "firebase-admin/firestore";
import type { OpportunityKind } from "@/lib/opportunity-posting";
import { matchesOrgName, serialize, type JsonRecord } from "./public-ownership";

type Collection = OpportunityKind | "posts" | "organizations";
const validId = (id: string) => !!id && !id.includes("/") && ![".", ".."].includes(id) && Buffer.byteLength(id) <= 1500;
const sorted = (records: JsonRecord[]) => records.sort((a, b) => Buffer.compare(Buffer.from(String(a.id)), Buffer.from(String(b.id))));
const records = (docs: FirebaseFirestore.DocumentSnapshot[]) => docs.filter(doc => doc.exists).map(doc => serialize({ ...doc.data(), id: doc.id }) as JsonRecord);

export function opportunityAliases(record: JsonRecord, prefix: string): string[] {
  return [record.id, record.slug].filter(Boolean).map(value => String(value).replace(new RegExp(`^${prefix}-`), ""));
}

async function readIds(db: Firestore, collection: Collection, values: string[]) {
  const ids = [...new Set(values)].filter(validId), found: JsonRecord[] = [];
  for (let offset = 0; offset < ids.length; offset += 200) {
    found.push(...records(await db.getAll(...ids.slice(offset, offset + 200).map(id => db.collection(collection).doc(id)))));
  }
  return found;
}

/** Resolve the same ID/slug aliases as directory merging, including tombstones. */
export async function loadOpportunityMatches(db: Firestore, collection: OpportunityKind | "posts", kind: OpportunityKind, mirrors: JsonRecord[]) {
  const prefix = kind === "events" ? "event" : "scholarship";
  const values = [...new Set(mirrors.flatMap(record => opportunityAliases(record, prefix)).flatMap(alias => [alias, `${prefix}-${alias}`]))];
  const found = new Map((await readIds(db, collection, values)).map(record => [String(record.id), record]));
  for (let offset = 0; offset < values.length; offset += 10) {
    for (const record of records((await db.collection(collection).where("slug", "in", values.slice(offset, offset + 10)).get()).docs)) found.set(String(record.id), record);
  }
  return sorted([...found.values()]);
}

// Cache lookup identities only. Every returned listing and organization is read
// afresh, so deletion, unpublishing and entitlement changes take effect immediately.
// Newly imported status-less records/name aliases can take up to a minute to appear.
type Index<T> = { expiresAt: number; value: Promise<T> };
const legacyIndexes = new WeakMap<Firestore, Map<OpportunityKind, Index<string[]>>>();
const organizationIndexes = new WeakMap<Firestore, Index<JsonRecord[]>>();

async function legacyIds(db: Firestore, kind: OpportunityKind) {
  let indexes = legacyIndexes.get(db);
  if (!indexes) { indexes = new Map(); legacyIndexes.set(db, indexes); }
  let index = indexes.get(kind);
  if (!index || index.expiresAt <= Date.now()) {
    const value = db.collection(kind).select("status").get().then(snapshot => snapshot.docs
      .filter(doc => {
        const status = doc.data().status;
        return !status || (!["active", "published"].includes(String(status)) && ["active", "published"].includes(String(status).toLowerCase()));
      }).map(doc => doc.id));
    index = { expiresAt: Date.now() + 60_000, value }; indexes.set(kind, index);
    value.catch(() => { if (indexes.get(kind)?.value === value) indexes.delete(kind); });
  }
  return index.value;
}

export async function loadPublicOpportunityCandidates(db: Firestore, kind: OpportunityKind) {
  const [published, legacy] = await Promise.all([
    db.collection(kind).where("status", "in", ["active", "published"]).get(),
    legacyIds(db, kind).then(ids => readIds(db, kind, ids)),
  ]);
  return sorted([...new Map([...records(published.docs), ...legacy].map(record => [String(record.id), record])).values()]);
}

export async function loadRelatedOpportunityOrganizations(db: Firestore, items: JsonRecord[]) {
  if (!items.length) return [];
  const ids = new Set(items.map(item => String(item.orgId || "")).filter(validId));
  const names = items.map(item => String(item.orgName || "")).filter(Boolean);
  if (names.length) {
    let index = organizationIndexes.get(db);
    if (!index || index.expiresAt <= Date.now()) {
      const value = db.collection("organizations").select("name").get().then(snapshot => records(snapshot.docs));
      index = { expiresAt: Date.now() + 60_000, value }; organizationIndexes.set(db, index);
      value.catch(() => { if (organizationIndexes.get(db)?.value === value) organizationIndexes.delete(db); });
    }
    for (const org of await index.value) if (names.some(name => matchesOrgName(name, String(org.name || "")))) ids.add(String(org.id));
  }
  return sorted(await readIds(db, "organizations", [...ids]));
}
