import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: {
    employerId: string;
  };
};

// Force dynamic rendering to prevent build-time static generation
// when Firebase isn't initialized
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

// Don't generate any static params at build time
export async function generateStaticParams() {
  return [];
}

export default async function EmployerPublicProfilePage({ params }: PageProps) {
  const { employerId } = params;

  // Temporarily disabled during build - Firebase integration needed
  // TODO: Re-enable after fixing Firebase build-time initialization
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
        Employer Profile
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        This feature is currently being configured. Please check back soon.
      </p>
      <Link
        href="/jobs"
        className="mt-4 inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
      >
        Browse jobs
      </Link>
    </div>
  );
}
