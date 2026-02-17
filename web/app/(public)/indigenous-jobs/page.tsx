export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

export const metadata: Metadata = {
  title: "Indigenous Jobs in Canada — Find Employment Opportunities | IOPPS.ca",
  description:
    "Browse Indigenous job opportunities across Canada. Full-time, part-time, contract, and remote positions from verified employers committed to Indigenous hiring.",
  keywords: [
    "Indigenous jobs",
    "Indigenous employment",
    "Aboriginal jobs Canada",
    "First Nations jobs",
    "Métis jobs",
    "Inuit jobs",
    "Indigenous careers",
  ],
};

async function getJobs() {
  if (!adminDb) return [];
  const snap = await adminDb.collection("posts")
    .where("type", "==", "job")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
}

export default async function IndigenousJobsPage() {
  const jobs = await getJobs();

  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Indigenous Jobs in Canada
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Discover job opportunities from employers actively hiring Indigenous
          talent. New positions posted daily.
        </p>
      </section>

      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Latest Job Opportunities
        </h2>
        <p className="text-[var(--text-secondary)] mb-8">
          Sign up to see full details and apply directly.
        </p>

        <div className="space-y-4">
          {jobs.length === 0 && (
            <p className="text-[var(--text-muted)] text-center py-8">No active jobs right now. Check back soon!</p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id as string}
              className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {job.title as string}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {job.orgName as string} · {(job.location as Record<string, string>)?.province || ""}
                  </p>
                </div>
                <span className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full font-medium capitalize">
                  {((job.employmentType as string) || "full-time").replace("-", " ")}
                </span>
              </div>
              <div className="mt-3 h-8 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sign Up to See All Jobs &amp; Apply
          </Link>
          <p className="text-sm text-[var(--text-muted)] mt-3">
            Free for community members
          </p>
        </div>
      </section>

      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Hiring Indigenous Talent?
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Post your job to reach 45,000+ Indigenous professionals across
            Canada.
          </p>
          <Link
            href="/for-employers"
            className="text-[var(--accent)] hover:underline font-semibold"
          >
            Learn about employer plans →
          </Link>
        </div>
      </section>
    </div>
  );
}
