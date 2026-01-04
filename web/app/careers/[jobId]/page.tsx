import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import JobDetailClient from "./JobDetailClient";
import type { JobPosting } from "@/lib/types";

interface PageProps {
  params: Promise<{ jobId: string }>;
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

// Helper to convert timestamp to Date for expiration check
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

// Check if a job has expired
function isJobExpired(job: any): boolean {
  const now = new Date();

  const closingDate = toDate(job.closingDate);
  if (closingDate && closingDate < now) return true;

  const expiresAt = toDate(job.expiresAt);
  if (expiresAt && expiresAt < now) return true;

  return false;
}

// Fetch job data server-side
async function getJobData(jobId: string): Promise<{ data: any | null; expired: boolean }> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return { data: null, expired: false };
    }
    const docRef = db.collection("jobs").doc(jobId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { data: null, expired: false };

    const data = docSnap.data();

    // Check if job is inactive or expired
    if (data?.active === false || isJobExpired(data)) {
      return { data: null, expired: true };
    }

    // Serialize the entire object to make it safe for client components
    return { data: serializeForClient({ id: docSnap.id, ...data }), expired: false };
  } catch (error) {
    console.error("Error fetching job:", error);
    return { data: null, expired: false };
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jobId } = await params;
  const { data: job, expired } = await getJobData(jobId);

  if (!job) {
    return {
      title: expired ? "Job Expired | IOPPS" : "Job Not Found | IOPPS",
      description: expired
        ? "This job posting has expired or is no longer accepting applications."
        : "This job posting could not be found.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://iopps.ca";
  const title = `${job.title} at ${job.employerName || "Company"} | IOPPS`;
  const description = job.description?.replace(/<[^>]*>/g, '').slice(0, 160) || `${job.title} - Job Opportunity`;
  const url = `${siteUrl}/jobs-training/${jobId}`;

  // Build location and job type info for subtitle
  const subtitleParts = [];
  if (job.location) subtitleParts.push(job.location);
  if (job.employmentType) subtitleParts.push(job.employmentType);
  if (job.remoteFlag) subtitleParts.push("Remote");
  const subtitle = subtitleParts.join(" • ") || "Job Opportunity";

  // Generate dynamic OG image URL
  const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(job.title)}&type=job&subtitle=${encodeURIComponent(subtitle)}${job.companyLogoUrl ? `&image=${encodeURIComponent(job.companyLogoUrl)}` : ''}`;

  const fullDescription = subtitle
    ? `${subtitle} — ${description}`
    : description;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title: `${job.title} at ${job.employerName || "Company"}`,
      description: fullDescription,
      url,
      siteName: "IOPPS - Indigenous Opportunities",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${job.title} at ${job.employerName || "Company"}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} at ${job.employerName || "Company"}`,
      description: fullDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
  const { data: job, expired } = await getJobData(jobId);

  return (
    <JobDetailClient
      job={job as JobPosting | null}
      error={!job ? (expired ? "This job posting has expired" : "Job not found") : undefined}
    />
  );
}
