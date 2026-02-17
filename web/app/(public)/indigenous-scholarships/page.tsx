export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

export const metadata: Metadata = {
  title: "Indigenous Scholarships & Bursaries in Canada | IOPPS.ca",
  description: "Find scholarships, bursaries, and funding opportunities for Indigenous students across Canada. Free to post, free to browse.",
  keywords: ["Indigenous scholarships", "First Nations bursaries", "Aboriginal scholarships Canada", "Métis scholarships", "Indigenous education funding"],
};

async function getScholarships() {
  if (!adminDb) return [];
  const snap = await adminDb.collection("posts")
    .where("type", "==", "scholarship")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
}

export default async function IndigenousScholarshipsPage() {
  const scholarships = await getScholarships();

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
          {scholarships.length === 0 && (
            <p className="text-[var(--text-muted)] text-center py-8">No active scholarships right now. Check back soon!</p>
          )}
          {scholarships.map((s) => (
            <div key={s.id as string} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{s.title as string}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{s.orgName as string}</p>
                </div>
                <span className="text-sm font-bold text-[var(--accent)]">{s.awardAmount as string || ""}</span>
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
