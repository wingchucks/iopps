import { getJobsServer } from "@/lib/firestore-server";
import JobsClient from "./JobsClient";
import type { Job } from "@/lib/firestore/jobs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs - Indigenous Career Opportunities | IOPPS",
  description:
    "Find your next opportunity with Indigenous and allied organizations. Browse job listings across Canada.",
};

export const revalidate = 120;

export default async function JobsPage() {
  const jobs = (await getJobsServer()) as unknown as Job[];
  return <JobsClient initialJobs={jobs} />;
}
