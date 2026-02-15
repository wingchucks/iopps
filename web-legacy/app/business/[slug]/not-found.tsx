import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">Business Not Found</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          This business listing doesn&apos;t exist or is no longer available.
        </p>
        <Link
          href="/business"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white hover:bg-accent transition-colors"
        >
          Browse All Businesses
        </Link>
      </div>
    </div>
  );
}
