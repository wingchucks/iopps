import type { Metadata } from "next";
import Link from "next/link";

// TODO: Replace with actual Firestore fetch
async function getJob(jobId: string) {
  // Placeholder — will be replaced with server-side Firestore query
  return {
    id: jobId,
    title: "Community Health Director",
    orgName: "First Nation Health Authority",
    location: { city: "Winnipeg", province: "MB" },
    employmentType: "full-time" as const,
    workMode: "on-site" as const,
    salary: "$85,000 - $105,000",
    featured: false,
    description: "We are seeking an experienced Health Director to lead our community health programs...",
    requirements: "Minimum 5 years experience in health administration...",
    howToApply: "Submit your resume and cover letter to hr@example.com",
    deadline: null,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ jobId: string }> }): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId);
  return {
    title: `${job.title} at ${job.orgName} — Indigenous Jobs | IOPPS.ca`,
    description: `${job.title} — ${job.employmentType} position in ${job.location.city}, ${job.location.province}. Apply on IOPPS.ca.`,
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      {/* Public Info */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{job.title}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{job.orgName}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">
            📍 {job.location.city}, {job.location.province}
          </span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full capitalize">
            {job.employmentType?.replace("-", " ")}
          </span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full capitalize">
            {job.workMode?.replace("-", " ")}
          </span>
        </div>
      </div>

      {/* Gated Content */}
      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Salary</h2>
            <p className="text-[var(--text-secondary)]">{job.salary}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Description</h2>
            <p className="text-[var(--text-secondary)]">{job.description}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Requirements</h2>
            <p className="text-[var(--text-secondary)]">{job.requirements}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">How to Apply</h2>
            <p className="text-[var(--text-secondary)]">{job.howToApply}</p>
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Sign Up to See Full Details
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Create a free account to view salary, requirements, and apply.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Sign Up Free
              </Link>
              <Link
                href="/login"
                className="inline-block border border-[var(--input-border)] text-[var(--text-primary)] font-semibold px-6 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
