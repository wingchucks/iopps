import type { Metadata } from "next";
import Link from "next/link";

async function getScholarship(id: string) {
  return {
    id,
    title: "Indigenous Leadership Scholarship",
    orgName: "National Indigenous Foundation",
    location: { city: "Ottawa", province: "ON" },
    awardAmount: "$5,000",
    scholarshipCategory: "Leadership",
    eligibility: "Must be First Nations, Métis, or Inuit student enrolled full-time...",
    description: "This scholarship recognizes Indigenous students demonstrating leadership...",
    deadline: "March 31, 2025",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ scholarshipId: string }> }): Promise<Metadata> {
  const { scholarshipId } = await params;
  const s = await getScholarship(scholarshipId);
  return {
    title: `${s.title} — Indigenous Scholarships | IOPPS.ca`,
    description: `${s.title} — ${s.awardAmount} award. Apply on IOPPS.ca.`,
  };
}

export default async function ScholarshipDetailPage({ params }: { params: Promise<{ scholarshipId: string }> }) {
  const { scholarshipId } = await params;
  const s = await getScholarship(scholarshipId);

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{s.title}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{s.orgName}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📍 {s.location.city}, {s.location.province}</span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full font-bold">{s.awardAmount}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">{s.scholarshipCategory}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Description</h2><p className="text-[var(--text-secondary)]">{s.description}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Eligibility</h2><p className="text-[var(--text-secondary)]">{s.eligibility}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Deadline</h2><p className="text-[var(--text-secondary)]">{s.deadline}</p></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign Up to See Full Details</h3>
            <p className="text-[var(--text-secondary)] mb-6">Create a free account to view eligibility and apply.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Sign Up Free</Link>
              <Link href="/login" className="inline-block border border-[var(--input-border)] text-[var(--text-primary)] font-semibold px-6 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">Log In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
