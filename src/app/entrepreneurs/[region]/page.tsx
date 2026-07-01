import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { entrepreneurCategories, entrepreneurRegions, getEntrepreneurRegion, getPartnersForRegion, type EntrepreneurRegionSlug } from "@/lib/entrepreneur-resources";

export function generateStaticParams() {
  return entrepreneurRegions.map((region) => ({ region: region.slug }));
}

type RegionParams = Promise<{ region: string }>;

export async function generateMetadata({ params }: { params: RegionParams }): Promise<Metadata> {
  const { region: slug } = await params;
  const region = getEntrepreneurRegion(slug);
  if (!region) return { title: "Entrepreneur Supports | IOPPS.CA" };
  return {
    title: `${region.name} Entrepreneur Supports | IOPPS.CA`,
    description: region.description,
  };
}

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

export default async function EntrepreneurRegionPage({ params }: { params: RegionParams }) {
  const { region: slug } = await params;
  const region = getEntrepreneurRegion(slug);
  if (!region) notFound();
  const partners = getPartnersForRegion(region.slug as EntrepreneurRegionSlug);

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Link href="/entrepreneurs" className="text-sm font-bold text-teal no-underline">&larr; Entrepreneur Supports</Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <Badge text={region.eyebrow} color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black leading-tight text-text sm:text-5xl">{region.name} entrepreneur supports</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-sec">{region.description}</p>
          </div>
          <Card variant="spotlight">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-text">First steps</h2>
              <ol className="mt-5 space-y-3 text-sm leading-7 text-text-sec">
                {region.firstSteps.map((step, index) => (
                  <li key={step}><strong className="text-text">{index + 1}.</strong> {step}</li>
                ))}
              </ol>
            </div>
          </Card>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-text">Verified resource partners</h2>
              <p className="mt-2 text-sm leading-6 text-text-sec">Only approved resources are shown publicly. Eligibility and program rules stay with the official organization.</p>
            </div>
            <Link href="/entrepreneurs/partners/apply" className="text-sm font-bold text-teal no-underline">Submit a resource &rarr;</Link>
          </div>

          {partners.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {partners.map((partner) => (
                <Card key={partner.slug} className="h-full">
                  <div className="p-6">
                    <Badge text={partner.partnerLabel} color="var(--teal)" bg="var(--teal-soft)" />
                    <h3 className="mt-4 text-2xl font-black text-text">{partner.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-text-sec">{partner.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {partner.categories.slice(0, 5).map((category) => (
                        <span key={category} className="rounded-full border border-border px-3 py-1 text-xs font-bold text-text-sec">{category}</span>
                      ))}
                    </div>
                    <Link href={`/entrepreneurs/partners/${partner.slug}`} className="mt-6 inline-block text-sm font-bold text-teal no-underline">
                      View resource profile &rarr;
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-6">
              <div className="p-6 sm:p-8">
                <h3 className="text-2xl font-black text-text">Verified partners coming soon</h3>
                <p className="mt-3 text-sm leading-7 text-text-sec">
                  IOPPS is building this region carefully so entrepreneurs are not sent to unverified or outdated contacts.
                </p>
              </div>
            </Card>
          )}
        </section>

        <section className="mt-12 rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <h2 className="text-3xl font-black text-text">Support categories for {region.name}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {entrepreneurCategories.map((category) => (
              <span key={category} className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-text-sec">{category}</span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-text-sec">
            IOPPS promotes awareness only. Financial advice, eligibility decisions, and applications are handled by the official program providers.
          </p>
        </section>

        <section className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/entrepreneurs" className="no-underline"><Button variant="outline">All Entrepreneur Supports</Button></Link>
          <Link href="/entrepreneurs/partners/apply" className="no-underline"><Button variant="primary-teal">Partner With IOPPS</Button></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
