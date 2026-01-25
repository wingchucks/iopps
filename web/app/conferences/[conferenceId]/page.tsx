import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import ConferenceDetailClient from "./ConferenceDetailClient";
import type { Conference } from "@/lib/types";

interface PageProps {
  params: Promise<{ conferenceId: string }>;
}

// Helper to serialize Firestore data for client components
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Firestore Timestamp (Admin SDK has .seconds and .toDate())
  if (obj && typeof obj === 'object' && typeof obj.toDate === 'function') {
    return { _seconds: obj.seconds || Math.floor(obj.toDate().getTime() / 1000) };
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return { _seconds: Math.floor(obj.getTime() / 1000) };
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeForClient);
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeForClient(obj[key]);
    }
    return result;
  }

  return obj;
}

// Helper to convert timestamp to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

// Check if conference has ended
function isConferenceExpired(conference: any): boolean {
  const now = new Date();
  const endDate = toDate(conference.endDate);
  if (endDate && endDate < now) return true;
  return false;
}

// Fetch conference data server-side
async function getConferenceData(conferenceId: string): Promise<{ data: any | null; expired: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, expired: false };
    }
    const docRef = db.collection("conferences").doc(conferenceId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, expired: false };

    const data = docSnap.data();

    // Check if conference is inactive or expired
    if (data?.active === false || isConferenceExpired(data)) {
      return { data: null, expired: true };
    }

    // Serialize the entire object to make it safe for client components
    return { data: serializeForClient({ id: docSnap.id, ...data }), expired: false };
  } catch (error) {
    console.error("Error fetching conference:", error);
    return { data: null, expired: false };
  }
}

// Format date for display
function formatDateRange(startDate: any, endDate: any): string {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start) return "";

  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);

  if (!end || start.getTime() === end.getTime()) {
    return startStr;
  }

  // If same month and year, only show day for end date
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${startStr} - ${end.toLocaleDateString("en-US", options)}`;
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { conferenceId } = await params;
  const { data: conference, expired } = await getConferenceData(conferenceId);

  if (!conference) {
    return buildMetadata({
      title: expired ? "Conference Ended" : "Conference Not Found",
      description: expired
        ? "This conference has ended or is no longer available."
        : "This conference could not be found.",
      path: `/conferences/${conferenceId}`,
      noIndex: true,
    });
  }

  const title = `${conference.title} — Conference`;
  const dateRange = formatDateRange(conference.startDate, conference.endDate);
  const locationInfo = conference.location || "";

  // Build subtitle for OG image
  const subtitleParts = [];
  if (dateRange) subtitleParts.push(dateRange);
  if (locationInfo) subtitleParts.push(locationInfo);
  const subtitle = subtitleParts.join(" • ") || "Indigenous Conference";

  // Build description
  const rawDescription = conference.description?.replace(/<[^>]*>/g, '').slice(0, 200) || "";
  const description = subtitle
    ? `${subtitle} — ${rawDescription}`
    : rawDescription || `Join ${conference.title} on IOPPS.ca`;

  // Generate dynamic OG image URL
  const ogImageUrl = buildOgImageUrl({
    title: conference.title,
    subtitle,
    type: "conference",
    image: conference.coverImageUrl || conference.imageUrl,
  });

  return buildMetadata({
    title,
    description,
    path: `/conferences/${conferenceId}`,
    image: ogImageUrl,
  });
}

export default async function ConferenceDetailPage({ params }: PageProps) {
  const { conferenceId } = await params;
  const { data: conference, expired } = await getConferenceData(conferenceId);

  return (
    <ConferenceDetailClient
      conference={conference as Conference | null}
      error={!conference ? (expired ? "This conference has ended" : undefined) : undefined}
    />
  );
}
