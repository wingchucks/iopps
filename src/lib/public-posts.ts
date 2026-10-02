import type { Post, PostType } from "@/lib/firestore/posts";

/**
 * Public posts of one type in feed order, read with a server-side type filter and
 * bound instead of the whole feed (see /api/posts). The same shape as getPosts.
 */
export async function getPublicPostsByType(type: PostType, limit: number): Promise<Post[]> {
  const response = await fetch(`/api/posts?type=${encodeURIComponent(type)}&limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load posts");
  const data = await response.json();
  return (data.posts as Array<Record<string, unknown>>).map(post => {
    const location = post.location;
    if (!location || typeof location !== "object" || Array.isArray(location)) return { ...post, id: String(post.id) } as Post;
    const place = location as Record<string, unknown>;
    const parts = [place.city, place.province].filter(Boolean).map(String);
    if (place.remote) parts.push("Remote");
    return { ...post, id: String(post.id), location: parts.join(", ") || undefined } as Post;
  });
}
