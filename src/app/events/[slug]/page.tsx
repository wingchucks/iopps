import { getEventBySlugServer } from "@/lib/firestore-server";
import EventDetailClient from "./EventDetailClient";
import type { EventData } from "./EventDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlugServer(slug);
  if (!event) return { title: "Event Not Found | IOPPS" };
  const title = event.title as string;
  const desc =
    (event.description as string | undefined)?.slice(0, 160) ||
    `${title} - View details and RSVP on IOPPS.`;
  return {
    title: `${title} | IOPPS Events`,
    description: desc,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlugServer(slug);
  if (!event) notFound();
  return <EventDetailClient event={event as unknown as EventData} />;
}
