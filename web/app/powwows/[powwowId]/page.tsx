import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import PowwowDetailClient from "./PowwowDetailClient";
import type { PowwowEvent } from "@/lib/types";
import { generatePowwowSchema } from "@/lib/seo";

interface PageProps {
  params: Promise<{ powwowId: string }>;
}

// Fetch pow wow data server-side
async function getPowwowData(powwowId: string): Promise<PowwowEvent | null> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return null;
    }
    const docRef = db.collection("powwows").doc(powwowId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as PowwowEvent;
  } catch (error) {
    console.error("Error fetching pow wow:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { powwowId } = await params;
  const powwow = await getPowwowData(powwowId);

  if (!powwow) {
    return {
      title: "Event Not Found | IOPPS",
      description: "This event could not be found.",
    };
  }

  const title = `${powwow.name} | IOPPS`;
  const description = powwow.description?.slice(0, 160) || `${powwow.name} - Pow Wow & Cultural Event`;
  const url = `https://iopps.ca/powwows/${powwowId}`;

  // Build date string for description
  let dateInfo = "";
  if (powwow.dateRange) {
    dateInfo = powwow.dateRange;
  } else if (powwow.startDate) {
    const startDate = typeof powwow.startDate === "object" && "_seconds" in powwow.startDate
      ? new Date((powwow.startDate as any)._seconds * 1000).toLocaleDateString()
      : String(powwow.startDate);
    dateInfo = startDate;
  }

  const fullDescription = dateInfo
    ? `${dateInfo} - ${powwow.location}\n\n${description}`
    : `${powwow.location}\n\n${description}`;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title: powwow.name,
      description: fullDescription,
      url,
      siteName: "IOPPS - Indigenous Opportunities",
      type: "website",
      images: powwow.imageUrl
        ? [
            {
              url: powwow.imageUrl,
              width: 1200,
              height: 630,
              alt: `${powwow.name} event poster`,
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
      title: powwow.name,
      description: fullDescription,
      images: powwow.imageUrl ? [powwow.imageUrl] : ["https://iopps.ca/og-image.png"],
    },
  };
}

export default async function PowwowDetailPage({ params }: PageProps) {
  const { powwowId } = await params;
  const powwow = await getPowwowData(powwowId);

  // Serialize Firestore Timestamps for client component
  const serializedPowwow = powwow
    ? {
        ...powwow,
        startDate: powwow.startDate
          ? typeof powwow.startDate === "object" && "_seconds" in powwow.startDate
            ? { _seconds: (powwow.startDate as any)._seconds }
            : powwow.startDate
          : undefined,
        endDate: powwow.endDate
          ? typeof powwow.endDate === "object" && "_seconds" in powwow.endDate
            ? { _seconds: (powwow.endDate as any)._seconds }
            : powwow.endDate
          : undefined,
        createdAt: powwow.createdAt
          ? typeof powwow.createdAt === "object" && "_seconds" in powwow.createdAt
            ? { _seconds: (powwow.createdAt as any)._seconds }
            : powwow.createdAt
          : undefined,
      }
    : null;

  // Generate JSON-LD schema for SEO
  const powwowSchema = powwow
    ? generatePowwowSchema({
        name: powwow.name,
        description: powwow.description,
        startDate: powwow.startDate,
        endDate: powwow.endDate,
        location: powwow.location,
        host: powwow.host,
        eventType: powwow.eventType,
        url: `https://iopps.ca/powwows/${powwowId}`,
        image: powwow.imageUrl,
      })
    : null;

  return (
    <>
      {powwowSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(powwowSchema) }}
        />
      )}
      <PowwowDetailClient
        powwow={serializedPowwow as PowwowEvent | null}
        error={!powwow ? "Event not found" : undefined}
      />
    </>
  );
}
