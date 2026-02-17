export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";

async function getProgram(id: string) {
  if (!adminDb) return null;
  const doc = await adminDb.collection("posts").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.type !== "program") return null;
  return { id: doc.id, ...data } as Record<string, unknown>;
}

export async function generateMetadata({ params }: { params: Promise<{ programId: string }> }): Promise<Metadata> {
  const { programId } = await params;
  const p = await getProgram(programId);
  if (!p) return { title: "Program Not Found | IOPPS.ca" };
  return {
    title: `${p.title} at ${p.institution || p.orgName} — Indigenous Education | IOPPS.ca`,
    description: `${p.title} — ${p.duration || ""} ${p.credentialType || ""}. ${p.deliveryMode || ""}. Apply on IOPPS.ca.`,
  };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const p = await getProgram(programId);
  if (!p) notFound();

  const loc = p.location as Record<string, string> | undefined;

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{p.title as string}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{(p.institution as string) || (p.orgName as string)}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📍 {loc?.city || ""}, {loc?.province || ""}</span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full">{(p.credentialType as string) || ""}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">{(p.duration as string) || ""}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">{(p.deliveryMode as string) || ""}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">About This Program</h2><p className="text-[var(--text-secondary)]">{(p.description as string) || ""}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Prerequisites</h2><p className="text-[var(--text-secondary)]">{(p.prerequisites as string) || ""}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Tuition</h2><p className="text-[var(--text-secondary)]">{(p.tuition as string) || "Contact institution"}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Intake Dates</h2><p className="text-[var(--text-secondary)]">{(p.intakeDates as string) || ""}</p></div>
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
