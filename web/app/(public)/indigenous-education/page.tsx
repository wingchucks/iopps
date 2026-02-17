export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

export const metadata: Metadata = {
  title: "Indigenous Education & Training Programs in Canada | IOPPS.ca",
  description: "Explore education programs, training, and courses designed for Indigenous learners. Certificates, diplomas, degrees, and skills training from institutions across Canada.",
  keywords: ["Indigenous education", "Indigenous training programs", "First Nations education", "Aboriginal education Canada", "Indigenous skills training"],
};

async function getPrograms() {
  if (!adminDb) return [];
  const snap = await adminDb.collection("posts")
    .where("type", "==", "program")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
}

export default async function IndigenousEducationPage() {
  const programs = await getPrograms();

  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Indigenous Education &amp; Training</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Programs designed for Indigenous learners — from certificates to degrees. Find your path.
        </p>
      </section>
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Featured Programs</h2>
        <p className="text-[var(--text-secondary)] mb-8">Sign up to see full program details, prerequisites, and how to apply.</p>
        <div className="space-y-4">
          {programs.length === 0 && (
            <p className="text-[var(--text-muted)] text-center py-8">No active programs right now. Check back soon!</p>
          )}
          {programs.map((p) => (
            <div key={p.id as string} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{p.title as string}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{(p.institution as string) || (p.orgName as string)} · {p.duration as string || ""}</p>
                </div>
                <span className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full font-medium">{(p.deliveryMode as string) || "In-Person"}</span>
              </div>
              <div className="mt-3 h-8 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
            Sign Up to Explore All Programs
          </Link>
        </div>
      </section>
      <section className="bg-[var(--surface-raised)] py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Are You an Educational Institution?</h2>
          <p className="text-[var(--text-secondary)] mb-6">List your programs and reach Indigenous students across Canada.</p>
          <Link href="/pricing" className="text-[var(--accent)] hover:underline font-semibold">See School Tier pricing →</Link>
        </div>
      </section>
    </div>
  );
}
