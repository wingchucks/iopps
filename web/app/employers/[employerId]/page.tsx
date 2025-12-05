import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase-admin";
import type { EmployerProfile, JobPosting } from "@/lib/types";
import Image from "next/image";
import CompanyIntroVideo from "@/components/employer/CompanyIntroVideo";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";

type PageProps = {
  params: {
    employerId: string;
  };
};

// Force dynamic rendering
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

// Don't generate any static params at build time
export async function generateStaticParams() {
  return [];
}

async function getEmployerData(employerId: string): Promise<{
  employer: EmployerProfile | null;
  jobs: JobPosting[];
}> {
  if (!db) {
    return { employer: null, jobs: [] };
  }

  try {
    // Get employer profile
    const employerDoc = await db.collection("employers").doc(employerId).get();

    if (!employerDoc.exists) {
      return { employer: null, jobs: [] };
    }

    const employerData = employerDoc.data() as EmployerProfile;

    // Only show approved employers on public profile
    if (employerData.status !== "approved") {
      return { employer: null, jobs: [] };
    }

    const employer = {
      ...employerData,
      id: employerDoc.id,
    };

    // Get active jobs from this employer
    const jobsSnapshot = await db
      .collection("jobs")
      .where("employerId", "==", employerId)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const jobs = jobsSnapshot.docs.map((doc: any) => ({
      ...doc.data(),
      id: doc.id,
    })) as JobPosting[];

    return { employer, jobs };
  } catch (error) {
    console.error("Error fetching employer data:", error);
    return { employer: null, jobs: [] };
  }
}

export default async function EmployerPublicProfilePage({ params }: PageProps) {
  const { employerId } = params;
  const { employer, jobs } = await getEmployerData(employerId);

  if (!employer) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Employer Header */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-8">
        <div className="flex items-start gap-6">
          {employer.logoUrl && (
            <div className="relative h-24 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-white">
              <Image
                src={employer.logoUrl}
                alt={`${employer.organizationName} logo`}
                fill
                className="object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">
              {employer.organizationName}
            </h1>
            {employer.location && (
              <p className="mt-1 text-sm text-slate-400">
                📍 {employer.location}
              </p>
            )}
            {employer.website && (
              <a
                href={employer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-sm text-[#14B8A6] hover:text-[#14B8A6]/80"
              >
                🌐 Visit Website
              </a>
            )}
          </div>
        </div>

        {employer.description && (
          <div className="mt-6 prose prose-invert max-w-none">
            <p className="text-slate-300">{employer.description}</p>
          </div>
        )}
      </div>

      {/* Company Intro Video */}
      {employer.companyIntroVideo && (
        <div className="mb-8">
          <CompanyIntroVideo
            video={employer.companyIntroVideo}
            organizationName={employer.organizationName}
          />
        </div>
      )}

      {/* Interviews & Videos */}
      {employer.interviews && employer.interviews.length > 0 && (
        <div className="mb-8">
          <EmployerInterviewSection employer={employer} />
        </div>
      )}

      {/* Jobs Section */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 mb-4">
          Open Positions ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
            <p className="text-slate-400">
              No open positions at this time. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block rounded-lg border border-slate-700 bg-slate-800/50 p-6 hover:border-[#14B8A6]/50 hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-50">
                      {job.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>📍 {job.location}</span>
                      <span>💼 {job.employmentType}</span>
                      {job.remoteFlag && <span>🏠 Remote</span>}
                      {job.indigenousPreference && (
                        <span className="text-[#14B8A6]">
                          ✨ Indigenous Preference
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                        {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center rounded-md bg-[#14B8A6]/10 px-3 py-1 text-sm font-medium text-[#14B8A6]">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
