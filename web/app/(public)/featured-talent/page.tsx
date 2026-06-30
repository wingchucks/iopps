import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { featuredTalentProfiles } from "@/lib/featured-talent";

export const metadata: Metadata = {
  title: "Featured Indigenous Talent — IOPPS.ca",
  description:
    "Meet Indigenous job seekers and community talent open to opportunities across Canada. Public contact is email-only.",
};

export default function FeaturedTalentPage() {
  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm uppercase tracking-[0.25em] text-white/70 font-semibold mb-3">
            Featured Talent
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-5">
            Indigenous talent ready for the right opportunity
          </h1>
          <p className="text-lg text-white/80 max-w-3xl">
            IOPPS.ca highlights job seekers who choose to share their profile publicly.
            Profiles use email-only contact so people can be discovered without putting
            personal numbers on the website.
          </p>
        </div>
      </section>

      <section className="py-14 px-4 max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Open to opportunities</h2>
            <p className="text-[var(--text-secondary)] mt-2">
              Browse featured community members and connect by email.
            </p>
          </div>
          <Link href="/signup" className="hidden sm:inline-flex rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">
            Create a profile
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredTalentProfiles.map((profile) => (
            <Link
              key={profile.slug}
              href={`/featured-talent/${profile.slug}`}
              className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 card-interactive"
            >
              <div className="flex gap-5 items-start">
                <Image
                  src={profile.imageUrl}
                  alt={`${profile.name} profile photo`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl object-cover border border-[var(--card-border)] bg-[var(--surface-raised)]"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    {profile.featuredLabel}
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-3 group-hover:text-[var(--accent)] transition-colors">
                    {profile.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{profile.headline}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{profile.nation}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {profile.skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-5 border-t border-[var(--card-border)] pt-4 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">{profile.status}</span>
                <span className="text-[var(--accent)] font-semibold">View profile →</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-raised)] p-6">
          <h3 className="font-bold text-[var(--text-primary)] mb-2">Want to be featured?</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Community members can opt in from profile settings. IOPPS reviews public profiles before featuring them on the website or social media.
          </p>
        </div>
      </section>
    </div>
  );
}
