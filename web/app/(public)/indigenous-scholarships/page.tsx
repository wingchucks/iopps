import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Indigenous Scholarships & Bursaries in Canada | IOPPS.ca",
  description: "Find scholarships, bursaries, and funding opportunities for Indigenous students across Canada. Free to post, free to browse.",
  keywords: ["Indigenous scholarships", "First Nations bursaries", "Aboriginal scholarships Canada", "Métis scholarships", "Indigenous education funding"],
};

const teasers = [
  { title: "Indigenous Leadership Scholarship", org: "National Foundation", amount: "$5,000" },
  { title: "First Nations Health Sciences Bursary", org: "Health Authority", amount: "$3,000" },
  { title: "Métis Student Achievement Award", org: "Métis Nation", amount: "$2,500" },
  { title: "Indigenous Women in STEM Scholarship", org: "Tech Company", amount: "$10,000" },
];

export default function IndigenousScholarshipsPage() {
  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Indigenous Scholarships &amp; Bursaries</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Funding opportunities for Indigenous students across Canada. Updated regularly.
        </p>
      </section>
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Available Scholarships</h2>
        <p className="text-[var(--text-secondary)] mb-8">Sign up to see full eligibility details and apply.</p>
        <div className="space-y-4">
          {teasers.map((s, i) => (
            <div key={i} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{s.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{s.org}</p>
                </div>
                <span className="text-sm font-bold text-[var(--accent)]">{s.amount}</span>
              </div>
              <div className="mt-3 h-8 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
            Sign Up to See All Scholarships
          </Link>
          <p className="text-sm text-[var(--text-muted)] mt-3">Scholarships are always free to post and browse</p>
        </div>
      </section>
    </div>
  );
}
