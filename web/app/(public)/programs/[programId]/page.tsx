import type { Metadata } from "next";
import Link from "next/link";

async function getProgram(id: string) {
  return {
    id,
    title: "Indigenous Business Administration Diploma",
    institution: "Northern College",
    location: { city: "Timmins", province: "ON" },
    programCategory: "Business",
    duration: "2 years",
    credentialType: "Diploma",
    deliveryMode: "Hybrid",
    description: "A comprehensive business program with Indigenous perspectives...",
    prerequisites: "OSSD or equivalent, English 12...",
    tuition: "$4,500/year",
    intakeDates: "September, January",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ programId: string }> }): Promise<Metadata> {
  const { programId } = await params;
  const p = await getProgram(programId);
  return {
    title: `${p.title} at ${p.institution} — Indigenous Education | IOPPS.ca`,
    description: `${p.title} — ${p.duration} ${p.credentialType}. ${p.deliveryMode}. Apply on IOPPS.ca.`,
  };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const p = await getProgram(programId);

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{p.title}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{p.institution}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📍 {p.location.city}, {p.location.province}</span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full">{p.credentialType}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">{p.duration}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">{p.deliveryMode}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">About This Program</h2><p className="text-[var(--text-secondary)]">{p.description}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Prerequisites</h2><p className="text-[var(--text-secondary)]">{p.prerequisites}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Tuition</h2><p className="text-[var(--text-secondary)]">{p.tuition}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Intake Dates</h2><p className="text-[var(--text-secondary)]">{p.intakeDates}</p></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign Up to See Full Details</h3>
            <p className="text-[var(--text-secondary)] mb-6">Create a free account to view tuition, prerequisites, and apply.</p>
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
