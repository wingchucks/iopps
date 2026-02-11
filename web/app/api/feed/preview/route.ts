/**
 * Public Feed Preview API - Recent opportunities for landing page
 * No authentication required - shows a taste of what's on IOPPS
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

interface FeedItem {
  id: string;
  type: "job" | "event" | "program" | "scholarship";
  title: string;
  description: string;
  organization: string;
  organizationLogo?: string;
  location?: string;
  date?: string;
  createdAt: string;
}

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ items: [] });
    }

    const items: FeedItem[] = [];
    const now = new Date();

    // Fetch recent jobs (limit 3)
    const jobsSnap = await db
      .collection("jobs")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    jobsSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        type: "job",
        title: data.title || "Untitled Position",
        description: truncate(data.description || "", 120),
        organization: data.companyName || data.employerName || "Employer",
        organizationLogo: data.companyLogo,
        location: data.location,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || now.toISOString(),
      });
    });

    // Fetch upcoming events (limit 2)
    const eventsSnap = await db
      .collection("events")
      .where("active", "==", true)
      .orderBy("startDate", "asc")
      .limit(2)
      .get();

    eventsSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        type: "event",
        title: data.title || data.name || "Untitled Event",
        description: truncate(data.description || "", 120),
        organization: data.organizerName || data.organization || "Organizer",
        organizationLogo: data.organizerLogo,
        location: data.location,
        date: data.startDate?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || now.toISOString(),
      });
    });

    // Fetch programs (limit 2)
    const programsSnap = await db
      .collection("programs")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(2)
      .get();

    programsSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        type: "program",
        title: data.title || data.name || "Training Program",
        description: truncate(data.description || "", 120),
        organization: data.institutionName || data.provider || "Training Provider",
        organizationLogo: data.institutionLogo,
        location: data.location || data.deliveryMethod,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || now.toISOString(),
      });
    });

    // Sort by createdAt and take top 6
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ items: items.slice(0, 6) });
  } catch (error) {
    console.error("Error fetching feed preview:", error);
    return NextResponse.json({ items: [] });
  }
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trim() + "...";
}
