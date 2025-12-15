import type { Metadata } from "next";
import { db } from "@/lib/firebase-admin";
import JobDetailClient from "./JobDetailClient";
import type { JobPosting } from "@/lib/types";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

// Fetch job data server-side
async function getJobData(jobId: string): Promise<JobPosting | null> {
  try {
    if (!db) {
      console.error("Firebase Admin not initialized");
      return null;
    }
    const docRef = db.collection("jobs").doc(jobId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as JobPosting;
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJobData(jobId);

  if (!job) {
    return {
      title: "Job Not Found | IOPPS",
      description: "This job posting could not be found.",
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
  const job = await getJobData(jobId);

  // Serialize Firestore Timestamps for client component
  const serializedJob = job
    ? {
        ...job,
        createdAt: job.createdAt
          ? typeof job.createdAt === "object" && "_seconds" in job.createdAt
            ? { _seconds: (job.createdAt as any)._seconds }
            : job.createdAt
          : undefined,
        closingDate: job.closingDate
          ? typeof job.closingDate === "object" && "_seconds" in job.closingDate
            ? { _seconds: (job.closingDate as any)._seconds }
            : job.closingDate
          : undefined,
      }
    : null;

  return (
    <JobDetailClient
      job={serializedJob as JobPosting | null}
      error={!job ? "Job not found" : undefined}
    />
  );
}
