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

  const title = `${job.title} at ${job.employerName || "Company"} | IOPPS`;
  const description = job.description?.slice(0, 160) || `${job.title} - Job Opportunity`;
  const url = `https://iopps.ca/jobs/${jobId}`;

  // Build location and job type info
  let jobInfo = "";
  if (job.location) {
    jobInfo += job.location;
  }
  if (job.jobType) {
    jobInfo += jobInfo ? ` | ${job.jobType}` : job.jobType;
  }

  const fullDescription = jobInfo
    ? `${jobInfo}\n\n${description}`
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
      images: job.employerLogo
        ? [
            {
              url: job.employerLogo,
              width: 1200,
              height: 630,
              alt: `${job.employerName || "Company"} logo`,
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
      title: `${job.title} at ${job.employerName || "Company"}`,
      description: fullDescription,
      images: job.employerLogo ? [job.employerLogo] : ["https://iopps.ca/og-image.png"],
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
        updatedAt: job.updatedAt
          ? typeof job.updatedAt === "object" && "_seconds" in job.updatedAt
            ? { _seconds: (job.updatedAt as any)._seconds }
            : job.updatedAt
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
