import { getJobBySlugServer } from "@/lib/firestore-server";
import JobDetailClient from "./JobDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Job } from "@/lib/firestore/jobs";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlugServer(slug);
  if (!job) return { title: "Job Not Found | IOPPS" };
  const title = job.title as string;
  const employer = (job.employerName || job.orgName || "") as string;
  const location = (job.location || "") as string;
  const desc =
    (job.description as string | undefined)?.slice(0, 160) ||
    `${title} at ${employer}${location ? ` in ${location}` : ""} - Apply now on IOPPS.`;
  return {
    title: `${title} - ${employer} | IOPPS`,
    description: desc,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlugServer(slug);
  if (!job) notFound();
  return <JobDetailClient job={job as unknown as Job} />;
}
