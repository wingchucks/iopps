import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import PowwowDetailClient from "../../[powwowId]/PowwowDetailClient";
import type { PowwowEvent } from "@/lib/types";
import { generatePowwowSchema } from "@/lib/seo";

// Helper to convert Firestore Timestamp to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "object" && "_seconds" in timestamp) {
    return new Date(timestamp._seconds * 1000);
  }
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  return null;
}

// Check if an event has ended based on endDate
function isEventExpired(event: any): boolean {
  const now = new Date();
  const endDate = toDate(event.endDate);
  if (endDate && endDate < now) return true;
  return false;
}

interface PageProps {
  params: Promise<{ eventId: string }>;
}

// Fetch event data server-side
async function getEventData(eventId: string): Promise<{ data: PowwowEvent | null; expired: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, expired: false };
    }
    const docRef = db.collection("powwows").doc(eventId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, expired: false };

    const data = { id: docSnap.id, ...docSnap.data() } as PowwowEvent;

    // Check if event is inactive or has ended
    if (data.active === false || isEventExpired(data)) {
      return { data: null, expired: true };
    }

    return { data, expired: false };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { data: null, expired: false };
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const { data: event, expired } = await getEventData(eventId);

  if (!event) {
    return {
      title: expired ? "Event Has Ended | IOPPS" : "Event Not Found | IOPPS",
      description: expired
        ? "This event has ended."
        : "This event could not be found.",
    };
  }

  const title = `${event.name} | IOPPS`;
  const description = event.description?.slice(0, 160) || `${event.name} - Community Event`;
  const url = `https://iopps.ca/community/events/${eventId}`;

  // Build date string for description
  let dateInfo = "";
  if (event.dateRange) {
    dateInfo = event.dateRange;
  } else if (event.startDate) {
    const startDate = typeof event.startDate === "object" && "_seconds" in event.startDate
      ? new Date((event.startDate as any)._seconds * 1000).toLocaleDateString()
      : String(event.startDate);
    dateInfo = startDate;
  }

  const fullDescription = dateInfo
    ? `${dateInfo} - ${event.location}\n\n${description}`
    : `${event.location}\n\n${description}`;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title: event.name,
      description: fullDescription,
      url,
      siteName: "IOPPS - Indigenous Opportunities",
      type: "website",
      images: event.imageUrl
        ? [
            {
              url: event.imageUrl,
              width: 1200,
              height: 630,
              alt: `${event.name} event poster`,
            },
          ]
        : [
            {
              url: "https://iopps.ca/og-image.png",
              width: 1200,
              height: 630,
              alt: "IOPPS - Indigenous Opportunities",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description: fullDescription,
      images: event.imageUrl ? [event.imageUrl] : ["https://iopps.ca/og-image.png"],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const { data: event, expired } = await getEventData(eventId);

  // Serialize Firestore Timestamps for client component
  const serializedEvent = event
    ? {
        ...event,
        startDate: event.startDate
          ? typeof event.startDate === "object" && "_seconds" in event.startDate
            ? { _seconds: (event.startDate as any)._seconds }
            : event.startDate
          : undefined,
        endDate: event.endDate
          ? typeof event.endDate === "object" && "_seconds" in event.endDate
            ? { _seconds: (event.endDate as any)._seconds }
            : event.endDate
          : undefined,
        createdAt: event.createdAt
          ? typeof event.createdAt === "object" && "_seconds" in event.createdAt
            ? { _seconds: (event.createdAt as any)._seconds }
            : event.createdAt
          : undefined,
      }
    : null;

  // Generate JSON-LD schema for SEO
  const eventSchema = event
    ? generatePowwowSchema({
        name: event.name,
        description: event.description,
        startDate: toDate(event.startDate),
        endDate: toDate(event.endDate),
        location: event.location,
        host: event.host,
        eventType: event.eventType,
        url: `https://iopps.ca/community/events/${eventId}`,
        image: event.imageUrl,
      })
    : null;

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}
      <PowwowDetailClient
        powwow={serializedEvent as PowwowEvent | null}
        error={!event ? (expired ? "This event has ended" : "Event not found") : undefined}
      />
    </>
  );
}
