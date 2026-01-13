import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import GrantDetailClient from "./GrantDetailClient";
import type { BusinessGrant } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper to serialize Firestore data for client components
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Firestore Timestamp
  if (obj && typeof obj === 'object' && typeof obj.toDate === 'function') {
    return { _seconds: obj.seconds || Math.floor(obj.toDate().getTime() / 1000) };
  }

  if (obj instanceof Date) {
    return { _seconds: Math.floor(obj.getTime() / 1000) };
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeForClient);
  }

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

// Fetch grant data server-side
async function getGrantData(grantId: string): Promise<{ data: any | null; closed: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, closed: false };
    }

    const docRef = db.collection("business_grants").doc(grantId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, closed: false };

    const data = docSnap.data();

    // Check if grant is closed
    if (data?.status === "closed") {
      return { data: serializeForClient({ id: docSnap.id, ...data }), closed: true };
    }

    return { data: serializeForClient({ id: docSnap.id, ...data }), closed: false };
  } catch (error) {
    console.error("Error fetching grant:", error);
    return { data: null, closed: false };
  }
}

// Format deadline for display
function formatDeadline(deadline: any): string {
  const date = toDate(deadline);
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: grant, closed } = await getGrantData(id);

  if (!grant) {
    return buildMetadata({
      title: "Grant Not Found",
      description: "This funding opportunity could not be found.",
      path: `/business/funding/${id}`,
      noIndex: true,
    });
  }

  const title = `${grant.title} — ${grant.grantType?.replace("_", " ") || "Grant"}`;
  const deadline = formatDeadline(grant.deadline);

  // Build subtitle for OG image
  const subtitleParts = [];
  if (grant.provider) subtitleParts.push(grant.provider);
  if (grant.amount?.display) subtitleParts.push(grant.amount.display);
  if (deadline) subtitleParts.push(`Deadline: ${deadline}`);
  if (closed) subtitleParts.push("Applications Closed");
  const subtitle = subtitleParts.join(" • ") || "Business Funding";

  // Build description
  const rawDescription = grant.shortDescription || grant.description?.replace(/<[^>]*>/g, '').slice(0, 200) || "";
  const description = subtitle
    ? `${subtitle} — ${rawDescription}`
    : rawDescription || `Apply for ${grant.title} on IOPPS.ca`;

  // Generate dynamic OG image URL
  const ogImageUrl = buildOgImageUrl({
    title: grant.title,
    subtitle,
    type: "grant",
  });

  return buildMetadata({
    title,
    description,
    path: `/business/funding/${id}`,
    image: ogImageUrl,
    noIndex: closed, // Don't index closed grants
  });
}

export default async function BusinessGrantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: grant } = await getGrantData(id);

  return (
    <GrantDetailClient
      grant={grant as BusinessGrant | null}
      error={!grant ? "Grant not found" : undefined}
    />
  );
}
