import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { aiicAwarenessCampaignPackage, entrepreneurCategories, entrepreneurPartners, entrepreneurRegions } from "@/lib/entrepreneur-resources";

export const metadata: Metadata = {
  title: "Indigenous Entrepreneur Supports | IOPPS.CA",
  description:
    "Find Indigenous entrepreneur resources by province, including financing, training, mentorship, startup support, procurement pathways, and partner organizations.",
};

function Header() {
  return (
    <header className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <Image src="/logo.png" alt="IOPPS" width={42} height={42} />
        <span className="text-xl font-black tracking-[0.18em] text-text">IOPPS</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

export default function EntrepreneursPage() {
  const priorityRegions = entrepreneurRegions.filter((region) => ["alberta", "saskatchewan", "national"].includes(region.slug));
  const aiic = entrepreneurPartners.find((partner) => partner.slug === "aiic");

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Badge text="Entrepreneur Supports" color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-6xl">
              Find Indigenous business support by province.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-sec sm:text-lg">
              IOPPS is building a practical entrepreneur resource hub for funding, loans, training, mentorship, startup support,
              procurement, and partner organizations across Canada. Start with Alberta, Saskatchewan, or national supports.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/entrepreneurs/alberta" className="no-underline">
                <Button variant="primary-teal" size="lg">Find Alberta Supports</Button>
              </Link>
              <Link href="/entrepreneurs/partners/apply" className="no-underline">
                <Button variant="outline" size="lg">Become a Resource Partner</Button>
              </Link>
            </div>
          </div>

          <Card variant="spotlight">
            <div className="p-6 sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal">For founders</p>
              <h2 className="mt-3 text-2xl font-black text-text">What should I do first?</h2>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-text-sec">
                <li><strong className="text-text">1.</strong> Pick your province or region.</li>
                <li><strong className="text-text">2.</strong> Choose your need: funding, training, mentorship, startup basics, or procurement.</li>
                <li><strong className="text-text">3.</strong> Contact the official organization to confirm eligibility, deadlines, and next steps.</li>
              </ol>
            </div>
          </Card>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-text">Choose your province or region</h2>
              <p className="mt-2 text-sm leading-6 text-text-sec">More regions will be added as resources are verified and approved.</p>
            </div>
            <Link href="/entrepreneurs/national" className="text-sm font-bold text-teal no-underline">View national supports &rarr;</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {priorityRegions.map((region) => (
              <Link key={region.slug} href={`/entrepreneurs/${region.slug}`} className="no-underline">
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <div className="p-6">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-teal">{region.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-black text-text">{region.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-text-sec">{region.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <div className="p-6 sm:p-8">
              <h2 className="text-3xl font-black text-text">Support categories</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {entrepreneurCategories.map((category) => (
                  <span key={category} className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-text-sec">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {aiic && (
            <Card variant="spotlight">
              <div className="p-6 sm:p-8">
                <Badge text={aiic.partnerLabel} color="var(--teal)" bg="var(--teal-soft)" />
                <h2 className="mt-4 text-3xl font-black text-text">Featured Alberta resource: {aiic.shortName}</h2>
                <p className="mt-4 text-sm leading-7 text-text-sec">{aiic.summary}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/entrepreneurs/partners/aiic" className="no-underline">
                    <Button variant="primary-teal">View AIIC Resource</Button>
                  </Link>
                  <Link href="/entrepreneurs/alberta" className="no-underline">
                    <Button variant="outline">Alberta Supports</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </section>

        <section className="mt-12 rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">For partners like AIIC</p>
          <h2 className="mt-3 text-3xl font-black text-text">Want IOPPS to promote your entrepreneur supports?</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-sec">
            IOPPS can create custom awareness campaigns for approved organizations. These are separate from job posting and program posting plans.
            Example package: <strong>{aiicAwarenessCampaignPackage.name}</strong> — {aiicAwarenessCampaignPackage.priceLabel}, {aiicAwarenessCampaignPackage.termLabel}.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/entrepreneurs/partners/apply" className="no-underline">
              <Button variant="primary-teal">Request Partner Package</Button>
            </Link>
            <Link href="/pricing" className="no-underline">
              <Button variant="outline">Compare Posting Plans</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
