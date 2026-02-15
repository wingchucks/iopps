import Link from "next/link";
import { BriefcaseIcon } from "@heroicons/react/24/outline";

export default function ServiceNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-surface flex items-center justify-center mb-6">
        <BriefcaseIcon className="h-10 w-10 text-foreground0" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">Service Not Found</h1>
      <p className="text-[var(--text-muted)] mb-8">
        The service you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/business/services"
        className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 font-semibold text-white hover:bg-indigo-600 transition-colors"
      >
        Browse All Services
      </Link>
    </div>
  );
}
