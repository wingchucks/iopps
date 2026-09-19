import { isPublicPostVisible } from "@/lib/access-state";
import { mergeOpportunitySources, opportunityAliases, publicOpportunityRecord } from "./public-opportunities";
import { serialize, type JsonRecord } from "./public-ownership";
import type { OpportunityKind } from "@/lib/opportunity-posting";
import type { Firestore } from "firebase-admin/firestore";

/** Fetch only canonical opportunities that can match these feed mirrors. */
export async function loadFeedOpportunityCanonical(db: Firestore, posts: JsonRecord[]) {
  const canonical: Partial<Record<OpportunityKind, JsonRecord[]>> = {};
  await Promise.all((["events", "scholarships"] as const).map(async kind => {
    const prefix = kind === "events" ? "event" : "scholarship";
    const aliases = [...new Set(posts.filter(post => post.type === prefix && isPublicPostVisible(post))
      .flatMap(post => opportunityAliases(post, prefix)).flatMap(alias => [alias, `${prefix}-${alias}`]))];
    const records = new Map<string, JsonRecord>();
    const remember = (docs: FirebaseFirestore.DocumentSnapshot[]) => {
      for (const doc of docs) if (doc.exists) records.set(doc.id, serialize({ ...doc.data(), id: doc.id }) as JsonRecord);
    };
    const ids = aliases.filter(id => id && !id.includes("/") && ![".", ".."].includes(id) && Buffer.byteLength(id) <= 1500);
    for (let offset = 0; offset < ids.length; offset += 200) {
      remember(await db.getAll(...ids.slice(offset, offset + 200).map(id => db.collection(kind).doc(id))));
    }
    // Canonical IDs may differ from their old feed slugs. Keep both alias forms
    // and the directory's matching policy, including private/closed tombstones.
    for (let offset = 0; offset < aliases.length; offset += 10) {
      remember((await db.collection(kind).where("slug", "in", aliases.slice(offset, offset + 10)).get()).docs);
    }
    canonical[kind] = [...records.values()];
  }));
  return canonical;
}

/** A feed mirror must obey the same canonical visibility as its detail page. */
export function publicFeedPosts(
  posts: JsonRecord[],
  canonical: Partial<Record<OpportunityKind, JsonRecord[]>>,
): JsonRecord[] {
  return posts.flatMap(post => {
    if (!isPublicPostVisible(post)) return [];
    const kind = post.type === "event" ? "events" : post.type === "scholarship" ? "scholarships" : null;
    if (!kind) return [post];

    // Use the directory's ID/slug matching rather than a separate alias policy.
    const matches = (canonical[kind] || []).filter(record => mergeOpportunitySources([record], [post], kind).length === 1);
    const projections = (matches.length ? matches : [post]).map(record => publicOpportunityRecord(record, kind));
    if (projections.some(record => record === null)) return [];
    const visible = projections[0]!;
    // Keep the legacy post ID addressable, but use only current public content.
    return [{ ...visible, id: post.id, type: post.type, order: post.order }];
  });
}
