import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { featuredTalentProfiles, getFeaturedTalentProfile } from "@/lib/featured-talent";

export function generateStaticParams() {
  return featuredTalentProfiles.map((profile) => ({ slug: profile.slug }));
}

type FeaturedTalentParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: FeaturedTalentParams }): Promise<Metadata> {
  const { slug } = await params;
  const profile = getFeaturedTalentProfile(slug);
  if (!profile) return { title: "Featured Talent | IOPPS.CA" };
  return {
    title: `${profile.name} | Featured Talent | IOPPS.CA`,
    description: profile.summary,
  };
}

export default async function FeaturedTalentProfilePage({ params }: { params: FeaturedTalentParams }) {
  const { slug } = await params;
  const profile = getFeaturedTalentProfile(slug);
  if (!profile) notFound();

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
        <Link href="/featured-talent" className="text-sm font-bold text-teal no-underline">&larr; Featured Talent</Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Image
              src={profile.imageUrl}
              alt={`${profile.name}, ${profile.featuredLabel} on IOPPS.ca`}
              width={760}
              height={760}
              priority
              className="aspect-square w-full rounded-[30px] object-cover shadow-2xl"
            />
          </div>
          <div>
            <Badge text={profile.featuredLabel} color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">{profile.name}</h1>
            <p className="mt-3 text-xl font-bold text-text">{profile.headline}</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-text-muted">
              {profile.nation} • {profile.location}
            </p>
            <p className="mt-6 text-base leading-8 text-text-sec">{profile.summary}</p>

            <div className="mt-7 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-text-sec">
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`mailto:${profile.publicEmail}`} className="no-underline">
                <Button variant="primary-teal" size="lg">Email Audrey</Button>
              </Link>
              <Link href="/jobs" className="no-underline">
                <Button variant="outline" size="lg">Browse Opportunities</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-black text-text">Experience areas</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-text-sec">
                {profile.experience.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </Card>
          <Card variant="spotlight">
            <div className="p-6">
              <h2 className="text-2xl font-black text-text">Why Featured Talent?</h2>
              <p className="mt-4 text-sm leading-7 text-text-sec">
                IOPPS Featured Talent gives approved Indigenous job seekers a public, respectful profile that employers and community organizations can discover without exposing private contact details.
              </p>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
