import { getStoriesServer } from "@/lib/firestore-server";
import StoriesClient from "./StoriesClient";
import type { Post } from "@/lib/firestore/posts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories & Spotlights - Indigenous Success | IOPPS",
  description:
    "Read inspiring Indigenous success stories and partner spotlights from across Canada.",
};

export const revalidate = 120;

export default async function StoriesPage() {
  const { stories, spotlights } = await getStoriesServer();
  return (
    <StoriesClient
      initialStories={stories as unknown as Post[]}
      initialSpotlights={spotlights as unknown as Post[]}
    />
  );
}
