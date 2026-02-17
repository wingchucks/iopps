import type { Metadata } from "next";
import Link from "next/link";

async function getSchool(slug: string) {
  return {
    slug,
    name: "Northern Indigenous Institute",
    logoURL: null,
    description: "A leading institution for Indigenous education, offering programs in health, business, and technology.",
    location: { city: "Thunder Bay", province: "ON" },
    website: "https://example.com",
    programs: [
      { id: "1", title: "Indigenous Business Administration", duration: "2 years", credentialType: "Diploma" },
      { id: "2", title: "Pre-Health Sciences Pathway", duration: "1 year", credentialType: "Certificate" },
      { id: "3", title: "Environmental Technician", duration: "8 months", credentialType: "Certificate" },
    ],
    tier: "school" as const,
    jobCount: 5,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchool(slug);
  return {
    title: `${school.name} — Indigenous Education | IOPPS.ca`,
    description: `${school.name} in ${school.location.city}, ${school.location.province}. Explore programs and job opportunities.`,
  };
}

export default async function SchoolProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchool(slug);

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)] flex-shrink-0">
          {school.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{school.name}</h1>
            <span className="badge-education">Education Partner</span>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">📍 {school.location.city}, {school.location.province}</p>
        </div>
      </div>

      {/* Public: About */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">About</h2>
        <p className="text-[var(--text-secondary)]">{school.description}</p>
      </section>

      {/* Programs — public titles, details gated */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Programs ({school.programs.length})</h2>
        <div className="space-y-3">
          {school.programs.map((prog) => (
            <div key={prog.id} className="border border-[var(--card-border)] rounded-xl p-4 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{prog.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{prog.duration} · {prog.credentialType}</p>
                </div>
                <Link href="/signup" className="text-sm text-[var(--accent)] hover:underline font-medium">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Jobs CTA */}
      <section className="border border-[var(--card-border)] rounded-xl p-6 bg-[var(--surface-raised)] text-center">
        <p className="text-[var(--text-secondary)] mb-4">
          {school.name} has <strong>{school.jobCount}</strong> open positions.
        </p>
        <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
          Sign Up to View Jobs
        </Link>
      </section>
    </div>
  );
}
