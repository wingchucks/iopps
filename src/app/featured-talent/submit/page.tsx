import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { featuredTalentCategories } from "@/lib/featured-talent";

export const metadata: Metadata = {
  title: "Nominate or submit Featured Talent | IOPPS.CA",
  description: "Submit an Indigenous job seeker, student, entrepreneur, artist, or community builder for an approved IOPPS Featured Talent profile.",
};

const reviewSteps = [
  "Send the person’s name, public email, photo, community/Nation, location, experience areas, and what opportunities they are open to.",
  "The IOPPS team reviews every profile before anything appears publicly.",
  "Only approved public details are published; email-only public contact keeps private contact details off the profile.",
  "After approval, IOPPS can prepare a profile page and optional Facebook, Instagram, and LinkedIn social kit for review.",
];

const mailBody = encodeURIComponent(
  "Tansi IOPPS team,\n\nI would like to nominate or submit someone for Featured Talent.\n\nName:\nCommunity/Nation:\nLocation:\nPublic email to show, if approved:\nWhat opportunities are they open to?:\nExperience/skills:\nPhoto available?:\nNotes:\n\nI confirm this should be reviewed before anything is published."
);

export default function FeaturedTalentSubmitPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image src="/logo.png" alt="IOPPS" width={42} height={42} />
          <span className="text-xl font-black tracking-[0.18em] text-text">IOPPS</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Link href="/featured-talent" className="text-sm font-bold text-teal no-underline">&larr; Featured Talent</Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <Badge text="Submit for review" color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">Nominate or submit Featured Talent</h1>
            <p className="mt-5 text-lg leading-8 text-text-sec">
              Featured Talent is for Indigenous job seekers, students, entrepreneurs, artists, and community builders who want a respectful public profile on IOPPS.ca.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {featuredTalentCategories.map((category) => (
                <span key={category} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold text-text-sec">
                  {category}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`mailto:nathan.arias@iopps.ca?subject=Featured%20Talent%20submission&body=${mailBody}`}
                className="no-underline"
              >
                <Button variant="primary-teal" size="lg">Start submission email</Button>
              </Link>
              <Link href="/featured-talent" className="no-underline">
                <Button variant="outline" size="lg">View current profiles</Button>
              </Link>
            </div>
          </div>

          <Card variant="spotlight">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">Review and privacy rules</h2>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-text-sec">
                {reviewSteps.map((step) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--teal)] text-xs font-black text-white">
                      {reviewSteps.indexOf(step) + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["For the person", "A polished profile that explains their strengths and what opportunities they are looking for."],
            ["For employers", "A simple way to discover people-first Indigenous talent without needing private details first."],
            ["For IOPPS", "A repeatable approval workflow that can turn one profile into a website feature and social campaign."],
          ].map(([title, body]) => (
            <Card key={title} variant="list">
              <div className="p-5">
                <h3 className="text-xl font-black text-text">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-text-sec">{body}</p>
              </div>
            </Card>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
