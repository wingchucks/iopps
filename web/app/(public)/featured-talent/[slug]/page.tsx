import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { featuredTalentProfiles, getFeaturedTalentProfile } from "@/lib/featured-talent";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return featuredTalentProfiles.map((profile) => ({ slug: profile.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getFeaturedTalentProfile(slug);
  if (!profile) return {};

  return {
    title: `${profile.name} — Featured Indigenous Talent | IOPPS.ca`,
    description: `${profile.name} is ${profile.status.toLowerCase()} with experience in ${profile.skills.slice(0, 3).join(", ")}.`,
  };
}

export default async function FeaturedTalentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getFeaturedTalentProfile(slug);
  if (!profile) notFound();

  return (
    <div>
      <section className="bg-hero-gradient text-white px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <Link href="/featured-talent" className="text-sm text-white/75 hover:text-white">
            ← Featured Talent
          </Link>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-center">
            <Image
              src={profile.imageUrl}
              alt={`${profile.name} profile photo`}
              width={256}
              height={256}
              className="h-64 w-64 rounded-3xl object-cover border-4 border-white/20 bg-white/10 shadow-xl"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/65 font-semibold mb-3">
                {profile.featuredLabel}
              </p>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{profile.name}</h1>
              <p className="text-xl text-white/85 mb-3">{profile.headline}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-white/12 px-3 py-1 text-white/90">{profile.nation}</span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-white/90">{profile.location}</span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-white/90">{profile.status}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          <section className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">About {profile.name.split(" ")[0]}</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">{profile.bio}</p>
          </section>

          <section className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Looking for</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profile.lookingFor.map((item) => (
                <div key={item} className="rounded-xl bg-[var(--surface-raised)] p-4 text-sm font-medium text-[var(--text-primary)]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Skills and experience areas</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-[var(--accent-light)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Connect</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              IOPPS public talent profiles use email-only contact.
            </p>
            <a
              href={`mailto:${profile.email}?subject=Opportunity for ${encodeURIComponent(profile.name)}`}
              className="block w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Email {profile.name.split(" ")[0]}
            </a>
            <p className="mt-3 break-all text-sm text-[var(--text-muted)]">{profile.email}</p>

            <div className="mt-6 border-t border-[var(--card-border)] pt-5">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Strengths</h3>
              <ul className="space-y-2">
                {profile.strengths.map((strength) => (
                  <li key={strength} className="text-sm text-[var(--text-secondary)]">• {strength}</li>
                ))}
              </ul>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
