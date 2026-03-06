import { getEventsServer } from "@/lib/firestore-server";
import EventsClient from "./EventsClient";
import type { Event } from "@/lib/firestore/events";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events - Indigenous Community Gatherings | IOPPS",
  description:
    "Discover Indigenous community events, conferences, pow wows, career fairs, and gatherings across Canada.",
};

export const revalidate = 120;

export default async function EventsPage() {
  const events = (await getEventsServer()) as unknown as Event[];
  return <EventsClient initialEvents={events} />;
}
