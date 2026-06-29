import type { Metadata } from "next";
import { buildListingMetadata } from "@/lib/server/seo";

export const metadata: Metadata = buildListingMetadata({
  title: "Events — Pow Wows, Gatherings, Career Fairs & Community Events",
  description:
    "Find pow wows, conferences, career fairs, gatherings, and community events across Canada on IOPPS.ca, with dates, locations, and event details in one place.",
  path: "/events",
  type: "website",
});

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
