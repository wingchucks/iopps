import { isPublicPostVisible } from "@/lib/access-state";
import { mergeOpportunitySources, publicOpportunityRecord } from "./public-opportunities";
import { loadOpportunityMatches } from "./opportunity-lookups";
import type { JsonRecord } from "./public-ownership";
import type { OpportunityKind } from "@/lib/opportunity-posting";
import type { Firestore } from "firebase-admin/firestore";

/** Fetch only canonical opportunities that can match these feed mirrors. */
export async function loadFeedOpportunityCanonical(db: Firestore, posts: JsonRecord[]) {
  const canonical: Partial<Record<OpportunityKind, JsonRecord[]>> = {};
  await Promise.all((["events", "scholarships"] as const).map(async kind => {
    const prefix = kind === "events" ? "event" : "scholarship";
    canonical[kind] = await loadOpportunityMatches(db, kind, kind, posts.filter(post => post.type === prefix && isPublicPostVisible(post)));
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
