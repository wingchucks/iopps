import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">Business Directory</h1>
      <p className="mt-4 text-text-secondary">
        Discover and support Indigenous-owned businesses across Canada.
      </p>

      {/* Empty state */}
      <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <div className="mb-4 inline-flex rounded-full bg-accent-bg p-4">
          <Building2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          No businesses listed yet
        </h2>
        <p className="mt-2 max-w-md text-text-secondary">
          Be the first to list your Indigenous-owned business! Reach customers
          across Canada and join a growing directory of Indigenous entrepreneurs.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          List Your Business
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
