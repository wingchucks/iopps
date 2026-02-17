export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";

async function getSchool(slug: string) {
  if (!adminDb) return null;
  // Schools are organizations with slug
  const snap = await adminDb.collection("organizations")
    .where("slug", "==", slug)
    .where("disabled", "==", false)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const org = { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown>;

  // Fetch programs for this school
  const programsSnap = await adminDb.collection("posts")
    .where("type", "==", "program")
    .where("orgId", "==", org.id)
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  const programs = programsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;

  // Count jobs
  const jobsSnap = await adminDb.collection("posts")
    .where("type", "==", "job")
    .where("orgId", "==", org.id)
    .where("status", "==", "active")
    .count()
    .get();

  return { ...org, programs, jobCount: jobsSnap.data().count } as Record<string, unknown> & { programs: Array<Record<string, unknown>>; jobCount: number; name: string; city: string; province: string; description: string };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchool(slug);
  if (!school) return { title: "School Not Found | IOPPS.ca" };
  return {
    title: `${school.name} — Indigenous Education | IOPPS.ca`,
    description: `${school.name} in ${school.city || ""}, ${school.province || ""}. Explore programs and job opportunities.`,
  };
}

export default async function SchoolProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchool(slug);
  if (!school) notFound();

  const programs = school.programs as Array<Record<string, unknown>>;

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)] flex-shrink-0">
          {(school.name as string).charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{school.name as string}</h1>
            <span className="badge-education">Education Partner</span>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">📍 {school.city as string || ""}, {school.province as string || ""}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">About</h2>
        <p className="text-[var(--text-secondary)]">{(school.description as string) || ""}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Programs ({programs.length})</h2>
        <div className="space-y-3">
          {programs.length === 0 && (
            <p className="text-[var(--text-muted)]">No programs listed yet.</p>
          )}
          {programs.map((prog) => (
            <div key={prog.id as string} className="border border-[var(--card-border)] rounded-xl p-4 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{prog.title as string}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{(prog.duration as string) || ""} · {(prog.credentialType as string) || ""}</p>
                </div>
                <Link href="/signup" className="text-sm text-[var(--accent)] hover:underline font-medium">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-[var(--card-border)] rounded-xl p-6 bg-[var(--surface-raised)] text-center">
        <p className="text-[var(--text-secondary)] mb-4">
          {school.name as string} has <strong>{school.jobCount as number}</strong> open positions.
        </p>
        <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
          Sign Up to View Jobs
        </Link>
      </section>
    </div>
  );
}
