import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Indigenous Business Spotlight | IOPPS.CA",
  description:
    "Create a free Indigenous business profile on IOPPS.CA and help customers, partners, and communities discover what you offer.",
};

const steps = [
  {
    number: "1",
    title: "Join IOPPS",
    body: "Sign up and choose Organization, then Employer / Business.",
  },
  {
    number: "2",
    title: "Add your Indigenous business",
    body: "Select Indigenous business or employer and enter your business details.",
  },
  {
    number: "3",
    title: "Complete your free profile",
    body: "Add your logo, location, description, services, and website so people can support you.",
  },
];

const benefits = [
  "A public business profile in the IOPPS directory",
  "Discovery through the Indigenous business filter",
  "A place to explain your products, services, and story",
  "Consideration for a free Indigenous Business Spotlight",
];

export default function IndigenousBusinessSpotlightPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3 text-xl font-black text-text no-underline">
            <Image src="/logo.png" alt="IOPPS" width={42} height={42} priority className="h-10 w-10 object-contain" />
            <span>IOPPS</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/businesses?type=Indigenous" className="hidden text-sm font-bold text-teal no-underline sm:inline">
              Browse Indigenous Businesses
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="mx-auto mb-8 max-w-3xl text-center">
          <Badge text="Indigenous Business Spotlight" color="var(--teal)" bg="var(--teal-soft)" />
          <h1 className="mt-5 text-4xl font-black leading-tight text-text sm:text-5xl">
            Indigenous businesses deserve to be easier to find.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-text-sec sm:text-lg">
            IOPPS is supporting Indigenous entrepreneurs with free business profiles that help customers, partners, and communities discover what they offer.
          </p>
        </section>

        <Card variant="spotlight">
          <div className="grid overflow-hidden lg:grid-cols-[0.72fr_1.28fr]">
            <div className="flex min-h-[330px] items-center justify-center bg-[color:var(--navy)] p-8 text-center">
              <div>
                <p className="text-7xl text-gold" aria-hidden="true">◈</p>
                <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-white/60">Your business belongs here</p>
                <p className="mt-3 text-3xl font-black leading-tight text-white">
                  Built by Indigenous entrepreneurs. Supported by community.
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <Badge text="Free to join and list" color="var(--teal)" bg="var(--teal-soft)" />
              <h2 className="mt-4 text-3xl font-black leading-tight text-text sm:text-4xl">
                Add your Indigenous business to IOPPS.
              </h2>
              <p className="mt-5 text-base leading-8 text-text-sec">
                Create your organization account, identify it as an Indigenous business or employer, and complete your business profile. There is no charge to create the profile, appear in the directory, or be considered for this spotlight.
              </p>

              <div className="mt-7 grid gap-3">
                {steps.map((step) => (
                  <div key={step.number} className="flex gap-4 rounded-2xl border border-border bg-bg p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--teal-soft)] text-sm font-black text-teal">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-text">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-text-sec">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="no-underline">
                  <Button variant="primary-teal" size="lg">Add Your Business Free</Button>
                </Link>
                <Link href="/businesses?type=Indigenous" className="no-underline">
                  <Button variant="outline" size="lg">Browse Indigenous Businesses</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <Card key={benefit} variant="list">
              <div className="flex items-start gap-3 p-5">
                <span className="mt-0.5 text-xl font-black text-teal" aria-hidden="true">✓</span>
                <p className="text-sm font-semibold leading-7 text-text">{benefit}</p>
              </div>
            </Card>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
