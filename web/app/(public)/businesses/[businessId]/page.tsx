export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";

async function getBusiness(id: string) {
  if (!adminDb) return null;
  const doc = await adminDb.collection("posts").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.type !== "business") return null;
  return { id: doc.id, ...data } as Record<string, unknown>;
}

export async function generateMetadata({ params }: { params: Promise<{ businessId: string }> }): Promise<Metadata> {
  const { businessId } = await params;
  const b = await getBusiness(businessId);
  if (!b) return { title: "Business Not Found | IOPPS.ca" };
  const loc = b.location as Record<string, string> | undefined;
  return {
    title: `${b.title} — Shop Indigenous | IOPPS.ca`,
    description: `${b.title} in ${loc?.city || ""}, ${loc?.province || ""}. ${b.businessCategory || ""}. Support Indigenous businesses.`,
  };
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const b = await getBusiness(businessId);
  if (!b) notFound();

  const loc = b.location as Record<string, string> | undefined;

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{b.title as string}</h1>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📍 {loc?.city || ""}, {loc?.province || ""}</span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full">{(b.businessCategory as string) || ""}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">About</h2><p className="text-[var(--text-secondary)]">{(b.description as string) || ""}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Contact</h2><p className="text-[var(--text-secondary)]">{(b.phone as string) || ""} · {(b.email as string) || ""}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Hours</h2><p className="text-[var(--text-secondary)]">{(b.hours as string) || ""}</p></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign Up to See Full Details</h3>
            <p className="text-[var(--text-secondary)] mb-6">Create a free account to view contact info, hours, and more.</p>
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
