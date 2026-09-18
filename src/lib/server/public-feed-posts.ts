import { isPublicPostVisible } from "@/lib/access-state";
import { mergeOpportunitySources, publicOpportunityRecord } from "./public-opportunities";
import type { JsonRecord } from "./public-ownership";
import type { OpportunityKind } from "@/lib/opportunity-posting";

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
