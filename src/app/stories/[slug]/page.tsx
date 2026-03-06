import { getStoryBySlugServer, getStoriesServer, getOrganizationServer } from "@/lib/firestore-server";
import StoryDetailClient from "./StoryDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getStoryBySlugServer(slug);
  if (!post) return { title: "Story Not Found | IOPPS" };
  const title = post.title as string;
  const type = post.type === "spotlight" ? "Spotlight" : "Story";
  const desc =
    (post.excerpt as string | undefined)?.slice(0, 160) ||
    (post.description as string | undefined)?.slice(0, 160) ||
    `${title} - Read this ${type.toLowerCase()} on IOPPS.`;
  return {
    title: `${title} | IOPPS ${type}`,
    description: desc,
  };
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getStoryBySlugServer(slug);
  if (!post) notFound();

  const orgId = post.orgId as string | undefined;
  const [org, { stories, spotlights }] = await Promise.all([
    orgId ? getOrganizationServer(orgId) : Promise.resolve(null),
    getStoriesServer(),
  ]);

  const allPosts = [...stories, ...spotlights];
  const related = allPosts
    .filter(
      (s) =>
        s.id !== `story-${slug}` &&
        s.id !== `spotlight-${slug}` &&
        s.id !== slug
    )
    .slice(0, 3);

  return (
    <StoryDetailClient
      post={post}
      org={org}
      related={related}
    />
  );
}
