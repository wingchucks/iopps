import Link from "next/link";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

export default function OrganizationNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        <BuildingOfficeIcon className="h-10 w-10 text-slate-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">Organization Not Found</h1>
      <p className="text-slate-400 mb-8">
        The organization you&apos;re looking for doesn&apos;t exist or may not be publicly available.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/careers"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors"
        >
          Browse Jobs
        </Link>
        <Link
          href="/business"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Visit Marketplace
        </Link>
      </div>
    </div>
  );
}
