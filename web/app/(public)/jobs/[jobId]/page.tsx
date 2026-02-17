export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";

async function getJob(jobId: string) {
  if (!adminDb) return null;
  const doc = await adminDb.collection("posts").doc(jobId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.type !== "job") return null;
  return { id: doc.id, ...data } as Record<string, unknown>;
}

export async function generateMetadata({ params }: { params: Promise<{ jobId: string }> }): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) return { title: "Job Not Found | IOPPS.ca" };
  const loc = job.location as Record<string, string> | undefined;
  return {
    title: `${job.title} at ${job.orgName} — Indigenous Jobs | IOPPS.ca`,
    description: `${job.title} — ${job.employmentType || "full-time"} position in ${loc?.city || ""}, ${loc?.province || ""}. Apply on IOPPS.ca.`,
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const loc = job.location as Record<string, string> | undefined;

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{job.title as string}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{job.orgName as string}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">
            📍 {loc?.city || ""}, {loc?.province || ""}
          </span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full capitalize">
            {((job.employmentType as string) || "full-time").replace("-", " ")}
          </span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full capitalize">
            {((job.workMode as string) || "on-site").replace("-", " ")}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Salary</h2>
            <p className="text-[var(--text-secondary)]">{(job.salary as string) || "Contact for details"}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Description</h2>
            <p className="text-[var(--text-secondary)]">{(job.description as string) || ""}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Requirements</h2>
            <p className="text-[var(--text-secondary)]">{(job.requirements as string) || ""}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">How to Apply</h2>
            <p className="text-[var(--text-secondary)]">{(job.howToApply as string) || ""}</p>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign Up to See Full Details</h3>
            <p className="text-[var(--text-secondary)] mb-6">Create a free account to view salary, requirements, and apply.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Sign Up Free</Link>
              <Link href="/login" className="inline-block border border-[var(--input-border)] text-[var(--text-primary)] font-semibold px-6 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">Log In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
