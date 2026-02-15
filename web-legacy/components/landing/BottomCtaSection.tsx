import Link from "next/link";

export default function BottomCtaSection() {
  return (
    <section className="bg-gradient-to-r from-teal-700 to-teal-600">
      <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Start building your presence on IOPPS
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-teal-100">
          Join thousands of Indigenous professionals and organizations already
          using IOPPS to connect, grow, and thrive.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-[var(--card-bg)] px-8 py-3.5 text-center text-sm font-bold text-accent shadow transition hover:bg-[var(--background)] sm:w-auto sm:text-base"
          >
            Create Free Account
          </Link>
          <Link
            href="/discover"
            className="w-full rounded-lg border border-white/30 bg-transparent px-8 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[var(--card-bg)]/10 sm:w-auto sm:text-base"
          >
            Browse Opportunities
          </Link>
        </div>
      </div>
    </section>
  );
}
