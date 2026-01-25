import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import { buildMetadata, buildOgImageUrl } from "@/lib/seo";
import ScholarshipDetailClient from "./ScholarshipDetailClient";
import type { Scholarship } from "@/lib/types";

interface PageProps {
  params: Promise<{ scholarshipId: string }>;
}

// Helper to serialize Firestore data for client components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeForClient(obj[key]);
    }
    return result;
  }
  return obj;
}

// Helper to convert timestamp to Date
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

// Check if scholarship deadline has passed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isScholarshipExpired(scholarship: any): boolean {
  const now = new Date();
  const deadline = toDate(scholarship.deadline);
  if (deadline && deadline < now) return true;
  return false;
}

// Fetch scholarship data server-side
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getScholarshipData(scholarshipId: string): Promise<{ data: any | null; expired: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, expired: false };
    }
    const docRef = db.collection("scholarships").doc(scholarshipId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, expired: false };

    const data = docSnap.data();

    // Check if scholarship is inactive or expired
    if (data?.active === false || isScholarshipExpired(data)) {
      return { data: null, expired: true };
    }

    // Serialize the entire object to make it safe for client components
    return { data: serializeForClient({ id: docSnap.id, ...data }), expired: false };
  } catch (error) {
    console.error("Error fetching scholarship:", error);
    return { data: null, expired: false };
  }
}

// Format deadline for display
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const { scholarshipId } = await params;
  const { data: scholarship, expired } = await getScholarshipData(scholarshipId);

  if (!scholarship) {
    return buildMetadata({
      title: expired ? "Scholarship Deadline Passed" : "Scholarship Not Found",
      description: expired
        ? "This scholarship deadline has passed or is no longer available."
        : "This scholarship could not be found.",
      path: `/education/scholarships/${scholarshipId}`,
      noIndex: true,
    });
  }

  const title = `${scholarship.title} — ${scholarship.type || "Scholarship"}`;
  const deadline = formatDeadline(scholarship.deadline);

  // Build subtitle for OG image
  const subtitleParts = [];
  if (scholarship.provider) subtitleParts.push(scholarship.provider);
  if (scholarship.amount) subtitleParts.push(scholarship.amount);
  if (deadline) subtitleParts.push(`Deadline: ${deadline}`);
  const subtitle = subtitleParts.join(" • ") || "Indigenous Scholarship";

  // Build description
  const rawDescription = scholarship.description?.replace(/<[^>]*>/g, '').slice(0, 200) || "";
  const description = subtitle
    ? `${subtitle} — ${rawDescription}`
    : rawDescription || `Apply for ${scholarship.title} on IOPPS.ca`;

  // Generate dynamic OG image URL
  const ogImageUrl = buildOgImageUrl({
    title: scholarship.title,
    subtitle,
    type: "scholarship",
  });

  return buildMetadata({
    title,
    description,
    path: `/education/scholarships/${scholarshipId}`,
    image: ogImageUrl,
  });
}

export default async function ScholarshipDetailPage({ params }: PageProps) {
  const { scholarshipId } = await params;
  const { data: scholarship, expired } = await getScholarshipData(scholarshipId);

  if (!scholarship) {
    return (
      <div className="min-h-screen pt-20 text-center text-white">
        <h1 className="text-2xl font-bold">
          {expired ? "This scholarship has expired" : "Scholarship not found"}
        </h1>
      </div>
    );
  }

  return (
    <ScholarshipDetailClient
      scholarship={scholarship as Scholarship}
    />
  );
}
