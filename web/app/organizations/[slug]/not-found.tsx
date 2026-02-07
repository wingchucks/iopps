import Link from 'next/link';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { FeedLayout } from '@/components/opportunity-graph';

export default function OrganizationNotFound() {
  return (
    <FeedLayout activeNav="organizations">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto h-20 w-20 rounded-full bg-surface flex items-center justify-center mb-6">
          <BuildingOffice2Icon className="h-10 w-10 text-[var(--text-muted)]" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Organization Not Found</h1>
        <p className="text-foreground0 text-center max-w-md mb-8">
          The organization you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>

        <div className="flex gap-4">
          <Link
            href="/organizations"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent transition-colors"
          >
            Browse Organizations
          </Link>
          <Link
            href="/"
            className="rounded-full bg-surface px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-surface transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </FeedLayout>
  );
}
