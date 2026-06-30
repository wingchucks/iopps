import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { featuredTalentCategories, featuredTalentProfiles, getHomepageFeaturedTalent } from "@/lib/featured-talent";

export const metadata: Metadata = {
  title: "Featured Talent | IOPPS.CA",
  description: "Meet Indigenous talent featured by IOPPS.CA and connect with job seekers ready for the right opportunity.",
};

export default function FeaturedTalentPage() {
  const featured = getHomepageFeaturedTalent();

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image src="/logo.png" alt="IOPPS" width={42} height={42} />
          <span className="text-xl font-black tracking-[0.18em] text-text">IOPPS</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <Badge text="Featured Talent" color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">
              Meet Indigenous talent ready for opportunity.
            </h1>
            <p className="mt-4 text-base leading-7 text-text-sec sm:text-lg">
              IOPPS Featured Talent highlights Indigenous job seekers, community builders, students, artists, entrepreneurs, and skilled professionals so employers and organizations can discover people ready to contribute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href="/featured-talent/submit" className="no-underline">
              <Button variant="primary-teal" size="lg">Nominate or submit Featured Talent</Button>
            </Link>
            <Link href="/jobs" className="no-underline">
              <Button variant="outline" size="lg">Browse opportunities</Button>
            </Link>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap gap-2" aria-label="Featured Talent categories">
          {featuredTalentCategories.map((category) => (
            <span key={category} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold text-text-sec">
              {category}
            </span>
          ))}
        </section>

        <Card variant="spotlight" className="hover:-translate-y-0.5 hover:shadow-md">
          <article className="grid gap-0 overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-[color:var(--navy)] p-6 sm:p-8">
              <Image
                src={featured.imageUrl}
                alt={`${featured.name}, ${featured.featuredLabel} on IOPPS.ca`}
                width={720}
                height={720}
                priority
                className="aspect-square w-full rounded-[26px] object-cover shadow-2xl"
              />
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap gap-2">
                <Badge text={featured.openTo} color="var(--teal)" bg="var(--teal-soft)" />
                <Badge text={featured.category} color="var(--gold)" bg="var(--gold-soft)" />
              </div>
              <h2 className="mt-4 text-3xl font-black text-text sm:text-4xl">{featured.name}</h2>
              <p className="mt-2 text-lg font-bold text-text">{featured.headline}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-text-muted">
                {featured.nation} • {featured.location}
              </p>
              <p className="mt-5 text-base leading-8 text-text-sec">{featured.summary}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {featured.skills.slice(0, 6).map((skill) => (
                  <span key={skill} className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-text-sec">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/featured-talent/${featured.slug}`} className="no-underline">
                  <Button variant="primary-teal" size="lg">View Audrey&apos;s Profile</Button>
                </Link>
                <Link href={`mailto:${featured.publicEmail}`} className="no-underline">
                  <Button variant="outline" size="lg">Email Audrey</Button>
                </Link>
              </div>
            </div>
          </article>
        </Card>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal">Directory</p>
              <h2 className="mt-2 text-3xl font-black text-text">Approved profiles</h2>
            </div>
            <span className="text-sm font-bold text-text-muted">{featuredTalentProfiles.length} live</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredTalentProfiles.map((profile) => (
              <Link key={profile.slug} href={`/featured-talent/${profile.slug}`} className="no-underline">
                <Card variant="list" className="h-full hover:-translate-y-0.5 hover:shadow-md">
                  <article className="flex h-full gap-4 p-4">
                    <Image src={profile.imageUrl} alt={`${profile.name} profile photo`} width={96} height={96} className="h-24 w-24 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge text={profile.category} color="var(--teal)" bg="var(--teal-soft)" small />
                        <Badge text={profile.openTo} color="var(--gold)" bg="var(--gold-soft)" small />
                      </div>
                      <h3 className="mt-3 text-xl font-black text-text">{profile.name}</h3>
                      <p className="mt-1 text-sm font-bold text-text-sec">{profile.headline}</p>
                      <span className="mt-4 inline-block text-sm font-bold text-teal">View profile &rarr;</span>
                    </div>
                  </article>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
