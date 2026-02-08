import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import GrantDetailClient from "./GrantDetailClient";
import type { BusinessGrant } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper to serialize Firestore data for client components
function serializeForClient(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  // Handle Firestore Timestamp
  if (obj && typeof obj === 'object' && 'toDate' in obj && typeof (obj as Record<string, unknown>).toDate === 'function') {
    const record = obj as Record<string, unknown>;
    return { _seconds: record.seconds || Math.floor((record.toDate as () => Date)().getTime() / 1000) };
  }

  if (obj instanceof Date) {
    return { _seconds: Math.floor(obj.getTime() / 1000) };
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeForClient);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeForClient((obj as Record<string, unknown>)[key]);
    }
    return result;
  }

  return obj;
}

// Helper to convert timestamp to Date
function toDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "object" && timestamp !== null) {
    const ts = timestamp as Record<string, unknown>;
    if (ts._seconds) return new Date((ts._seconds as number) * 1000);
    if (ts.seconds) return new Date((ts.seconds as number) * 1000);
    if (typeof ts.toDate === "function") return (ts.toDate as () => Date)();
  }
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

// Fetch grant data server-side
async function getGrantData(grantId: string): Promise<{ data: BusinessGrant | null; closed: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, closed: false };
    }

    const docRef = db.collection("business_grants").doc(grantId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, closed: false };

    const data = docSnap.data() as Record<string, unknown> | undefined;

    // Check if grant is closed
    if (data?.status === "closed") {
      return { data: serializeForClient({ id: docSnap.id, ...data }) as BusinessGrant, closed: true };
    }

    return { data: serializeForClient({ id: docSnap.id, ...data }) as BusinessGrant, closed: false };
  } catch (error) {
    console.error("Error fetching grant:", error);
    return { data: null, closed: false };
  }
}

// Format deadline for display
function formatDeadline(deadline: unknown): string {
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
