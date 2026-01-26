import Link from 'next/link';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';

export default function OrganizationNotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
          <BuildingOffice2Icon className="h-10 w-10 text-slate-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Organization Not Found</h1>
        <p className="text-slate-400 text-center max-w-md mb-8">
          The organization you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>

        <div className="flex gap-4">
          <Link
            href="/organizations"
            className="rounded-full bg-teal-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
          >
            Browse Organizations
          </Link>
          <Link
            href="/"
            className="rounded-full bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
