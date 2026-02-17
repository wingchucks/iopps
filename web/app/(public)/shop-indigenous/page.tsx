import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop Indigenous — Indigenous Business Directory | IOPPS.ca",
  description: "Support Indigenous-owned businesses across Canada. Browse our directory of verified Indigenous businesses, artisans, and service providers.",
  keywords: ["shop Indigenous", "Indigenous businesses", "Indigenous-owned", "First Nations businesses", "buy Indigenous Canada"],
};

const teasers = [
  { title: "Beadwork & Traditional Art Studio", category: "Arts & Crafts", location: "MB" },
  { title: "Indigenous Catering & Event Services", category: "Food & Beverage", location: "ON" },
  { title: "Northern Consulting Group", category: "Professional Services", location: "AB" },
  { title: "Traditional Medicine & Wellness", category: "Health & Wellness", location: "BC" },
  { title: "Indigenous Digital Media Agency", category: "Technology", location: "SK" },
];

export default function ShopIndigenousPage() {
  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Shop Indigenous</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Support Indigenous-owned businesses across Canada. Free to list, free to browse.
        </p>
      </section>
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Indigenous Businesses</h2>
        <p className="text-[var(--text-secondary)] mb-8">Sign up to see full business profiles, contact info, and more.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {teasers.map((b, i) => (
            <div key={i} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <h3 className="font-semibold text-[var(--text-primary)]">{b.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{b.category} · {b.location}</p>
              <div className="mt-3 h-6 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
            Sign Up to Browse All Businesses
          </Link>
          <p className="text-sm text-[var(--text-muted)] mt-3">Free for Indigenous-owned businesses to list</p>
        </div>
      </section>
    </div>
  );
}
