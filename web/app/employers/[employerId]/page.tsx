import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/firebase-admin";
import type { EmployerProfile, JobPosting, IndustryType } from "@/lib/types";
import Image from "next/image";
import CompanyIntroVideo from "@/components/employer/CompanyIntroVideo";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";

type PageProps = {
  params: Promise<{
    employerId: string;
  }>;
  searchParams: Promise<{
    preview?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { employerId } = await params;

  if (!db) {
    return { title: 'Employer Profile' };
  }

  try {
    const employerDoc = await db.collection("employers").doc(employerId).get();

    if (!employerDoc.exists) {
      return { title: 'Employer Not Found' };
    }

    const employer = employerDoc.data() as EmployerProfile;

    if (employer.status !== "approved" || (employer as any).deletedAt) {
      return { title: 'Employer Profile' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iopps.ca';
    const industry = employer.industry ? INDUSTRY_LABELS[employer.industry] : '';
    const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(employer.organizationName)}&type=employer&subtitle=${encodeURIComponent(industry || employer.location || 'Indigenous Employer')}${employer.logoUrl ? `&image=${encodeURIComponent(employer.logoUrl)}` : ''}`;

    const description = employer.description?.substring(0, 160) || `View jobs and learn more about ${employer.organizationName}`;

    return {
      title: `${employer.organizationName} | Jobs & Company Info`,
      description,
      openGraph: {
        title: employer.organizationName,
        description,
        type: 'website',
        url: `${siteUrl}/employers/${employerId}`,
        images: [
          {
            url: employer.bannerUrl || employer.logoUrl || ogImageUrl,
            width: 1200,
            height: 630,
            alt: employer.organizationName,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: employer.organizationName,
        description,
        images: [employer.bannerUrl || employer.logoUrl || ogImageUrl],
      },
    };
  } catch (error) {
    return { title: 'Employer Profile' };
  }
}

// Force dynamic rendering
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

// Don't generate any static params at build time
export async function generateStaticParams() {
  return [];
}

// Industry labels for display
const INDUSTRY_LABELS: Record<IndustryType, string> = {
  'government': 'Government / First Nations Administration',
  'healthcare': 'Healthcare / Social Services',
  'education': 'Education / Training',
  'construction': 'Construction / Trades',
  'natural-resources': 'Natural Resources / Mining',
  'environmental': 'Environmental / Conservation',
  'technology': 'Technology / IT',
  'arts-culture': 'Arts / Culture / Tourism',
  'finance': 'Finance / Banking',
  'legal': 'Legal / Consulting',
  'nonprofit': 'Non-Profit / Community Services',
  'retail': 'Retail / Hospitality',
  'transportation': 'Transportation / Logistics',
  'other': 'Other',
};

// Company size labels
const SIZE_LABELS: Record<string, string> = {
  '1-10': '1-10 employees',
  '11-50': '11-50 employees',
  '51-200': '51-200 employees',
  '201-500': '201-500 employees',
  '500+': '500+ employees',
};

async function getEmployerData(employerId: string, isPreview: boolean = false): Promise<{
  employer: EmployerProfile | null;
  jobs: JobPosting[];
  status: "not_found" | "pending" | "rejected" | "approved" | "preview";
}> {
  if (!db) {
    return { employer: null, jobs: [], status: "not_found" };
  }

  try {
    // Get employer profile
    const employerDoc = await db.collection("employers").doc(employerId).get();

    if (!employerDoc.exists) {
      return { employer: null, jobs: [], status: "not_found" };
    }

    const employerData = employerDoc.data() as EmployerProfile;

    // Filter out soft-deleted employers (show as not found)
    if ((employerData as any).deletedAt) {
      return { employer: null, jobs: [], status: "not_found" };
    }

    // For non-approved employers
    if (employerData.status !== "approved") {
      // If preview mode is enabled, show the profile
      if (isPreview && employerData.status === "pending") {
        const employer = {
          ...employerData,
          id: employerDoc.id,
        };

        // Get jobs for preview (even if not active, show recent ones)
        const jobsSnapshot = await db
          .collection("jobs")
          .where("employerId", "==", employerId)
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();

        const jobs = jobsSnapshot.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id,
        })) as JobPosting[];

        return { employer, jobs, status: "preview" };
      }

      // Otherwise show pending/rejected message
      return {
        employer: null,
        jobs: [],
        status: (employerData.status as "pending" | "rejected") || "pending"
      };
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

    return { employer, jobs, status: "approved" };
  } catch (error) {
    console.error("Error fetching employer data:", error);
    return { employer: null, jobs: [], status: "not_found" };
  }
}

// Social media icon component
function SocialIcon({ platform, url }: { platform: string; url: string }) {
  const icons: Record<string, { icon: string; label: string; color: string }> = {
    linkedin: { icon: 'in', label: 'LinkedIn', color: 'hover:bg-[#0077B5]' },
    twitter: { icon: 'X', label: 'Twitter/X', color: 'hover:bg-black' },
    facebook: { icon: 'f', label: 'Facebook', color: 'hover:bg-[#1877F2]' },
    instagram: { icon: 'ig', label: 'Instagram', color: 'hover:bg-[#E4405F]' },
  };

  const { icon, label, color } = icons[platform] || { icon: '?', label: platform, color: 'hover:bg-slate-600' };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white transition-colors ${color}`}
    >
      {icon}
    </a>
  );
}

export default async function EmployerPublicProfilePage({ params, searchParams }: PageProps) {
  const { employerId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";
  const { employer, jobs, status } = await getEmployerData(employerId, isPreview);

  // Show 404 only if employer doesn't exist
  if (status === "not_found") {
    notFound();
  }

  // Show pending/rejected message (only if not in preview mode)
  if (status === "pending" || status === "rejected") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
            <svg className="h-10 w-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {status === "pending" ? "Profile Under Review" : "Profile Unavailable"}
          </h1>
          <p className="mt-4 text-slate-400">
            {status === "pending"
              ? "This employer's profile is currently being reviewed and will be available once approved."
              : "This employer's profile is not currently available."}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/jobs"
              className="rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14B8A6]/90"
            >
              Browse Jobs
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!employer) {
    notFound();
  }

  const isPreviewMode = status === "preview";

  const hasSocialLinks = employer.socialLinks && (
    employer.socialLinks.linkedin ||
    employer.socialLinks.twitter ||
    employer.socialLinks.facebook ||
    employer.socialLinks.instagram
  );

  const hasCompanyInfo = employer.industry || employer.companySize || employer.foundedYear;
  const hasContactInfo = employer.contactEmail || employer.contactPhone;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-300">Preview Mode</p>
              <p className="text-sm text-amber-200/80">
                This is a preview of your public profile. It will be visible to the public once approved.
              </p>
            </div>
            <Link
              href="/organization/dashboard?tab=profile"
              className="flex-shrink-0 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Banner Image */}
      {employer.bannerUrl && (
        <div className="relative w-full h-48 md:h-64 rounded-t-lg overflow-hidden mb-0">
          <Image
            src={employer.bannerUrl}
            alt={`${employer.organizationName} banner`}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Employer Header */}
      <div className={`rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-8 ${employer.bannerUrl ? 'rounded-t-none -mt-1' : ''}`}>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Logo and Basic Info */}
          <div className="flex items-start gap-4 flex-1">
            {employer.logoUrl && (
              <div className={`relative h-24 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-white ${employer.bannerUrl ? '-mt-16 ring-4 ring-slate-800' : ''}`}>
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

              {/* Industry Badge */}
              {employer.industry && (
                <span className="mt-2 inline-flex items-center rounded-full bg-[#14B8A6]/10 px-3 py-1 text-xs font-medium text-[#14B8A6]">
                  {INDUSTRY_LABELS[employer.industry] || employer.industry}
                </span>
              )}

              {employer.location && (
                <p className="mt-2 text-sm text-slate-400">
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

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex gap-2 flex-shrink-0">
              {employer.socialLinks?.linkedin && (
                <SocialIcon platform="linkedin" url={employer.socialLinks.linkedin} />
              )}
              {employer.socialLinks?.twitter && (
                <SocialIcon platform="twitter" url={employer.socialLinks.twitter} />
              )}
              {employer.socialLinks?.facebook && (
                <SocialIcon platform="facebook" url={employer.socialLinks.facebook} />
              )}
              {employer.socialLinks?.instagram && (
                <SocialIcon platform="instagram" url={employer.socialLinks.instagram} />
              )}
            </div>
          )}
        </div>

        {employer.description && (
          <div className="mt-6 prose prose-invert max-w-none">
            <p className="text-slate-300 whitespace-pre-wrap">{employer.description}</p>
          </div>
        )}

        {/* Company Info & Contact Section */}
        {(hasCompanyInfo || hasContactInfo) && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {employer.companySize && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">👥</span>
                  <span className="text-slate-300">{SIZE_LABELS[employer.companySize] || employer.companySize}</span>
                </div>
              )}
              {employer.foundedYear && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">📅</span>
                  <span className="text-slate-300">Founded {employer.foundedYear}</span>
                </div>
              )}
              {employer.contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">✉️</span>
                  <a
                    href={`mailto:${employer.contactEmail}`}
                    className="text-[#14B8A6] hover:text-[#14B8A6]/80 truncate"
                  >
                    {employer.contactEmail}
                  </a>
                </div>
              )}
              {employer.contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">📞</span>
                  <a
                    href={`tel:${employer.contactPhone}`}
                    className="text-[#14B8A6] hover:text-[#14B8A6]/80"
                  >
                    {employer.contactPhone}
                  </a>
                </div>
              )}
            </div>
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
